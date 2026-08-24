import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import PersistentPriorityQueue from '../module.js';

const TEST_FILE_PATH = path.join(__dirname, 'test_queue.json');

function cleanupTestFile() {
  try {
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
    const tmpPath = TEST_FILE_PATH + '.tmp';
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  } catch (_) {
    // Ignore cleanup errors
  }
}

describe('PersistentPriorityQueue (module.js)', () => {
  beforeEach(() => {
    cleanupTestFile();
  });

  afterEach(() => {
    cleanupTestFile();
  });

  it('should initialize empty queue correctly', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    expect(queue.is_empty()).toBe(true);
    expect(queue.size()).toBe(0);
    expect(queue.peek()).toBeNull();
  });

  it('should insert one item correctly', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    const item = queue.insert('Task 1', 5);

    expect(queue.is_empty()).toBe(false);
    expect(queue.size()).toBe(1);
    expect(item).toHaveProperty('id');
    expect(item.value).toBe('Task 1');
    expect(item.priority).toBe(5);
    expect(item).toHaveProperty('createdAt');
    expect(queue.peek().id).toBe(item.id);
  });

  it('should insert multiple items and peek min priority item', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    queue.insert('Low Priority Task', 10);
    queue.insert('Critical Production Bug', 1);
    queue.insert('Medium Task', 5);

    expect(queue.size()).toBe(3);
    const minItem = queue.peek();
    expect(minItem.value).toBe('Critical Production Bug');
    expect(minItem.priority).toBe(1);
  });

  it('should perform extract_min in correct ascending priority order', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    queue.insert('Task C', 30);
    queue.insert('Task A', 10);
    queue.insert('Task B', 20);

    const min1 = queue.extract_min();
    expect(min1.value).toBe('Task A');
    expect(min1.priority).toBe(10);

    const min2 = queue.extract_min();
    expect(min2.value).toBe('Task B');
    expect(min2.priority).toBe(20);

    const min3 = queue.extract_min();
    expect(min3.value).toBe('Task C');
    expect(min3.priority).toBe(30);

    expect(queue.is_empty()).toBe(true);
  });

  it('should perform extract_max in correct descending priority order', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    queue.insert('Task C', 30);
    queue.insert('Task A', 10);
    queue.insert('Task B', 20);

    const max1 = queue.extract_max();
    expect(max1.value).toBe('Task C');
    expect(max1.priority).toBe(30);

    const max2 = queue.extract_max();
    expect(max2.value).toBe('Task B');
    expect(max2.priority).toBe(20);

    const max3 = queue.extract_max();
    expect(max3.value).toBe('Task A');
    expect(max3.priority).toBe(10);

    expect(queue.is_empty()).toBe(true);
  });

  it('should handle duplicate priorities cleanly', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    queue.insert('Job 1', 5);
    queue.insert('Job 2', 5);
    queue.insert('Job 3', 5);

    expect(queue.size()).toBe(3);

    const extracted = [
      queue.extract_min(),
      queue.extract_min(),
      queue.extract_min(),
    ];

    expect(extracted.map((e) => e.priority)).toEqual([5, 5, 5]);
    expect(queue.is_empty()).toBe(true);
  });

  it('should update priority of an existing item', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    const item1 = queue.insert('Task 1', 10);
    const item2 = queue.insert('Task 2', 20);

    // Initially Task 1 is min
    expect(queue.peek().id).toBe(item1.id);

    // Update Task 2 priority from 20 to 1 (becomes min)
    const updated = queue.update(item2.id, 1);
    expect(updated.priority).toBe(1);

    expect(queue.peek().id).toBe(item2.id);
    expect(queue.extract_min().value).toBe('Task 2');
    expect(queue.extract_min().value).toBe('Task 1');
  });

  it('should delete an item by ID', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    const item1 = queue.insert('Task 1', 10);
    const item2 = queue.insert('Task 2', 20);
    const item3 = queue.insert('Task 3', 30);

    const deleted = queue.delete(item2.id);
    expect(deleted.id).toBe(item2.id);
    expect(queue.size()).toBe(2);

    const remaining = [queue.extract_min(), queue.extract_min()];
    expect(remaining.map((r) => r.id)).toEqual([item1.id, item3.id]);
  });

  it('should persist queue state across re-initialization', () => {
    const queue1 = new PersistentPriorityQueue(TEST_FILE_PATH);
    queue1.insert('Persisted 1', 2);
    queue1.insert('Persisted 2', 1);

    // Create a new instance pointing at the same storage file
    const queue2 = new PersistentPriorityQueue(TEST_FILE_PATH);
    expect(queue2.size()).toBe(2);
    expect(queue2.peek().value).toBe('Persisted 2');
    expect(queue2.extract_min().value).toBe('Persisted 2');
    expect(queue2.extract_min().value).toBe('Persisted 1');
  });

  it('should throw error when extracting from empty queue', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    expect(() => queue.extract_min()).toThrow('Cannot extract from an empty queue.');
    expect(() => queue.extract_max()).toThrow('Cannot extract from an empty queue.');
  });

  it('should throw error on invalid insert arguments', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    expect(() => queue.insert('', 5)).toThrow();
    expect(() => queue.insert('Valid', 'not-a-number')).toThrow();
    expect(() => queue.insert('Valid', NaN)).toThrow();
  });

  it('should throw error when updating or deleting non-existent item ID', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);
    expect(() => queue.update('fake-id', 10)).toThrow('not found');
    expect(() => queue.delete('fake-id')).toThrow('not found');
  });

  it('should maintain heap invariants through complex sequences of operations', () => {
    const queue = new PersistentPriorityQueue(TEST_FILE_PATH);

    // Insert 10 random items
    const inserted = [];
    for (let i = 0; i < 10; i++) {
      const priority = Math.floor(Math.random() * 100);
      const item = queue.insert(`Random Item ${i}`, priority);
      inserted.push(item);
    }

    // Interleave updates and deletes
    queue.update(inserted[0].id, 150);
    queue.update(inserted[1].id, -10);
    queue.delete(inserted[2].id);

    // Verify heap array property: minHeap[i] <= minHeap[2i+1] and minHeap[2i+2]
    const minHeapData = queue.minHeap.data;
    for (let i = 0; i < minHeapData.length; i++) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < minHeapData.length) {
        expect(minHeapData[i].priority).toBeLessThanOrEqual(minHeapData[left].priority);
      }
      if (right < minHeapData.length) {
        expect(minHeapData[i].priority).toBeLessThanOrEqual(minHeapData[right].priority);
      }
    }

    // Verify maxHeap property: maxHeap[i] >= maxHeap[2i+1] and maxHeap[2i+2]
    const maxHeapData = queue.maxHeap.data;
    for (let i = 0; i < maxHeapData.length; i++) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < maxHeapData.length) {
        expect(maxHeapData[i].priority).toBeGreaterThanOrEqual(maxHeapData[left].priority);
      }
      if (right < maxHeapData.length) {
        expect(maxHeapData[i].priority).toBeGreaterThanOrEqual(maxHeapData[right].priority);
      }
    }
  });
});
