/**
 * PersistentPriorityQueue — PostgreSQL-backed priority queue.
 *
 * The database is the source of truth. Binary heaps are rebuilt from the
 * current user's rows when a queue snapshot is requested for visualization.
 */

'use strict';

const db = require('./server/db/db');

class BinaryHeap {
  constructor(type) {
    this.type = type;
    this.data = [];
  }

  _higherPriority(left, right) {
    return this.type === 'min'
      ? left.priority < right.priority
      : left.priority > right.priority;
  }

  insert(node) {
    this.data.push(node);
    let index = this.data.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this._higherPriority(this.data[index], this.data[parent])) break;
      [this.data[index], this.data[parent]] = [this.data[parent], this.data[index]];
      index = parent;
    }
  }

  peekRoot() {
    return this.data[0] || null;
  }
}

function mapItem(row) {
  return {
    id: row.id,
    value: row.value,
    priority: row.priority,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

class PersistentPriorityQueue {
  constructor(username) {
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required.');
    }

    this.username = username;
    this.minHeap = new BinaryHeap('min');
    this.maxHeap = new BinaryHeap('max');
    this.items = [];
    this.userId = null;
  }

  async _getUserId() {
    if (this.userId) return this.userId;

    const result = await db.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [this.username]
    );
    if (!result.rows[0]) throw new Error('User not found.');
    this.userId = result.rows[0].id;
    return this.userId;
  }

  _validateValue(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      throw new Error('Item value is required and must be a non-empty string.');
    }
  }

  _validatePriority(priority) {
    if (priority == null || typeof priority !== 'number' || !Number.isFinite(priority)) {
      throw new Error('Priority must be a finite number.');
    }
  }

  async _loadItems() {
    const userId = await this._getUserId();
    const result = await db.query(
      'SELECT id, value, priority, created_at FROM queue_items WHERE user_id = $1 ORDER BY priority ASC, created_at ASC',
      [userId]
    );
    this.items = result.rows.map(mapItem);
    this._rebuildHeaps();
    return this.items.map((item) => ({ ...item }));
  }

  _rebuildHeaps() {
    this.minHeap = new BinaryHeap('min');
    this.maxHeap = new BinaryHeap('max');
    for (const item of this.items) {
      this.minHeap.insert({ ...item });
      this.maxHeap.insert({ ...item });
    }
  }

  async insert(value, priority) {
    this._validateValue(value);
    this._validatePriority(priority);
    const userId = await this._getUserId();
    const result = await db.query(
      'INSERT INTO queue_items (user_id, value, priority) VALUES ($1, $2, $3) RETURNING id, value, priority, created_at',
      [userId, value, priority]
    );
    await this._loadItems();
    return mapItem(result.rows[0]);
  }

  async _removeRoot(order) {
    const userId = await this._getUserId();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const selected = await client.query(
        `SELECT id, value, priority, created_at FROM queue_items
         WHERE user_id = $1 ORDER BY priority ${order}, created_at ASC LIMIT 1 FOR UPDATE`,
        [userId]
      );
      if (!selected.rows[0]) throw new Error('Cannot extract from an empty queue.');
      const removed = await client.query(
        'DELETE FROM queue_items WHERE id = $1 AND user_id = $2 RETURNING id, value, priority, created_at',
        [selected.rows[0].id, userId]
      );
      await client.query('COMMIT');
      await this._loadItems();
      return mapItem(removed.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async extract_min() { return this._removeRoot('ASC'); }

  async extract_max() { return this._removeRoot('DESC'); }

  async peek() {
    const items = await this._loadItems();
    return items[0] || null;
  }

  async update(itemId, newPriority) {
    this._validatePriority(newPriority);
    const userId = await this._getUserId();
    const result = await db.query(
      'UPDATE queue_items SET priority = $1 WHERE id = $2 AND user_id = $3 RETURNING id, value, priority, created_at',
      [newPriority, itemId, userId]
    );
    if (!result.rows[0]) throw new Error(`Item with ID "${itemId}" not found.`);
    await this._loadItems();
    return mapItem(result.rows[0]);
  }

  async delete(itemId) {
    const userId = await this._getUserId();
    const result = await db.query(
      'DELETE FROM queue_items WHERE id = $1 AND user_id = $2 RETURNING id, value, priority, created_at',
      [itemId, userId]
    );
    if (!result.rows[0]) throw new Error(`Item with ID "${itemId}" not found.`);
    await this._loadItems();
    return mapItem(result.rows[0]);
  }

  async is_empty() {
    const userId = await this._getUserId();
    const result = await db.query(
      'SELECT EXISTS (SELECT 1 FROM queue_items WHERE user_id = $1) AS has_items',
      [userId]
    );
    return !result.rows[0].has_items;
  }

  async size() {
    const userId = await this._getUserId();
    const result = await db.query(
      'SELECT COUNT(*)::int AS count FROM queue_items WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].count;
  }

  async getAll() { return this._loadItems(); }

  async getById(itemId) {
    const userId = await this._getUserId();
    const result = await db.query(
      'SELECT id, value, priority, created_at FROM queue_items WHERE id = $1 AND user_id = $2 LIMIT 1',
      [itemId, userId]
    );
    return result.rows[0] ? mapItem(result.rows[0]) : null;
  }

  getMinHeapArray() {
    return this.minHeap.data.map((item) => ({ ...item }));
  }
}

module.exports = PersistentPriorityQueue;