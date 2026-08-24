# Priora — Persistent Priority Queue

Priora is a production-quality full-stack demonstration application of a **Persistent Priority Queue** written in JavaScript.

Built with a custom, hand-crafted binary heap data structure, Express REST API, and a React dashboard UI, Priora persists queue state to disk across application restarts.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Data Structure Explanation](#data-structure-explanation)
7. [Why a Binary Heap Was Chosen](#why-a-binary-heap-was-chosen)
8. [How Min/Max Operations Work](#how-minmax-operations-work)
9. [Persistence Strategy](#persistence-strategy)
10. [API Documentation](#api-documentation)
11. [Installation](#installation)
12. [Running Backend](#running-backend)
13. [Running Frontend](#running-frontend)
14. [Running Tests](#running-tests)
15. [Example Usage](#example-usage)
16. [Time and Space Complexity](#time-and-space-complexity)
17. [Edge Cases & Resilience](#edge-cases--resilience)
18. [Real-World Use Cases](#real-world-use-cases)
19. [Design Decisions](#design-decisions)
20. [Possible Future Improvements](#possible-future-improvements)

---

## Project Overview

Priora combines an independent core algorithm module (`module.js`), a RESTful Express server (`server/`), and an interactive React dashboard (`client/`).

The core priority queue supports standard queue operations (`insert`, `peek`, `is_empty`) alongside efficient `extract_min`, `extract_max`, `update`, and `delete` operations in $O(\log n)$ time.

---

## Problem Statement

Priority queues in memory lose all queued tasks when an application crashes, restarts, or deploys. Priora persists queue and user data in PostgreSQL while maintaining strict $O(\log n)$ operation bounds.

---

## Features

- **Dual-Heap Architecture**: Fast $O(\log n)$ `extract_min` AND `extract_max`.
- **Index Map Positional Tracking**: $O(\log n)$ priority updates and targeted item deletions by ID.
- **PostgreSQL Persistence**: Parameterized queries provide durable storage, and extraction uses a transaction for atomic removal.
- **Decoupled Architecture**: `module.js` has zero dependencies on Express or React and can be used in any Node.js environment.
- **Interactive Dashboard**: Modern React UI with binary heap tree visualization, live stats, and dark mode aesthetic.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Dashboard                    │
│                (Vite + React 18 + Modern CSS)           │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / REST API
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      Express Server                     │
│                  (server/routes/queueRoutes)            │
└────────────────────────────┬────────────────────────────┘
                             │ Method Calls
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     module.js Module                    │
│             (PersistentPriorityQueue Class)             │
│        [ Min-Heap ] ── [ Max-Heap ] ── [ Index Map ]   │
└────────────────────────────┬────────────────────────────┘
                             │ Parameterized SQL
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL database                  │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
priora/
├── module.js                  # Primary Priority Queue & Heap logic
├── package.json               # Root dependencies & scripts
├── README.md                  # Comprehensive documentation
├── .gitignore
├── server/
│   ├── server.js              # Express REST API server
│   ├── routes/
│   │   └── queueRoutes.js     # API Route controllers
│   └── data/
│       └── db/db.js           # Shared PostgreSQL pool
├── client/                    # React Dashboard (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── QueueForm.jsx
│       │   ├── QueueList.jsx
│       │   ├── QueueControls.jsx
│       │   ├── QueueStats.jsx
│       │   └── HeapVisualization.jsx
│       └── styles/
│           └── index.css
└── tests/
    └── module.test.js         # Vitest unit test suite
```

---

## Data Structure Explanation

The core class `PersistentPriorityQueue` in `module.js` uses a **Dual Binary Heap + Index Map** structure:

1. **`minHeap` (BinaryHeap)**: An array-backed binary tree where parent node priority $\le$ child node priority (`minHeap[0]` is root min).
2. **`maxHeap` (BinaryHeap)**: An array-backed binary tree where parent node priority $\ge$ child node priority (`maxHeap[0]` is root max).
3. **`indexMap` (Map)**: Maps item `id` $\rightarrow$ `{ minIdx, maxIdx, item }`.

---

## Why a Binary Heap Was Chosen

- **Efficiency**: Inserts and removals execute in $O(\log n)$ time, compared to $O(n)$ for unsorted/sorted arrays.
- **Memory Overhead**: Represented as a flat array where for element $i$, left child is $2i + 1$, right child is $2i + 2$, and parent is $\lfloor (i-1)/2 \rfloor$. No pointer overhead.
- **Predictability**: Guarantees logarithmic bounds worst-case.

---

## How Min/Max Operations Work

To allow both `extract_min` and `extract_max` in $O(\log n)$:
- When inserting an item, it is pushed to both `minHeap` and `maxHeap`, and sifted up in both.
- `extract_min()` removes `minHeap[0]`, finds its `maxIdx` in `maxHeap` via `indexMap`, and calls `removeAt(maxIdx)` on `maxHeap`.
- `extract_max()` removes `maxHeap[0]`, finds its `minIdx` in `minHeap` via `indexMap`, and calls `removeAt(minIdx)` on `minHeap`.
- `removeAt(idx)` swaps the target element with the last array element, pops the array, and calls both `_siftUp(idx)` and `_siftDown(idx)` to restore heap order.

---

## Persistence Strategy

State is stored in PostgreSQL tables `users` and `queue_items`. Queue rows are scoped by `user_id`, ordered by priority and creation time, and accessed through one shared pool.

---

## API Documentation

### REST Endpoints

| Method | Endpoint | Description | Status Codes |
|--------|----------|-------------|--------------|
| `GET` | `/api/queue` | List all items & min-heap structure | `200` |
| `POST` | `/api/queue` | Insert new item (`{ value, priority }`) | `201`, `400` |
| `GET` | `/api/queue/peek` | Peek at highest priority (min) item | `200` |
| `POST` | `/api/queue/extract-min` | Extract min priority item | `200`, `400` |
| `POST` | `/api/queue/extract-max` | Extract max priority item | `200`, `400` |
| `GET` | `/api/queue/empty` | Check if queue is empty | `200` |
| `PUT` | `/api/queue/:id` | Update priority (`{ priority }`) | `200`, `400`, `404` |
| `DELETE` | `/api/queue/:id` | Delete item by ID | `200`, `404` |

---

## Installation

```bash
# Clone or navigate to project folder
cd Priora

# Install root dependencies (Express, Vitest, Cors)
npm install

# Install client dependencies (React, Vite)
cd client
npm install
cd ..
```

---

## Running Backend

```bash
# Start backend Express server (Port 3002)
npm run dev
# Or directly: node server/server.js
```

---

## Running Frontend

```bash
# Start Vite development server (Port 5173)
cd client
npm run dev
```

Open browser at `http://localhost:5173`.

---

## Running Tests

```bash
# Run Vitest test suite
npm test
```

---

## Example Usage (`module.js`)

```js
const PersistentPriorityQueue = require('./module');

// Instantiate a queue scoped to an existing username
const queue = new PersistentPriorityQueue('alice');

// Insert items (value, priority)
const item1 = await queue.insert('Fix production bug', 1);
const item2 = await queue.insert('Update docs', 5);

console.log(await queue.peek());        // { id: '...', value: 'Fix production bug', priority: 1, ... }
console.log(await queue.extract_min()); // Removes & returns 'Fix production bug'
console.log(await queue.extract_max()); // Removes & returns 'Update docs'
console.log(await queue.is_empty());    // true
```

---

## Time and Space Complexity

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| `insert(item, priority)` | $O(\log n)$ | $O(1)$ |
| `extract_min()` | $O(\log n)$ | $O(1)$ |
| `extract_max()` | $O(\log n)$ | $O(1)$ |
| `peek()` | $O(1)$ | $O(1)$ |
| `update(itemId, newPriority)` | $O(\log n)$ | $O(1)$ |
| `delete(itemId)` | $O(\log n)$ | $O(1)$ |
| `is_empty()` | $O(1)$ | $O(1)$ |
| **Total Storage Space** | — | $O(n)$ |

---

## Edge Cases & Resilience

1. **Empty Queue Operations**: `extract_min()` / `extract_max()` throw clear error messages caught by API layer.
2. **Duplicate Priorities**: Maintained cleanly in heap array order.
3. **Invalid Inputs**: Non-numeric or missing priorities/values are rejected with 400 Bad Request.
4. **File Corruption**: Backs up corrupted JSON file and boots safely.

---

## Real-World Use Cases

- **CPU & Operating System Process Scheduling**: Preemptive schedulers prioritize high-priority tasks.
- **Emergency Room Triage**: Patients are ordered by medical urgency rather than arrival time.
- **Network Packet Prioritization (QoS)**: Real-time audio/video packets take precedence over background downloads.
- **Dijkstra's Shortest Path Algorithm**: Min-heap extracts nearest unvisited graph node.
- **Job & Task Runners**: BullMQ / Celery style queue processing.

---

## Design Decisions

- **Dual-Heap with Index Map vs Lazy Deletion**: Direct positional tracking via `indexMap` ensures constant memory bound $O(n)$ without orphan node pollution in heaps.
- **Atomic JSON Storage**: Avoids external database setup while meeting persistence requirements safely.

---

## Possible Future Improvements

- Multi-tenant queues with namespace topics.
- Async persistence queue with flush debouncing for ultra-high throughput.
