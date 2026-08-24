/**
 * Queue Routes — Per-User REST API for the Persistent Priority Queue.
 *
 * Each authenticated user gets their own independent PersistentPriorityQueue
 * instance, keyed by username. Queues are lazily initialised on first access
* and persisted in PostgreSQL.
 *
 * All endpoints require a valid Bearer token in the Authorization header.
 */

'use strict';

const express  = require('express');
const PersistentPriorityQueue = require('../../module');
const { activeSessions }      = require('./authRoutes');

// ── Per-user queue registry ──────────────────────────────────────────────────
// Map<username, PersistentPriorityQueue>
const userQueues = new Map();

/**
 * Return (or lazily create) the queue instance for the given username.
 */
function getQueueForUser(username) {
  if (userQueues.has(username)) {
    return userQueues.get(username);
  }

  const q = new PersistentPriorityQueue(username);
  userQueues.set(username, q);
  console.log(`[Priora] Loaded queue for user "${username}"`);
  return q;
}

// ── Auth middleware ──────────────────────────────────────────────────────────

/**
 * Resolves the Bearer token in the Authorization header to a username and
 * attaches req.queueUser + req.userQueue for downstream route handlers.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized — missing or malformed Authorization header.',
    });
  }

  const token   = authHeader.slice(7); // strip "Bearer "
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized — invalid or expired session token.',
    });
  }

  req.queueUser = session.username;
  req.userQueue = getQueueForUser(session.username);
  next();
}

// ── Router factory ──────────────────────────────────────────────────────────

function createQueueRoutes() {
  const router = express.Router();

  function sendDatabaseError(res, err, status = 500) {
    console.error('[Queue] Database error:', err);
    res.status(status).json({ success: false, error: 'Unable to complete queue operation.' });
  }

  // Apply auth middleware to every queue route
  router.use(requireAuth);

  // ── GET /api/queue — List all items ───────────────────────────────────────

  router.get('/', async (req, res) => {
    try {
      const queue = req.userQueue;
      const items = await queue.getAll();
      res.json({
        success: true,
        data: {
          items,
          heapArray: queue.getMinHeapArray(),
          size:      await queue.size(),
          isEmpty:   await queue.is_empty(),
        },
      });
    } catch (err) {
      sendDatabaseError(res, err);
    }
  });

  // ── POST /api/queue — Insert an item ──────────────────────────────────────

  router.post('/', async (req, res) => {
    try {
      const { value, priority } = req.body;

      if (value == null || value === '') {
        return res.status(400).json({ success: false, error: 'Item value is required.' });
      }

      if (priority == null || typeof priority !== 'number' || !Number.isFinite(priority)) {
        return res.status(400).json({ success: false, error: 'Priority must be a finite number.' });
      }

      const item = await req.userQueue.insert(value, priority);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      sendDatabaseError(res, err, 400);
    }
  });

  // ── GET /api/queue/peek — Peek at the minimum item ────────────────────────

  router.get('/peek', async (req, res) => {
    try {
      const item = await req.userQueue.peek();
      res.json({ success: true, data: item ?? null, message: item ? undefined : 'Queue is empty.' });
    } catch (err) {
      sendDatabaseError(res, err);
    }
  });

  // ── POST /api/queue/extract-min ───────────────────────────────────────────

  router.post('/extract-min', async (req, res) => {
    try {
      const item = await req.userQueue.extract_min();
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('empty') ? 400 : 500;
      sendDatabaseError(res, err, status);
    }
  });

  // ── POST /api/queue/extract-max ───────────────────────────────────────────

  router.post('/extract-max', async (req, res) => {
    try {
      const item = await req.userQueue.extract_max();
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('empty') ? 400 : 500;
      sendDatabaseError(res, err, status);
    }
  });

  // ── GET /api/queue/empty ──────────────────────────────────────────────────

  router.get('/empty', async (req, res) => {
    try {
      res.json({ success: true, data: { isEmpty: await req.userQueue.is_empty() } });
    } catch (err) {
      sendDatabaseError(res, err);
    }
  });

  // ── PUT /api/queue/:id — Update an item's priority ────────────────────────

  router.put('/:id', async (req, res) => {
    try {
      const { id }       = req.params;
      const { priority } = req.body;

      if (priority == null || typeof priority !== 'number' || !Number.isFinite(priority)) {
        return res.status(400).json({ success: false, error: 'Priority must be a finite number.' });
      }

      const item = await req.userQueue.update(id, priority);
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 400;
      if (status === 404) {
        res.status(status).json({ success: false, error: err.message });
      } else {
        sendDatabaseError(res, err, status);
      }
    }
  });

  // ── DELETE /api/queue/:id — Delete an item ────────────────────────────────

  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const item   = await req.userQueue.delete(id);
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 400;
      if (status === 404) {
        res.status(status).json({ success: false, error: err.message });
      } else {
        sendDatabaseError(res, err, status);
      }
    }
  });

  return router;
}

module.exports = createQueueRoutes;
