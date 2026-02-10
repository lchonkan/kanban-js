# CLAUDE.md

Instructions for Claude Code when working on this project.

## Git Flow

This project uses Git Flow. Always follow this branching model:

```
main          production-ready
  |
develop       integration branch, all features merge here first
  |
feature/*     short-lived branches for individual features or fixes
```

### Rules

- **Never commit directly to `main` or `develop`.**
- Always create a `feature/*` branch from `develop` for new work.
- Merge features into `develop` with `--no-ff` to preserve branch history.
- Only merge `develop` into `main` when the user explicitly asks for a release.
- Never force-push to `main` or `develop`.

### Starting work

```bash
git checkout develop
git pull origin develop
git checkout -b feature/short-description
```

### Finishing work

When work is ready, push the feature branch and open a PR **before** merging:

```bash
git push origin feature/short-description
gh pr create --base develop --head feature/short-description
```

Only merge into `develop` after the user approves the PR:

```bash
git checkout develop
git merge --no-ff feature/short-description
```

### Releasing to main

When the user asks for a release, create a PR from `develop` to `main` first:

```bash
gh pr create --base main --head develop
```

Only merge after the user approves. Never merge directly without a PR.

## Project Structure

```
src/
├── main.js                   Vue app bootstrap + Pinia + Router
├── App.vue                   Root component (auth routing, layout)
├── router.js                 Vue Router (login vs board routes, auth guard)
├── stores/
│   ├── auth.js               Pinia store — auth state + actions
│   ├── board.js              Pinia store — lists, tasks, archive, CRUD actions
│   └── theme.js              Pinia store — theme state + persistence
├── services/
│   ├── supabase.js           Supabase client init (env vars)
│   ├── auth.js               Auth API calls (pure functions, no Vue dependency)
│   └── db.js                 Data API calls + ARCHIVED_LIST_TITLE constant
├── components/
│   ├── AppNavbar.vue         Top nav (title, archive toggle, settings gear, sign-out)
│   ├── AuthForm.vue          Login/signup form with validation
│   ├── BoardView.vue         Board container with vuedraggable for list reordering + archived column
│   ├── TaskListColumn.vue    Single kanban column with vuedraggable for task DnD (supports readonly mode)
│   ├── TaskCard.vue          Individual task card (check, title, edit btn)
│   ├── TaskEditModal.vue     Modal for editing task title/description, archive, and delete (with confirmation)
│   ├── ThemeSettings.vue     Theme picker overlay
│   ├── LoadingSpinner.vue    Loading state
│   └── ToastNotification.vue Toast messages
assets/css/
└── app.css                   All styles including 3 color themes (CSS custom properties)
supabase/
└── migration.sql             Database schema, RLS policies, seed trigger
docs/
└── ARCHITECTURE.md           Detailed software architecture diagram
index.html                    Vite entry point
```

## Tech Stack

- **Frontend:** Vue 3 (Composition API) + Pinia + Vue Router, built with Vite
- **Drag-and-Drop:** vuedraggable (SortableJS wrapper)
- **Backend:** Supabase (Postgres + Auth + Row-Level Security)
- **CSS:** Custom properties for 3 themes (dark, light, awesome)
- **CI:** ESLint (with eslint-plugin-vue) + Prettier + Vite build check

## Architecture

- **Services layer** (`src/services/`) contains pure JS functions that call Supabase. No Vue dependency — can be reused with any framework.
- **Pinia stores** (`src/stores/`) hold reactive state and call services. Components read from stores.
- **Components** (`src/components/`) are Vue SFCs. They read from stores and emit events upward.

### Archive System

- Archived tasks live in a special list with the sentinel title `__archived__` (constant `ARCHIVED_LIST_TITLE` in `db.js`).
- The archived list is lazily created on first archive — no schema migration needed.
- The board store separates the archived list from regular lists during `loadBoard`.
- The archived column is toggled via an "Archive" button in the navbar and renders as a readonly, non-draggable column.

## Environment

- `.env` is required (gitignored). Copy `.env.example` to `.env` and fill in credentials.
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_API_KEY`
- `npm run dev` starts the Vite dev server at localhost:5173

## Code Conventions

- ES modules (`import`/`export`) -- no CommonJS
- Vue 3 Composition API with `<script setup>` -- no Options API
- All user content rendered via `textContent` or Vue's default text interpolation (auto-escaped) -- never use `v-html` with user data
- Supabase generates all IDs (UUIDs) server-side -- no client-side ID generation
- Database queries must not be awaited inside `onAuthStateChange` callbacks (causes deadlock). Use `setTimeout(fn, 0)` to break out first. This is handled in `App.vue`'s watcher.
- Run `npm run validate` (lint + format check) before committing.

## Commit Messages

Follow conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
