/**
 * Queue Routes — Per-User REST API for the Persistent Priority Queue.
 *
 * Each authenticated user gets their own independent PersistentPriorityQueue
 * instance, keyed by username. Queues are lazily initialised on first access
 * and persisted to server/data/queues/<username>.json so state survives restarts.
 *
 * All endpoints require a valid Bearer token in the Authorization header.
 */

'use strict';

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const PersistentPriorityQueue = require('../../module');
const { activeSessions }      = require('./authRoutes');

const QUEUES_DIR = path.join(__dirname, '..', 'data', 'queues');

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

  // Ensure the directory exists
  if (!fs.existsSync(QUEUES_DIR)) {
    fs.mkdirSync(QUEUES_DIR, { recursive: true });
  }

  const filePath = path.join(QUEUES_DIR, `${username}.json`);
  const q = new PersistentPriorityQueue(filePath);
  userQueues.set(username, q);
  console.log(`[Priora] Loaded queue for user "${username}" (${q.size()} items)`);
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

  // Apply auth middleware to every queue route
  router.use(requireAuth);

  // ── GET /api/queue — List all items ───────────────────────────────────────

  router.get('/', (req, res) => {
    try {
      const queue = req.userQueue;
      res.json({
        success: true,
        data: {
          items:     queue.getAll(),
          heapArray: queue.getMinHeapArray(),
          size:      queue.size(),
          isEmpty:   queue.is_empty(),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/queue — Insert an item ──────────────────────────────────────

  router.post('/', (req, res) => {
    try {
      const { value, priority } = req.body;

      if (value == null || value === '') {
        return res.status(400).json({ success: false, error: 'Item value is required.' });
      }

      if (priority == null || typeof priority !== 'number' || !Number.isFinite(priority)) {
        return res.status(400).json({ success: false, error: 'Priority must be a finite number.' });
      }

      const item = req.userQueue.insert(value, priority);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ── GET /api/queue/peek — Peek at the minimum item ────────────────────────

  router.get('/peek', (req, res) => {
    try {
      const item = req.userQueue.peek();
      res.json({ success: true, data: item ?? null, message: item ? undefined : 'Queue is empty.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/queue/extract-min ───────────────────────────────────────────

  router.post('/extract-min', (req, res) => {
    try {
      const item = req.userQueue.extract_min();
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('empty') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/queue/extract-max ───────────────────────────────────────────

  router.post('/extract-max', (req, res) => {
    try {
      const item = req.userQueue.extract_max();
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('empty') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // ── GET /api/queue/empty ──────────────────────────────────────────────────

  router.get('/empty', (req, res) => {
    try {
      res.json({ success: true, data: { isEmpty: req.userQueue.is_empty() } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── PUT /api/queue/:id — Update an item's priority ────────────────────────

  router.put('/:id', (req, res) => {
    try {
      const { id }       = req.params;
      const { priority } = req.body;

      if (priority == null || typeof priority !== 'number' || !Number.isFinite(priority)) {
        return res.status(400).json({ success: false, error: 'Priority must be a finite number.' });
      }

      const item = req.userQueue.update(id, priority);
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // ── DELETE /api/queue/:id — Delete an item ────────────────────────────────

  router.delete('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const item   = req.userQueue.delete(id);
      res.json({ success: true, data: item });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = createQueueRoutes;
