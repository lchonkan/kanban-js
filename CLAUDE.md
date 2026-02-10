# CLAUDE.md

Instructions for Claude Code when working on this project.

## Git Flow

This project uses Git Flow. Always follow this branching model:

```
main          production-ready, deploys to GitHub Pages
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

After the user approves, merge into develop:

```bash
git checkout develop
git merge --no-ff feature/short-description
```

## Project Structure

- `src/app.js` -- Main application (classes, auth routing, UI)
- `src/config.js` -- Supabase client initialization from env vars
- `src/auth.js` -- Auth helpers (signUp, signIn, signOut, onAuthStateChange)
- `src/db.js` -- Data layer (all Supabase CRUD operations)
- `src/toast.js` -- Toast notification system
- `assets/css/app.css` -- All styles including 3 color themes
- `supabase/migration.sql` -- Database schema, RLS policies, seed trigger
- `index.html` -- Vite entry point

## Tech Stack

- **Frontend:** Vanilla JS with ES modules, built with Vite
- **Backend:** Supabase (Postgres + Auth + Row-Level Security)
- **CSS:** Custom properties for 3 themes (dark, light, awesome)
- **CI:** ESLint + Prettier + Vite build check
- **Deploy:** Vite build -> GitHub Pages

## Environment

- `.env` is required (gitignored). Copy `.env.example` to `.env` and fill in credentials.
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_API_KEY`
- `npm run dev` starts the Vite dev server at localhost:5173

## Code Conventions

- ES modules (`import`/`export`) -- no CommonJS
- All user content rendered via `textContent` or safe DOM APIs -- never use `innerHTML` with user data
- Supabase generates all IDs (UUIDs) server-side -- no client-side ID generation
- Database queries must not be awaited inside `onAuthStateChange` callbacks (causes deadlock). Use `setTimeout(fn, 0)` to break out first.
- Run `npm run validate` (lint + format check) before committing.

## Commit Messages

Follow conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
