import { describe, it, expect } from 'vitest';
import PersistentPriorityQueue from '../module.js';

describe('PersistentPriorityQueue', () => {
  it('requires a username for database scoping', () => {
    expect(() => new PersistentPriorityQueue()).toThrow('Username is required.');
    expect(() => new PersistentPriorityQueue('alice')).not.toThrow();
  });

  it('validates queue input before accessing PostgreSQL', async () => {
    const queue = new PersistentPriorityQueue('alice');
    await expect(queue.insert('', 1)).rejects.toThrow('Item value is required');
    await expect(queue.insert('Task', NaN)).rejects.toThrow('Priority must be a finite number');
    await expect(queue.update('item-id', Infinity)).rejects.toThrow('Priority must be a finite number');
  });

  it('exposes the heap visualization structure', () => {
    const queue = new PersistentPriorityQueue('alice');
    expect(queue.getMinHeapArray()).toEqual([]);
    expect(queue.minHeap.type).toBe('min');
    expect(queue.maxHeap.type).toBe('max');
  });
});