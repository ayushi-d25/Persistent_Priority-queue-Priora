/**
 * Express Server — Priora Backend
 *
 * Mounts the Auth API and the per-user Queue API.
 * Per-user queue instances are lazily created inside queueRoutes.js —
 * no shared global queue is needed here.
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const createQueueRoutes = require('./routes/queueRoutes');
const createAuthRoutes  = require('./routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 4001;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth',  createAuthRoutes());
app.use('/api/queue', createQueueRoutes());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error Handling ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('[Priora] Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Priora] Server running on http://localhost:${PORT}`);
});

module.exports = app;
