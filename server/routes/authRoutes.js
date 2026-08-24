/**
 * Auth Routes — Authentication API for Priora
 *
 * Implements signup, login, and token verification with JSON file persistence.
 * Uses Node.js crypto module for secure password hashing (scrypt) and tokens.
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (err) {
    console.warn('[Auth] Error reading users file:', err.message);
    return [];
  }
}

function saveUsers(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = USERS_FILE + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify({ users }, null, 2), 'utf-8');
  fs.renameSync(tmpPath, USERS_FILE);
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

  router.post('/signup', (req, res) => {
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
      const users = loadUsers();

      // Check duplicate username
      const existing = users.find(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Username "${cleanUsername}" is already taken. Please log in or choose another name.`,
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);
      const token = generateToken();
      const createdAt = new Date().toISOString();

      const newUser = {
        id: crypto.randomUUID(),
        username: cleanUsername,
        salt,
        hash,
        createdAt,
      };

      users.push(newUser);
      saveUsers(users);

      activeSessions.set(token, { username: cleanUsername, createdAt });

      res.status(201).json({
        success: true,
        data: {
          username: cleanUsername,
          token,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/auth/login ────────────────────────────────────────────────

  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Both username and password are required.',
        });
      }

      const cleanUsername = username.trim();
      const users = loadUsers();

      const user = users.find(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      );

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
      res.status(500).json({ success: false, error: err.message });
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
