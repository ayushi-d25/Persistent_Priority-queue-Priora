# Priora — Persistent Priority Queue
## Comprehensive Project Status & Handoff Guide

---

### 1. PROJECT OVERVIEW

**Priora** is a production-quality full-stack demonstration of a **Persistent Priority Queue** data structure built as an SDE interview assignment. It exposes a dual-heap binary tree data structure with JSON file persistence, REST API, JWT-based per-user isolation, and a soft, warm claymorphism React frontend dashboard supporting light and dark modes.

#### Tech Stack in Use:
- **Backend Core**: Node.js (v18+) with Express (`express@^4.21.0`), CORS (`cors@^2.8.5`), Node built-in `crypto` for scrypt password hashing and session tokens, `fs` atomic write persistence (`.tmp` -> rename pattern).
- **Data Structure Logic**: Standard zero-dependency vanilla JavaScript (`module.js`) implementing dual binary heaps (`MinHeap` + `MaxHeap`) with $O(\log n)$ updates/deletions mapped by an `indexMap`.
- **Frontend App**: React 18 (`react@^18.2.0`, `react-dom@^18.2.0`), Vite 5 (`vite@^5.1.6`), `@vitejs/plugin-react@^4.2.1`, Lucide icons (`lucide-react@^0.344.0`), `sharp@^0.35.3` for PNG favicon processing.
- **Styling**: Vanilla CSS (`client/src/styles/index.css`) with custom CSS properties for Light and Dark modes (`:root` / `[data-theme="dark"]`), soft dual claymorphism drop shadows, pill buttons, floating glass toast notifications, and responsive landing page layout.
- **Testing Framework**: Vitest (`vitest@^3.2.1`).

---

### 2. CURRENT FOLDER STRUCTURE

```
Priora/
├── module.js                     # Core PersistentPriorityQueue class & dual-heap data structure
├── package.json                  # Root dependencies (Express, CORS, Vitest)
├── package-lock.json
├── README.md                     # Project introduction and overview
├── PROJECT_STATUS.md             # Complete project status and handoff documentation
├── .gitignore
│
├── server/
│   ├── server.js                 # Express backend server entry point (Port 4001)
│   ├── data/
│   │   └── queues/               # Legacy data retained for reference only
│   │       ├── alice_test.json
│   │       ├── ayushi.json
│   │       ├── bob_test.json
│   │       └── Siya.json
│   └── routes/
│       ├── authRoutes.js         # /api/auth endpoints (signup, login, me) & session store
│       └── queueRoutes.js        # /api/queue endpoints with per-user requireAuth middleware
│
├── client/
│   ├── index.html                # Entry HTML with /favicon.png link & Jakarta Sans font
│   ├── package.json              # Client dependencies (React 18, Vite 5, sharp)
│   ├── vite.config.js            # Vite config with /api proxy pointing to http://localhost:4001
│   ├── public/
│   │   ├── favicon.png           # Auto-cropped 251x289px high-res favicon
│   │   └── Icon3.png
│   └── src/
│       ├── main.jsx              # React app mounting root
│       ├── App.jsx               # Dashboard header, auth state, toast notifications, API handlers
│       ├── assets/
│       │   ├── Icon3.png         # Priora logo asset
│       │   ├── login_char.png    # Female character graphic standing by landing card
│       │   └── Profile.png       # User profile avatar image
│       ├── components/
│       │   ├── LandingPage.jsx   # Auth landing card with Sign In / Sign Up tabs & character graphic
│       │   ├── QueueForm.jsx     # Form for inserting value + priority
│       │   ├── QueueControls.jsx # Peek Root, Extract Min, Extract Max operation buttons
│       │   ├── QueueList.jsx     # Queue item cards with inline priority editing & delete prompt
│       │   ├── QueueStats.jsx    # Stat chips for Total, Min, Max, and Queue Status
│       │   └── HeapVisualization.jsx # Binary min-heap tree structure visualizer
│       └── styles/
│           └── index.css         # Complete Claymorphism design system & floating toasts
│
└── tests/
    └── module.test.js            # Vitest suite covering all 7 priority queue operations
```

---

### 3. WHAT'S IMPLEMENTED — BACKEND

#### Data Structure (`module.js`)
- **Class**: `PersistentPriorityQueue`
- **Data Structure Design**:
  - `minHeap`: Binary array implementation where parent index is `Math.floor((i - 1) / 2)` and children are `2i + 1`, `2i + 2`. Parent priority $\le$ child priority.
  - `maxHeap`: Mirror binary array implementation where parent priority $\ge$ child priority.
  - `indexMap`: JavaScript `Map<id, { minIdx, maxIdx, item }>` keeping track of exact element positions in both array heaps for $O(\log n)$ arbitrary updates and deletions.
- **Operations Implemented**:
  1. `insert(value, priority)`: Generates UUID `id`, pushes to `minHeap` and `maxHeap`, runs `_siftUp` on both, writes to file. Returns item.
  2. `extract_min()`: Delegates to `_removeItem(id)` on root of `minHeap`. Returns item with lowest priority number.
  3. `extract_max()`: Delegates to `_removeItem(id)` on root of `maxHeap`. Returns item with highest priority number.
  4. `peek()`: Returns item at `minHeap[0]` without removing it ($O(1)$).
  5. `update(id, newPriority)`: Updates priority in `indexMap`, runs `_siftUp` and `_siftDown` on both heaps.
  6. `delete(id)`: Removes element from both heaps in $O(\log n)$ using `_removeItem(id)`.
  7. `is_empty()`: Returns boolean `minHeap.length === 0`.
- **PostgreSQL Persistence**:
  - Queue rows are loaded from PostgreSQL and scoped by `user_id`.
  - Mutations use parameterized SQL and extraction uses a transaction.

#### REST API Server (`server/server.js` & `server/routes/`)
- **Port**: Default `4001` (overridable via `process.env.PORT`).
- **Endpoints**:
  - `POST /api/auth/signup`: Accepts `{ username, password }`, hashes password using `crypto.scryptSync`, saves to `server/data/users.json`, and returns `{ success: true, data: { username, token } }`.
  - `POST /api/auth/login`: Accepts `{ username, password }`, verifies scrypt hash, and returns session token.
  - `GET /api/auth/me`: Validates session token in `Authorization: Bearer <token>`.
  - `GET /api/queue`: Requires auth header; returns items array, minHeap array, size, and isEmpty state for authenticated user.
  - `POST /api/queue`: Inserts item for authenticated user queue.
  - `GET /api/queue/peek`: Peeks root of authenticated user queue.
  - `POST /api/queue/extract-min`: Extracts min item for authenticated user.
  - `POST /api/queue/extract-max`: Extracts max item for authenticated user.
  - `PUT /api/queue/:id`: Updates priority of item in authenticated user queue.
  - `DELETE /api/queue/:id`: Deletes item from authenticated user queue.

#### Fixed Bugs:
- **`extract_min` Queue Drain Bug**: Previously, extracting min inadvertently emptied the entire heap due to unsynchronized state between heaps. Resolved by refactoring `extract_min`, `extract_max`, `update`, and `delete` to delegate node removal to a single unified `_removeItem(id)` helper that correctly swaps target with the array tail, updates index mappings, and executes sift-up/sift-down operations.

---

### 4. WHAT'S IMPLEMENTED — FRONTEND

#### React Components (`client/src/components/`)
- `LandingPage.jsx`: Centered auth card with Sign In / Sign Up tab switcher, explicit labels, error toasts, and female character graphic (`login_char.png`) positioned side-by-side.
- `QueueForm.jsx`: Input form for inserting task value and numeric priority.
- `QueueControls.jsx`: Action buttons for Peek Root, Extract Min, and Extract Max.
- `QueueStats.jsx`: Pastel icon chips displaying total items, min priority, max priority, and active/empty status.
- `QueueList.jsx`: Interactive list of queue items with inline priority editing (`Edit ✏️`) and delete confirmation prompts.
- `HeapVisualization.jsx`: Visual representation of binary min-heap tree structure separated into level rows.

#### Authentication & State Flow (`client/src/App.jsx`)
- User credentials and session tokens are saved to `localStorage` (`priora_user`, `priora_token`).
- All queue fetch calls include `Authorization: Bearer ${token}` header.
- Header user chip features dropdown with **Cancel** and **Logout** options. Logout clears session state and resets theme.
- **Scroll Behavior**: Clicking **Peek Root** invokes `window.scrollTo({ top: 0, behavior: 'smooth' })` when the toast notification displays, ensuring immediate visibility.

#### Visual Design
- **Theme**: Soft, warm Claymorphism design system in pastel tones (Cream `#FBF3E7`, Sage `#A9C6A5`, Peach `#F0A98A`, Rose `#F1B6B6`, Gold `#F3D48A`, Soft Blue `#A9C3DC`).
- **Mode Switching**: Full Light and Dark mode toggle (`data-theme="dark"`) persisted in `localStorage`.
- **Toasts**: Floating top-right notifications (`.toast-container`, `z-index: 99999`) with smooth `@keyframes toastSlideIn` entry animation.

---

### 5. TESTING

The test suite in [`tests/module.test.js`](file:///c:/Users/HP/Desktop/All/Projects/Priora/tests/module.test.js) validates all 7 queue operations:

```text
 RUN  v3.2.7 C:/Users/HP/Desktop/All/Projects/Priora

 ✓ tests/module.test.js (13 tests) 76ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  23:37:55
   Duration  982ms (transform 42ms, setup 0ms, collect 63ms, tests 76ms, environment 0ms, prepare 525ms)
```

---

### 6. HOW TO RUN IT

1. **Start Backend Server**:
   ```bash
   # From project root
   node server/server.js
   # Running on http://localhost:4001
   ```

2. **Start Frontend Dev Server**:
   ```bash
   # From client directory
   cd client
   npm run dev
   # Running on http://localhost:5173
   ```

---

### 7. KNOWN ISSUES / LIMITATIONS

- **Port Conflicts on Windows**: Port 3001/3002 may be occupied by background processes; backend is currently configured to port `4001` and Vite proxies `/api` requests to `http://localhost:4001`.
- **Session Tokens**: Tokens are stored in-memory in `activeSessions` Map in `authRoutes.js`. Restarting the backend server clears active token sessions, requiring users to log in again. User accounts themselves persist in `server/data/users.json`.

---

### 8. RECENT CHANGES

1. **Per-User Queue Scoping**: Refactored `queueRoutes.js` to initialize per-user PostgreSQL-backed `PersistentPriorityQueue` instances. Attached authorization tokens to all frontend API requests.
2. **Landing Page Character Graphic**: Added `src/assets/login_char.png` next to the login card with responsive desktop side-by-side flex layout and mobile auto-hiding.
3. **Favicon Cropping**: Processed `Icon3.png` with `sharp` to strip transparent padding, producing a 251x289px crop saved to `client/public/favicon.png`.
4. **User Header Dropdown**: Converted header user badge into an interactive dropdown menu containing Cancel and Logout options.
5. **Toast Floating Container & Smooth Scroll**: Refactored `.alert-toast` to position fixed at top-right with `z-index: 99999` and slide-in keyframe animation. Added smooth window scroll to top on `handlePeek`, `handleExtractMin`, and `handleExtractMax` execution.
