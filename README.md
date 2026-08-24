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

Priority queues in memory lose all queued tasks when an application crashes, restarts, or deploys. Priora solves this by serializing data mutations atomically to disk (`server/data/queue.json`), ensuring zero task loss while maintaining strict $O(\log n)$ algorithmic bounds.

---

## Features

- **Dual-Heap Architecture**: Fast $O(\log n)$ `extract_min` AND `extract_max`.
- **Index Map Positional Tracking**: $O(\log n)$ priority updates and targeted item deletions by ID.
- **Atomic Persistence**: Temp-file write (`.tmp`) + rename pattern prevents data corruption during unexpected crashes.
- **Fault-Tolerant Load**: Automatically handles missing, empty, or corrupted JSON files without crashing, creating automatic backups of corrupted files.
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
                             │ Atomic File I/O
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 server/data/queue.json                  │
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
│       └── queue.json         # Persistent JSON file storage
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

State is stored in `server/data/queue.json`:
- **Atomic Writes**: `_save()` writes the state to `queue.json.tmp` first, then uses `fs.renameSync` to atomically swap the file. This prevents half-written JSON files if a process is killed mid-write.
- **Resilience**: `_load()` gracefully handles:
  - Non-existent file $\rightarrow$ starts empty.
  - Empty file $\rightarrow$ starts empty.
  - Corrupted JSON $\rightarrow$ creates a `.corrupted.<timestamp>` copy and starts empty.
  - Duplicate IDs or malformed item objects $\rightarrow$ logs warning and skips invalid entries.

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

// Instantiate queue with storage path
const queue = new PersistentPriorityQueue('./server/data/queue.json');

// Insert items (value, priority)
const item1 = queue.insert('Fix production bug', 1);
const item2 = queue.insert('Update docs', 5);

console.log(queue.peek());        // { id: '...', value: 'Fix production bug', priority: 1, ... }
console.log(queue.extract_min()); // Removes & returns 'Fix production bug'
console.log(queue.extract_max()); // Removes & returns 'Update docs'
console.log(queue.is_empty());    // true
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
