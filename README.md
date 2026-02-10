# KAN BAN JS

A kanban board built with **Vue 3**, **Pinia**, and **Supabase** for authentication and data persistence. Each user gets a private, persisted board with drag-and-drop, color themes, task editing, archiving, and deletion.

> **Status:** v0.3.0 -- Vue 3 + Pinia, Supabase auth (email+password), Row-Level Security, persistent board state, 3 color themes, task archive and delete.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Supabase Setup](#2-supabase-setup)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Security](#5-security)
6. [Deployment](#6-deployment)
7. [Performance](#7-performance)
8. [Testing](#8-testing)
9. [Future Considerations](#9-future-considerations)
10. [AI Workflows](#10-ai-workflows)

---

## 1. Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** project (free tier works fine) -- see [Supabase Setup](#2-supabase-setup)

### Install and Run

```bash
# Clone and install
git clone https://github.com/<your-username>/kanban-js.git
cd kanban-js
npm install

# Configure environment (see Supabase Setup below)
cp .env.example .env
# Edit .env with your Supabase project URL and publishable API key

# Start development server
npm run dev
```

Vite will start a dev server at `http://localhost:5173` with hot module replacement.

### Available Scripts

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start Vite dev server with HMR       |
| `npm run build`        | Production build to `dist/`          |
| `npm run preview`      | Preview the production build locally |
| `npm run lint`         | Check for lint errors (ESLint)       |
| `npm run lint:fix`     | Auto-fix lint errors                 |
| `npm run format`       | Format all files (Prettier)          |
| `npm run format:check` | Verify formatting                    |
| `npm run validate`     | Run both lint + format check         |

---

## 2. Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** and choose a name, password, and region
3. Wait for the project to finish provisioning

### Step 2: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase/migration.sql` from this repo and paste its entire contents into the editor
4. Click **Run** to execute the migration

This creates:

- `profiles` table -- stores per-user theme preference
- `lists` table -- kanban columns with position ordering
- `tasks` table -- task cards with title, description, completed status, and position
- Row-Level Security (RLS) policies so each user can only see their own data
- A database trigger that auto-creates a profile and 3 default lists (Pendientes, En Proceso, Finalizadas) when a new user signs up

### Step 3: Configure Authentication

1. In the Supabase dashboard, go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled (it is by default)
3. For local development, go to **Authentication** > **Settings** and disable **Confirm email** to skip email verification. Re-enable it for production.

### Step 4: Get Your API Credentials

1. In the Supabase dashboard, go to **Settings** > **API**
2. Copy the **Project URL** (e.g., `https://abcdefg.supabase.co`)
3. Copy the **anon / public** key (starts with `eyJ...`)

### Step 5: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_API_KEY=your-publishable-api-key-here
```

> The publishable API key is safe to use client-side -- Row-Level Security ensures users can only access their own data.

### Step 6: Verify

```bash
npm run dev
```

1. Open `http://localhost:5173`
2. Click "Don't have an account? Create one"
3. Sign up with an email and password
4. You should see 3 default lists with no tasks
5. Add a task, refresh the page -- it persists!

---

## 3. System Architecture

For a detailed architecture diagram, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Component Hierarchy

```
App.vue (root — auth routing, board loading)
 ├── AuthForm.vue           Login/signup form with validation
 ├── LoadingSpinner.vue     Shown while fetching board data
 └── Board Page
      ├── AppNavbar.vue     Top nav (title, archive toggle, settings, sign-out)
      ├── ThemeSettings.vue Theme picker overlay
      ├── BoardView.vue     Board container
      │    ├── draggable    List reordering (vuedraggable)
      │    │    └── TaskListColumn.vue[]  One per kanban column
      │    │         ├── draggable        Task reordering (vuedraggable)
      │    │         │    └── TaskCard.vue[]  Individual task cards
      │    │         └── add-task-row     Inline new task input
      │    ├── TaskListColumn.vue         Archived column (readonly, no DnD)
      │    └── TaskEditModal.vue          Edit title/description, archive, delete
      └── ToastNotification.vue           Toast messages
```

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Components (Vue SFCs)                                  │
│  Read from stores, emit events, render UI               │
├─────────────────────────────────────────────────────────┤
│  Pinia Stores (src/stores/)                             │
│  Reactive state, business logic, call services          │
│  ├── auth.js    — session state, signIn/signUp/signOut  │
│  ├── board.js   — lists, tasks, archive, CRUD actions   │
│  └── theme.js   — theme state, apply + persist          │
├─────────────────────────────────────────────────────────┤
│  Services (src/services/)                               │
│  Pure JS functions, no Vue dependency                   │
│  ├── supabase.js — client initialization                │
│  ├── auth.js     — auth API calls                       │
│  └── db.js       — data API calls, ARCHIVED_LIST_TITLE  │
├─────────────────────────────────────────────────────────┤
│  Supabase (Postgres + Auth + RLS)                       │
│  Tables: profiles, lists, tasks                         │
│  All scoped to auth.uid() via Row-Level Security        │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Vue Event → Store Action → Service Function → Supabase API
                        ↘ Reactive State Update → Component Re-render
```

All mutations (create, update, reorder, complete, delete, archive) are persisted to Supabase immediately. Errors are surfaced via toast notifications.

### Module Map

```
kanban-js/
├── index.html                 Vite entry point
├── src/
│   ├── main.js                Vue bootstrap (createApp + Pinia + Router)
│   ├── App.vue                Root component (auth routing, board loading)
│   ├── router.js              Vue Router (hash history, auth guard)
│   ├── stores/
│   │   ├── auth.js            Auth state + actions
│   │   ├── board.js           Board state + CRUD + archive/delete actions
│   │   └── theme.js           Theme state + persistence
│   ├── services/
│   │   ├── supabase.js        Supabase client init (env vars)
│   │   ├── auth.js            Auth API (signUp, signIn, signOut, etc.)
│   │   └── db.js              Data API (fetchBoard, createTask, deleteTask, etc.)
│   └── components/
│       ├── AppNavbar.vue      Top nav (title, archive toggle, settings, sign-out)
│       ├── AuthForm.vue       Login/signup form with validation
│       ├── BoardView.vue      Board layout + archived column
│       ├── TaskListColumn.vue Kanban column (supports readonly mode)
│       ├── TaskCard.vue       Task card (check, title, edit btn)
│       ├── TaskEditModal.vue  Edit modal (title, desc, archive, delete)
│       ├── ThemeSettings.vue  Theme picker overlay
│       ├── LoadingSpinner.vue Loading spinner
│       └── ToastNotification.vue Toast messages
├── assets/
│   └── css/app.css            All styles + 3 themes (CSS custom properties)
├── supabase/
│   └── migration.sql          Database schema, RLS policies, seed trigger
├── docs/
│   └── ARCHITECTURE.md        Detailed software architecture diagram
├── vite.config.js             Vite configuration
├── .env.example               Environment variable template
├── package.json               Dependencies and scripts
├── .eslintrc.json             Linting config (ES modules)
├── .prettierrc                Formatting config
└── .github/
    ├── workflows/
    │   ├── ci.yml             Lint + format + build checks
    │   └── deploy.yml         Vite build + GitHub Pages deploy
    └── PULL_REQUEST_TEMPLATE.md
```

---

## 4. Database Schema

The database uses 3 tables with Row-Level Security. See `supabase/migration.sql` for the full schema.

### Tables

```sql
-- User preferences (auto-created on signup via trigger)
profiles (id UUID PK → auth.users, theme TEXT default 'dark')

-- Kanban columns (3 default lists seeded on signup)
-- The special title '__archived__' is used as a sentinel for the archive list
lists (id UUID PK, user_id UUID FK, title TEXT, position INT)

-- Task cards
tasks (id UUID PK, list_id UUID FK, user_id UUID FK, title TEXT,
       description TEXT, completed BOOL, position INT)
```

### RLS Policies

All tables have Row-Level Security enabled. Every policy is scoped to `auth.uid() = user_id` (or `auth.uid() = id` for profiles), ensuring users can only read and write their own data.

### Auto-Seed Trigger

When a new user signs up, a database trigger:

1. Creates a row in `profiles` with default theme `'dark'`
2. Inserts 3 default lists: Pendientes (pos 0), En Proceso (pos 1), Finalizadas (pos 2)

### Archive System

The archive uses the existing `lists` table -- no schema migration required:

- A list with the sentinel title `__archived__` serves as the archive container
- This list is lazily created (via `db.createList()`) on the first archive action
- The board store separates `__archived__` from regular lists during `loadBoard`
- Archived tasks can be unarchived back to the first regular list

---

## 5. Security

### Authentication

- Email + password authentication via Supabase Auth
- Client-side validation: email format check, minimum 6-character password
- Session managed by `@supabase/supabase-js` (stores JWT in localStorage)

### Data Protection

- **Row-Level Security (RLS):** Every table has policies ensuring users can only access their own rows
- **Publishable API key is safe client-side:** It only grants access through RLS policies -- it cannot bypass them
- **XSS mitigated:** All user content is rendered via Vue's default text interpolation (auto-escaped) -- no `v-html` with user data

### Task Deletion

- Permanent delete requires a 2-step confirmation in the UI ("Delete" -> "Delete this task?" -> "Yes, delete")
- Delete removes the task from the database permanently via `supabase.from('tasks').delete()`

### Recommendations for Production

- Enable **Confirm email** in Supabase Auth settings
- Add a Content Security Policy (CSP) header
- Consider rate limiting on the auth endpoints

---

## 6. Deployment

### Git Flow Branching

```
main  ← production-ready, deploys to GitHub Pages
  │
develop ← integration branch, receives feature PRs
  │
feature/* ← individual feature/fix branches (branch from develop)
```

### CI Pipeline (`.github/workflows/ci.yml`)

Triggers on push/PR to `develop` and `main`:

1. **Lint & Format Check:** ESLint + Prettier
2. **Build Check:** `vite build` with placeholder env vars to verify compilation

### Deploy Pipeline (`.github/workflows/deploy.yml`)

Triggers on push to `main`:

1. `npm ci` + `npm run build` (with Supabase secrets from GitHub repo settings)
2. Upload `dist/` as GitHub Pages artifact
3. Deploy via `actions/deploy-pages@v4`

**Required GitHub Secrets:**

- `VITE_SUPABASE_URL` -- your Supabase project URL
- `VITE_SUPABASE_API_KEY` -- your Supabase publishable API key

Set these in your repo: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.

---

## 7. Performance

### Current Profile

| Metric             | Value                                         |
| ------------------ | --------------------------------------------- |
| Total payload      | ~185 KB bundled (JS), ~23 KB CSS (production) |
| External resources | 3 Google Fonts requests, Supabase API calls   |
| Build tool         | Vite 7+ (ES modules, tree-shaking)            |

### Targets

| Metric                   | Target        | Notes                                         |
| ------------------------ | ------------- | --------------------------------------------- |
| First Contentful Paint   | < 800ms       | Theme loads from localStorage cache instantly |
| Drag-and-drop frame rate | 60 fps        | No heavy reflows during drag                  |
| Task count support       | 100+ per list | May need virtual scrolling above ~200 tasks   |

---

## 8. Testing

### Planned Strategy

| Layer       | Tool           | Scope                                                             |
| ----------- | -------------- | ----------------------------------------------------------------- |
| Unit        | Vitest + jsdom | Store actions, service functions                                  |
| Integration | Vitest + jsdom | Board loading, modal interactions, auth flow                      |
| E2E         | Playwright     | Full sign-up flow, task CRUD, drag-and-drop, multi-user isolation |

### Verification Checklist

- [ ] Create a new account -> see 3 default lists, no tasks
- [ ] Add tasks, edit title/description, mark complete -> refresh -> all state persists
- [ ] Sign out -> sign in with a different account -> see a separate empty board
- [ ] Switch theme -> refresh -> theme persists
- [ ] Drag tasks between lists and reorder lists -> refresh -> order persists
- [ ] Open edit modal -> archive a task -> task disappears from the list
- [ ] Toggle "Archive" in navbar -> archived column appears with the archived task
- [ ] Open archived task's edit modal -> click "Unarchive" -> task returns to first list
- [ ] Delete a task with 2-step confirmation -> task removed permanently
- [ ] Supabase RLS prevents seeing other users' data via direct API calls

---

## 9. Future Considerations

### Short-term (v0.4)

- [ ] Custom list creation / renaming / deletion
- [ ] Responsive design for mobile
- [ ] Batch archive/delete operations

### Medium-term (v0.5)

- [ ] Optimistic UI updates for snappier feel
- [ ] Unit and integration tests (Vitest)
- [ ] Keyboard accessibility for drag-and-drop
- [ ] Real-time sync via Supabase Realtime (multi-tab / multi-device)

### Long-term (v1.0)

- [ ] Task labels, due dates, and priorities
- [ ] Offline support (Service Worker + local queue)
- [ ] E2E tests (Playwright)
- [ ] Accessibility audit (ARIA roles, screen reader support)

---

## 10. AI Workflows

### Development Assistance

| Tool               | Use Case                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Claude Code**    | Architecture decisions, code review, refactoring guidance, documentation generation, debugging sessions |
| **GitHub Copilot** | Inline code completion, boilerplate generation, test scaffolding                                        |

---

## License

MIT
