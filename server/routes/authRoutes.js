/**
 * Auth Routes — Authentication API for Priora
 *
 * Implements signup, login, and token verification with PostgreSQL persistence.
 * Uses Node.js crypto module for secure password hashing (scrypt) and tokens.
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('../db/db');

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    salt: row.salt,
    hash: row.hash,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function findUser(username) {
  const result = await db.query(
    'SELECT id, username, salt, hash, created_at FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
    [username]
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Memory token session store
// Exported so queue routes can resolve token → username without duplicating logic.
const activeSessions = new Map(); // token -> { username, createdAt }

module.exports.activeSessions = activeSessions;

function createAuthRoutes() {
  const router = express.Router();

  // ── POST /api/auth/signup ───────────────────────────────────────────────

  router.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string' || username.trim().length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Username must be at least 3 characters long.',
        });
      }

      if (!password || typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 4 characters long.',
        });
      }

      const cleanUsername = username.trim();
      // Check duplicate username
      const existing = await findUser(cleanUsername);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Username "${cleanUsername}" is already taken. Please log in or choose another name.`,
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);
      const token = generateToken();
      const result = await db.query(
        'INSERT INTO users (username, salt, hash) VALUES ($1, $2, $3) RETURNING id, username, salt, hash, created_at',
        [cleanUsername, salt, hash]
      );
      const newUser = mapUser(result.rows[0]);

      activeSessions.set(token, { username: newUser.username, createdAt: newUser.createdAt });

      res.status(201).json({
        success: true,
        data: {
          username: newUser.username,
          token,
        },
      });
    } catch (err) {
      console.error('[Auth] Signup database error:', err);
      if (err.code === '23505') {
        return res.status(400).json({
          success: false,
          error: `Username "${req.body.username.trim()}" is already taken. Please log in or choose another name.`,
        });
      }
      res.status(500).json({ success: false, error: 'Unable to create account.' });
    }
  });

  // ── POST /api/auth/login ────────────────────────────────────────────────

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Both username and password are required.',
        });
      }

      const cleanUsername = username.trim();
      const user = await findUser(cleanUsername);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. User does not exist.',
        });
      }

      const verifyHash = hashPassword(password, user.salt);
      if (verifyHash !== user.hash) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. Incorrect password.',
        });
      }

      const token = generateToken();
      activeSessions.set(token, { username: user.username, createdAt: new Date().toISOString() });

      res.json({
        success: true,
        data: {
          username: user.username,
          token,
        },
      });
    } catch (err) {
      console.error('[Auth] Login database error:', err);
      res.status(500).json({ success: false, error: 'Unable to complete login.' });
    }
  });

  // ── GET /api/auth/me ────────────────────────────────────────────────────

  router.get('/me', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized.' });
      }

      const token = authHeader.split(' ')[1];
      const session = activeSessions.get(token);

      if (!session) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
      }

      res.json({
        success: true,
        data: { username: session.username },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = createAuthRoutes;
module.exports.activeSessions = activeSessions;
