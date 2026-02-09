# KAN BAN JS

A vanilla HTML, CSS, and JavaScript kanban board. Built as a learning project to practice ES6 classes, DOM manipulation, drag-and-drop events, and event-driven architecture -- no frameworks, no build tools, no backend.

> **Status:** Early prototype (v0.2.0). Core drag-and-drop, color themes, task editing, and mark-complete work; data persistence is on the roadmap.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema (Roadmap)](#2-database-schema-roadmap)
3. [API Specifications (Roadmap)](#3-api-specifications-roadmap)
4. [Integration Requirements](#4-integration-requirements)
5. [Data Synchronization](#5-data-synchronization)
6. [Security and Compliance](#6-security-and-compliance)
7. [Performance Requirements](#7-performance-requirements)
8. [Monitoring and Logging](#8-monitoring-and-logging)
9. [Testing Requirements](#9-testing-requirements)
10. [Deployment and CI/CD](#10-deployment-and-cicd)
11. [Edge Cases and Error Handling](#11-edge-cases-and-error-handling)
12. [Future Considerations](#12-future-considerations)
13. [AI Workflows](#13-ai-workflows)

---

## 1. System Architecture

### Class Hierarchy

```
App (static entry point)
 ├── ThemeManager (static)   — color theme switching & localStorage persistence
 ├── TaskCardModal (static)  — edit task title & description
 └── Board
      └── TaskList[]  (one per column: Pendientes, En Proceso, Finalizadas)
           └── Task[]  (individual task items)
```

| Class            | Responsibility                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `App`            | Static `init()` entry point — creates the Board, initializes ThemeManager and TaskCardModal                           |
| `ThemeManager`   | Applies color themes (`dark`, `light`, `awesome`) via `data-theme` attribute; persists selection in `localStorage`     |
| `TaskCardModal`  | Singleton modal for editing a task's title and description; opened from the edit button on each task                   |
| `Board`          | Renders the `<section id="board">` container; creates default TaskLists; manages drag-and-drop for tasks and lists    |
| `TaskList`       | Renders a column, manages its `tasks[]` array, provides persistent inline input for adding tasks                      |
| `Task`           | Data object holding `taskID`, `taskName`, `description`, `completed`, `parentListID`, `parentListName`                |

### Data Flow

```
User Action → DOM Event → Class Method → DOM Mutation
                                       ↘ Internal Array Update
```

Drag-and-drop now preserves task objects (with description and completed state) when moving between lists.

### DOM Structure

```
body
 ├── #backdrop                 (modal overlay)
 ├── #navigation > .nav-bar    (top bar with title + settings gear)
 ├── #settings-page            (full-screen theme settings overlay)
 ├── #task-card-modal          (task edit card with backdrop)
 │    └── .task-card            (title input, list label, description textarea, save)
 └── #app
      └── #board.board
           ├── .tasklist-wrapper (draggable)
           │    └── .tasklist#list1 (Pendientes)
           │         ├── .tasklist-header
           │         ├── li.task (draggable)
           │         │    └── .task-content
           │         │         ├── .task-check  (✓ toggle)
           │         │         ├── .task-title
           │         │         └── .task-edit-btn (✎)
           │         └── .add-task-row (input + button)
           ├── .tasklist-wrapper > .tasklist#list2 (En Proceso)
           └── .tasklist-wrapper > .tasklist#list3 (Finalizadas)
```

### File Map

```
kanban-js/
├── index.html              Single-page shell (nav, settings page, task card modal)
├── assets/
│   ├── css/app.css         All styles inc. 3 color themes via CSS custom properties
│   └── js/app.js           All logic (ThemeManager, TaskCardModal, Board, TaskList, Task)
├── package.json            npm scripts + dev tooling
├── .eslintrc.json          Linting config
├── .prettierrc             Formatting config
└── .github/
    ├── workflows/
    │   ├── ci.yml          Lint & format checks
    │   └── deploy.yml      GitHub Pages deploy
    └── PULL_REQUEST_TEMPLATE.md
```

---

## 2. Database Schema (Roadmap)

No persistence layer exists yet. All data lives in memory and is lost on page reload.

### Phase 1: localStorage

```jsonc
// Key: "kanban_board"
{
    "version": 1,
    "lists": [
        {
            "id": "list1",
            "name": "Pendientes",
            "tasks": [
                {
                    "id": "list1-task1",
                    "name": "defaultTask",
                    "description": "",
                    "createdAt": "2025-01-15T10:00:00Z",
                },
            ],
        },
    ],
}
```

### Phase 2: Backend Database (future)

```sql
CREATE TABLE lists (
    id          UUID PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    position    INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
    id          UUID PRIMARY KEY,
    list_id     UUID REFERENCES lists(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    position    INTEGER NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. API Specifications (Roadmap)

No backend exists. The following REST endpoints are planned for a future version.

### Planned Endpoints

| Method   | Endpoint               | Description               | Request Body                                   | Response            |
| -------- | ---------------------- | ------------------------- | ---------------------------------------------- | ------------------- |
| `GET`    | `/api/board`           | Get full board state      | --                                             | `{ lists: List[] }` |
| `POST`   | `/api/lists`           | Create a new list         | `{ name }`                                     | `List`              |
| `PUT`    | `/api/lists/:id`       | Update list name/position | `{ name?, position? }`                         | `List`              |
| `DELETE` | `/api/lists/:id`       | Delete a list             | --                                             | `204`               |
| `POST`   | `/api/lists/:id/tasks` | Create a task in a list   | `{ name, description? }`                       | `Task`              |
| `PUT`    | `/api/tasks/:id`       | Update a task             | `{ name?, description?, list_id?, position? }` | `Task`              |
| `DELETE` | `/api/tasks/:id`       | Delete a task             | --                                             | `204`               |

### Data Contracts

```typescript
interface List {
    id: string;
    name: string;
    position: number;
    tasks: Task[];
}

interface Task {
    id: string;
    name: string;
    description: string;
    listId: string;
    position: number;
    createdAt: string;
    updatedAt: string;
}
```

---

## 4. Integration Requirements

### Current Integrations

| Integration                                | Type         | Purpose                       |
| ------------------------------------------ | ------------ | ----------------------------- |
| Google Fonts (Alata)                       | CDN `<link>` | Primary UI typeface           |
| Google Fonts (Montserrat, Share Tech Mono) | CDN `<link>` | Headings and monospace labels |

### Planned Integrations

| Integration      | Phase | Purpose                            |
| ---------------- | ----- | ---------------------------------- |
| localStorage API | v0.2  | Persist board state across reloads |
| Backend REST API | v1.0  | Multi-device sync, user accounts   |
| Service Worker   | v1.0  | Offline support and caching        |

---

## 5. Data Synchronization

### Current State

There is no data synchronization. The board is initialized from hardcoded defaults on every page load. DOM mutations from drag-and-drop are visual only and do not update the internal `tasks[]` arrays.

### Planned Sync Strategy

| Phase | Strategy           | Details                                                                     |
| ----- | ------------------ | --------------------------------------------------------------------------- |
| v0.2  | **localStorage**   | Save on every mutation; load on `DOMContentLoaded`; debounce writes (300ms) |
| v0.3  | **REST API**       | Optimistic UI updates; queue failed requests for retry                      |
| v1.0  | **Multi-tab sync** | `BroadcastChannel` or `storage` event listener to sync across tabs          |

---

## 6. Security and Compliance

### XSS Analysis

| Location                         | Risk       | Detail                                                                                                                                                                           |
| -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TaskList` constructor (line 24) | **Medium** | Uses template literal in `innerHTML` -- `listName` comes from the hardcoded `DEFAULT_LISTS` array, so currently safe, but would be vulnerable if list names become user-editable |
| `addTaskBtnHandler` (line 117)   | **Low**    | Modal HTML is a static template; user input is read via `.value` and set via `textContent` (safe)                                                                                |
| `Task` constructor               | **Low**    | Reads `innerHTML` of `.tasklist-name` to set `parentListName` — currently only used for display in the card modal                                                                |

### Recommendations

- Replace `innerHTML` with `textContent` or DOM APIs where possible
- Sanitize any user-supplied values before inserting into the DOM
- Add a Content Security Policy (CSP) header:
    ```
    Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;
    ```

---

## 7. Performance Requirements

### Current Profile

| Metric             | Value                                    |
| ------------------ | ---------------------------------------- |
| Total payload      | ~12 KB (HTML + CSS + JS, uncompressed)   |
| External resources | 3 Google Fonts requests                  |
| JavaScript         | Single ~500-line file, no bundling needed |

### Targets

| Metric                   | Target        | Notes                                         |
| ------------------------ | ------------- | --------------------------------------------- |
| First Contentful Paint   | < 500ms       | Already fast given the tiny payload           |
| Drag-and-drop frame rate | 60 fps        | Currently met -- no heavy reflows during drag |
| Task count support       | 100+ per list | May need virtual scrolling above ~200 tasks   |

---

## 8. Monitoring and Logging

### Current State

The codebase uses `console.log` / `console.info` extensively for debug output during development. There is no structured logging or error tracking.

### Recommendations

| Concern                | Recommendation                                                          |
| ---------------------- | ----------------------------------------------------------------------- |
| Debug logging          | Wrap in a `DEBUG` flag: `const DEBUG = false;` and guard logs behind it |
| Error tracking         | Add a global `window.onerror` handler; consider Sentry for production   |
| Performance monitoring | Use `Performance.mark()` / `Performance.measure()` for key operations   |
| User analytics         | Defer until a backend exists; keep it privacy-respecting                |

---

## 9. Testing Requirements

### Planned Strategy

No tests exist yet. The planned approach:

| Layer       | Tool           | Scope                                                              |
| ----------- | -------------- | ------------------------------------------------------------------ |
| Unit        | Vitest + jsdom | Class methods (`addTask`, `removeTask`, array management)          |
| Integration | Vitest + jsdom | Board initialization, modal open/close, DOM structure              |
| E2E         | Playwright     | Full drag-and-drop flow, task creation, cross-browser verification |

### Recommended First Tests

1. `Board` creates the correct number of `TaskList` instances
2. `TaskList.addTask()` appends a `<li>` to the DOM and updates `tasks[]`
3. `TaskList.removeTask()` removes the element and filters `tasks[]`
4. Drag-and-drop moves a task element between lists
5. "Add Task" modal validates non-empty input

---

## 10. Deployment and CI/CD

### Git Flow Branching

```
main  ← production-ready, deploys to GitHub Pages
  │
develop ← integration branch, receives feature PRs
  │
feature/* ← individual feature/fix branches (branch from develop)
```

**Workflow:**

1. Create `feature/*` branch from `develop`
2. Open PR to `develop` -- CI runs lint + format checks
3. Merge to `develop` after review
4. When ready to release, merge `develop` → `main`
5. `main` push triggers GitHub Pages deploy

### CI Pipeline (`.github/workflows/ci.yml`)

Triggers on push/PR to `develop` and `main`:

1. Checkout code
2. Setup Node.js 20
3. `npm ci`
4. `npm run lint` (ESLint)
5. `npm run format:check` (Prettier)

### Deploy Pipeline (`.github/workflows/deploy.yml`)

Triggers on push to `main`:

1. Checkout code
2. Upload repo as GitHub Pages artifact
3. Deploy via `actions/deploy-pages@v4`

### Local Development

```bash
# Clone and install
git clone https://github.com/<your-username>/kanban-js.git
cd kanban-js
npm install

# Open in browser (no build step needed)
open index.html

# Run linting and formatting
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm run format        # Format all files
npm run format:check  # Verify formatting
npm run validate      # Run both lint + format check
```

---

## 11. Edge Cases and Error Handling

### Known Issues

| Issue                   | Location                        | Description                                                                                          |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Math.random()` IDs     | `submitNewTask`                | Task IDs generated with `Math.random().toString()` risk collisions and produce non-semantic IDs      |
| `innerHTML` in template | `TaskList` constructor          | Uses template literal in `innerHTML` — `listName` comes from hardcoded defaults, but would be vulnerable if user-editable |

### Error Handling (Current)

There is no try/catch or error boundary. The only validation is a non-empty check on the task name input with a browser `alert()`.

---

## 12. Future Considerations

### Short-term (v0.3)

- [ ] Add localStorage persistence for board state
- [ ] Replace `Math.random()` IDs with `crypto.randomUUID()`
- [ ] Task deletion (from card modal or inline)
- [ ] Clean up `console.log` statements
- [ ] Replace `innerHTML` with `textContent` / DOM APIs where possible

### Medium-term (v0.4)

- [ ] Custom list creation / renaming / deletion
- [ ] Responsive design for mobile
- [ ] Unit and integration tests (Vitest)
- [ ] Keyboard accessibility for drag-and-drop

### Long-term (v1.0)

- [ ] Backend API with user authentication
- [ ] Multi-device sync
- [ ] Offline support (Service Worker)
- [ ] Task labels, due dates, and priorities
- [ ] E2E tests (Playwright)
- [ ] Accessibility audit (keyboard navigation, ARIA roles, screen reader support)

---

## 13. AI Workflows

### Development Assistance

| Tool               | Use Case                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Claude Code**    | Architecture decisions, code review, refactoring guidance, documentation generation, debugging sessions |
| **GitHub Copilot** | Inline code completion, boilerplate generation, test scaffolding                                        |

**Suggested prompts for Claude Code:**

- "Review `connectDroppable()` and suggest how to keep `tasks[]` in sync with DOM moves"
- "Refactor the modal logic into a reusable Modal class"
- "Write Vitest unit tests for the TaskList class"

### In-App AI Features (Future)

| Feature              | Description                                                                 | Phase |
| -------------------- | --------------------------------------------------------------------------- | ----- |
| Smart categorization | Auto-suggest which list a new task belongs in based on keywords             | v1.0  |
| NLP task creation    | Create tasks from natural language ("Schedule meeting with team on Friday") | v1.0  |
| Task summarization   | Summarize all tasks in a list for standup reports                           | v1.0  |
| Priority suggestions | Suggest task priority based on due dates and dependencies                   | v1.0  |

---

## License

MIT
