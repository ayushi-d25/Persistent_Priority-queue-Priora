/**
 * PersistentPriorityQueue — module.js
 *
 * A binary-heap-based priority queue with file-based JSON persistence.
 * Supports both extract_min and extract_max in O(log n) using a
 * dual-heap architecture (min-heap + max-heap) with an index map.
 *
 * Design:
 * - minHeap[]: array-based binary min-heap (smallest priority at root)
 * - maxHeap[]: array-based binary max-heap (largest priority at root)
 * - indexMap:  Map<id, { minIdx, maxIdx, item }> for O(1) lookups
 *
 * Each heap node stores { id, priority }. The indexMap tracks each item's
 * position in both heaps so we can remove from either heap in O(log n)
 * by swapping with the last element and sifting.
 *
 * Persistence:
 * - State is saved to a JSON file after every mutating operation.
 * - Uses atomic writes (write to .tmp file, then rename) to prevent corruption.
 * - Gracefully handles missing, empty, or malformed storage files.
 *
 * @module PersistentPriorityQueue
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a unique ID for queue items. */
function generateId() {
  return crypto.randomUUID();
}

// ─── Binary Heap Implementation ────────────────────────────────────────────────

/**
 * A generic binary heap backed by an array.
 *
 * @param {'min'|'max'} type - Determines heap ordering.
 * @param {Map} indexMap - Shared index map for cross-heap position tracking.
 * @param {string} heapKey - Either 'minIdx' or 'maxIdx' — the key this heap
 *                           writes its positions to in the indexMap entries.
 */
class BinaryHeap {
  constructor(type, indexMap, heapKey) {
    /** @type {Array<{id: string, priority: number}>} */
    this.data = [];
    this.type = type; // 'min' or 'max'
    this.indexMap = indexMap;
    this.heapKey = heapKey; // 'minIdx' or 'maxIdx'
  }

  /** Number of elements in this heap. */
  get size() {
    return this.data.length;
  }

  // ── Comparison ──────────────────────────────────────────────────────────────

  /**
   * Returns true if node at index `i` should be above node at index `j`.
   * For a min-heap: smaller priority wins.
   * For a max-heap: larger priority wins.
   */
  _hasHigherPriority(i, j) {
    if (this.type === 'min') {
      return this.data[i].priority < this.data[j].priority;
    }
    return this.data[i].priority > this.data[j].priority;
  }

  // ── Index helpers ───────────────────────────────────────────────────────────

  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i)   { return 2 * i + 1; }
  _right(i)  { return 2 * i + 2; }

  // ── Swap two nodes and update index map ─────────────────────────────────────

  _swap(i, j) {
    const nodeI = this.data[i];
    const nodeJ = this.data[j];

    // Swap in array
    this.data[i] = nodeJ;
    this.data[j] = nodeI;

    // Update index map positions
    const entryI = this.indexMap.get(nodeI.id);
    const entryJ = this.indexMap.get(nodeJ.id);
    if (entryI) entryI[this.heapKey] = j;
    if (entryJ) entryJ[this.heapKey] = i;
  }

  // ── Sift Up (bubble up after insert) ────────────────────────────────────────

  _siftUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this._hasHigherPriority(i, p)) {
        this._swap(i, p);
        i = p;
      } else {
        break;
      }
    }
  }

  // ── Sift Down (trickle down after removal) ──────────────────────────────────

  _siftDown(i) {
    const n = this.data.length;
    while (true) {
      let target = i;
      const left = this._left(i);
      const right = this._right(i);

      if (left < n && this._hasHigherPriority(left, target)) {
        target = left;
      }
      if (right < n && this._hasHigherPriority(right, target)) {
        target = right;
      }
      if (target === i) break;

      this._swap(i, target);
      i = target;
    }
  }

  // ── Public Operations ───────────────────────────────────────────────────────

  /**
   * Insert a node into this heap.
   * The caller is responsible for updating the indexMap entry's heapKey
   * BEFORE calling this, because _siftUp will overwrite it.
   */
  insert(node) {
    const idx = this.data.length;
    this.data.push(node);

    // Set initial position in index map
    const entry = this.indexMap.get(node.id);
    if (entry) entry[this.heapKey] = idx;

    this._siftUp(idx);
  }

  /** Return the root node without removing it. */
  peekRoot() {
    return this.data.length > 0 ? this.data[0] : null;
  }

  /**
   * Remove the root node and return it.
   * Updates the indexMap by setting this heap's position to -1 for the removed node.
   */
  extractRoot() {
    if (this.data.length === 0) return null;

    const root = this.data[0];

    // Mark removed in index map
    const rootEntry = this.indexMap.get(root.id);
    if (rootEntry) rootEntry[this.heapKey] = -1;

    if (this.data.length === 1) {
      this.data.pop();
      return root;
    }

    // Move last element to root and sift down
    const last = this.data.pop();
    this.data[0] = last;
    const lastEntry = this.indexMap.get(last.id);
    if (lastEntry) lastEntry[this.heapKey] = 0;

    this._siftDown(0);
    return root;
  }

  /**
   * Remove a node at a known index.
   * Used for cross-heap deletion (e.g., removing from max-heap
   * after extracting from min-heap).
   */
  removeAt(idx) {
    if (idx < 0 || idx >= this.data.length) return;

    const removed = this.data[idx];
    const removedEntry = this.indexMap.get(removed.id);
    if (removedEntry) removedEntry[this.heapKey] = -1;

    if (idx === this.data.length - 1) {
      this.data.pop();
      return;
    }

    // Replace with last element
    const last = this.data.pop();
    this.data[idx] = last;
    const lastEntry = this.indexMap.get(last.id);
    if (lastEntry) lastEntry[this.heapKey] = idx;

    // The replacement might need to go up OR down
    this._siftUp(idx);
    this._siftDown(idx);
  }
}

// ─── PersistentPriorityQueue ───────────────────────────────────────────────────

/**
 * A persistent priority queue supporting both min and max extraction
 * in O(log n), backed by dual binary heaps and file-based JSON storage.
 *
 * @example
 * const PersistentPriorityQueue = require('./module');
 * const queue = new PersistentPriorityQueue('queue.json');
 *
 * queue.insert('Fix production bug', 1);
 * queue.insert('Deploy application', 2);
 *
 * console.log(queue.peek());       // { id, value: 'Fix production bug', priority: 1, ... }
 * console.log(queue.extract_min()); // removes and returns lowest priority item
 * console.log(queue.is_empty());    // true or false
 */
class PersistentPriorityQueue {
  /**
   * @param {string} storagePath - Path to the JSON persistence file.
   */
  constructor(storagePath) {
    if (!storagePath || typeof storagePath !== 'string') {
      throw new Error('Storage path is required and must be a string.');
    }

    this.storagePath = path.resolve(storagePath);

    /**
     * Index map: id → { minIdx, maxIdx, item }
     * - minIdx: position in the min-heap (-1 if not present)
     * - maxIdx: position in the max-heap (-1 if not present)
     * - item:   the full item object { id, value, priority, createdAt }
     * @type {Map<string, {minIdx: number, maxIdx: number, item: object}>}
     */
    this.indexMap = new Map();

    /** @type {BinaryHeap} Min-heap (smallest priority at root) */
    this.minHeap = new BinaryHeap('min', this.indexMap, 'minIdx');

    /** @type {BinaryHeap} Max-heap (largest priority at root) */
    this.maxHeap = new BinaryHeap('max', this.indexMap, 'maxIdx');

    // Load persisted state on construction
    this._load();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  /**
   * Load queue state from the storage file.
   * Handles: missing file, empty file, malformed JSON, duplicate IDs.
   */
  _load() {
    let items = [];

    try {
      if (!fs.existsSync(this.storagePath)) {
        // No file — start with empty queue (will be created on first save)
        return;
      }

      const raw = fs.readFileSync(this.storagePath, 'utf-8').trim();

      if (!raw) {
        // Empty file — start with empty queue
        return;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || !Array.isArray(parsed.items)) {
        console.warn(
          `[PersistentPriorityQueue] Storage file has unexpected structure. Starting empty.`
        );
        return;
      }

      items = parsed.items;
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.warn(
          `[PersistentPriorityQueue] Malformed JSON in storage file. Starting empty.`
        );
        // Back up the corrupted file so data isn't silently lost
        try {
          const backupPath = this.storagePath + '.corrupted.' + Date.now();
          fs.copyFileSync(this.storagePath, backupPath);
          console.warn(`[PersistentPriorityQueue] Corrupted file backed up to: ${backupPath}`);
        } catch (_) {
          // Best effort — don't crash if backup fails
        }
        return;
      }
      // For other errors (permissions, etc.), re-throw
      throw err;
    }

    // Rebuild heaps from loaded items
    const seenIds = new Set();
    for (const item of items) {
      // Skip duplicates
      if (seenIds.has(item.id)) {
        console.warn(`[PersistentPriorityQueue] Skipping duplicate ID: ${item.id}`);
        continue;
      }

      // Validate item structure
      if (!item.id || item.priority == null || item.value == null) {
        console.warn(`[PersistentPriorityQueue] Skipping invalid item:`, item);
        continue;
      }

      seenIds.add(item.id);

      // Create index map entry
      this.indexMap.set(item.id, {
        minIdx: -1,
        maxIdx: -1,
        item: {
          id: item.id,
          value: item.value,
          priority: Number(item.priority),
          createdAt: item.createdAt || new Date().toISOString(),
        },
      });

      const node = { id: item.id, priority: Number(item.priority) };
      this.minHeap.insert(node);
      this.maxHeap.insert({ ...node });
    }
  }

  /**
   * Persist the current queue state to disk.
   * Uses atomic write: write to .tmp file, then rename.
   */
  _save() {
    const items = this.getAll();
    const data = JSON.stringify({ items }, null, 2);

    // Ensure the directory exists
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Atomic write: write to temp file, then rename
    const tmpPath = this.storagePath + '.tmp';
    fs.writeFileSync(tmpPath, data, 'utf-8');
    fs.renameSync(tmpPath, this.storagePath);
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  /** Validate that a value is a non-empty string. */
  _validateValue(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      throw new Error('Item value is required and must be a non-empty string.');
    }
  }

  /** Validate that a priority is a finite number. */
  _validatePriority(priority) {
    if (priority == null || typeof priority !== 'number' || !Number.isFinite(priority)) {
      throw new Error('Priority must be a finite number.');
    }
  }

  /** Validate that an item ID exists in the queue. Returns the index map entry. */
  _validateItemExists(itemId) {
    if (!itemId) {
      throw new Error('Item ID is required.');
    }
    const entry = this.indexMap.get(itemId);
    if (!entry) {
      throw new Error(`Item with ID "${itemId}" not found.`);
    }
    return entry;
  }

  // ── Internal Removal ────────────────────────────────────────────────────────

  /**
   * Remove an item from both heaps and the index map.
   * Returns the full item object.
   */
  /**
   * Remove an item from both heaps and the index map.
   * Returns the full item object.
   */
  _removeItem(id) {
    const entry = this.indexMap.get(id);
    if (!entry) return null;

    const item = { ...entry.item };

    // Remove from min-heap
    if (entry.minIdx >= 0 && entry.minIdx < this.minHeap.data.length) {
      this.minHeap.removeAt(entry.minIdx);
    }

    // Remove from max-heap
    if (entry.maxIdx >= 0 && entry.maxIdx < this.maxHeap.data.length) {
      this.maxHeap.removeAt(entry.maxIdx);
    }

    // Remove from index map
    this.indexMap.delete(id);

    this._save();

    return item;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Insert an item into the priority queue.
   *
   * Time complexity: O(log n) — two heap insertions with sift-up.
   *
   * @param {string} value - The item value/description.
   * @param {number} priority - Numeric priority (lower = higher priority for min operations).
   * @returns {object} The inserted item { id, value, priority, createdAt }.
   */
  insert(value, priority) {
    this._validateValue(value);
    this._validatePriority(priority);

    const id = generateId();
    const createdAt = new Date().toISOString();
    const item = { id, value, priority, createdAt };

    // Create index map entry first (heaps will update positions)
    this.indexMap.set(id, { minIdx: -1, maxIdx: -1, item });

    const node = { id, priority };
    this.minHeap.insert(node);
    this.maxHeap.insert({ ...node });

    this._save();
    return { ...item };
  }

  /**
   * Remove and return the item with the smallest priority.
   *
   * Time complexity: O(log n) — extract from min-heap root + remove from max-heap by index.
   *
   * @returns {object|null} The extracted item, or null if queue is empty.
   * @throws {Error} If the queue is empty.
   */
  extract_min() {
    if (this.is_empty()) {
      throw new Error('Cannot extract from an empty queue.');
    }

    const minNode = this.minHeap.peekRoot();
    if (!minNode) return null;

    return this._removeItem(minNode.id);
  }

  /**
   * Remove and return the item with the largest priority.
   *
   * Time complexity: O(log n) — extract from max-heap root + remove from min-heap by index.
   *
   * @returns {object|null} The extracted item, or null if queue is empty.
   * @throws {Error} If the queue is empty.
   */
  extract_max() {
    if (this.is_empty()) {
      throw new Error('Cannot extract from an empty queue.');
    }

    const maxNode = this.maxHeap.peekRoot();
    if (!maxNode) return null;

    return this._removeItem(maxNode.id);
  }

  /**
   * Return the item with the smallest priority without removing it.
   *
   * Time complexity: O(1) — peek at min-heap root.
   *
   * @returns {object|null} The item with smallest priority, or null if empty.
   */
  peek() {
    const minNode = this.minHeap.peekRoot();
    if (!minNode) return null;

    const entry = this.indexMap.get(minNode.id);
    return entry ? { ...entry.item } : null;
  }

  /**
   * Update the priority of an existing item.
   *
   * Time complexity: O(log n) — remove from both heaps + re-insert.
   *
   * @param {string} itemId - The ID of the item to update.
   * @param {number} newPriority - The new priority value.
   * @returns {object} The updated item.
   * @throws {Error} If the item ID doesn't exist or priority is invalid.
   */
  update(itemId, newPriority) {
    this._validateItemExists(itemId);
    this._validatePriority(newPriority);

    const entry = this.indexMap.get(itemId);
    const oldItem = entry.item;

    // Remove from both heaps
    this._removeItem(itemId);

    // Re-insert with new priority
    const updatedItem = {
      id: oldItem.id,
      value: oldItem.value,
      priority: newPriority,
      createdAt: oldItem.createdAt,
    };

    this.indexMap.set(itemId, { minIdx: -1, maxIdx: -1, item: updatedItem });

    const node = { id: itemId, priority: newPriority };
    this.minHeap.insert(node);
    this.maxHeap.insert({ ...node });

    this._save();
    return { ...updatedItem };
  }

  /**
   * Remove an item from the queue by ID.
   *
   * Time complexity: O(log n) — remove from both heaps by index.
   *
   * @param {string} itemId - The ID of the item to delete.
   * @returns {object} The deleted item.
   * @throws {Error} If the item ID doesn't exist.
   */
  delete(itemId) {
    this._validateItemExists(itemId);

    const item = this._removeItem(itemId);
    this._save();

    return item;
  }

  /**
   * Check if the queue is empty.
   *
   * Time complexity: O(1).
   *
   * @returns {boolean} True if the queue has no items.
   */
  is_empty() {
    return this.indexMap.size === 0;
  }

  /**
   * Get the number of items in the queue.
   *
   * Time complexity: O(1).
   *
   * @returns {number}
   */
  size() {
    return this.indexMap.size;
  }

  /**
   * Get all items in the queue (sorted by priority ascending).
   *
   * Note: This is O(n log n) due to sorting, used for display/persistence only.
   *
   * @returns {Array<object>} Array of all items sorted by priority.
   */
  getAll() {
    const items = [];
    for (const [, entry] of this.indexMap) {
      items.push({ ...entry.item });
    }
    // Sort for consistent display and persistence
    items.sort((a, b) => a.priority - b.priority);
    return items;
  }

  /**
   * Get a single item by ID.
   *
   * Time complexity: O(1).
   *
   * @param {string} itemId
   * @returns {object|null}
   */
  getById(itemId) {
    const entry = this.indexMap.get(itemId);
    return entry ? { ...entry.item } : null;
  }

  /**
   * Get the internal min-heap array (for visualization).
   * Returns a copy to prevent external mutation.
   *
   * @returns {Array<object>} Heap nodes with full item data.
   */
  getMinHeapArray() {
    return this.minHeap.data.map(node => {
      const entry = this.indexMap.get(node.id);
      return entry ? { ...entry.item } : { id: node.id, priority: node.priority };
    });
  }
}

module.exports = PersistentPriorityQueue;
