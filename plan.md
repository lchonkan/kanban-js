# Plan: Supabase Database + Auth Integration

## TL;DR

Migrate the kanban app from in-memory-only state to a **Supabase** backend with **email+password auth** and **Row-Level Security**, so each user gets a private, persisted board. This requires adding **Vite** as a build tool, creating a Supabase project with 3 tables (`profiles`, `lists`, `tasks`), building a login/signup UI, and converting every data mutation point to async Supabase calls. Theme preference will also be persisted per-user. Default lists will be seeded on first sign-up. Online-only for this iteration.

---

## Phase 0 — Prerequisite refactors

1. **Add Vite** — Initialize Vite in the project root. Move `index.html` to serve as Vite's entry point. Convert `assets/js/app.js` to use ES module `import`/`export`. Update `package.json` with `vite` as a dev dependency and add `dev`/`build`/`preview` scripts.

2. **Install `@supabase/supabase-js`** as a runtime dependency via npm.

3. **Create `src/config.js`** — Export the Supabase URL and anon key (these are safe for client-side). Add a `.env` file (gitignored) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and read them via `import.meta.env`.

4. **Replace `Math.random()` IDs** — Let Supabase generate UUIDs server-side (`default gen_random_uuid()`). Remove client-side ID generation in `submitNewTask()`.

5. **Fix `innerHTML` XSS risk** — Replace the `innerHTML` template in the `TaskList` constructor with safe DOM APIs (`createElement` + `textContent`) to prevent XSS now that data comes from a shared database.

6. **Add `position` tracking** — Give every `Task` and `TaskList` a `position` integer so ordering survives persistence. Update drag-and-drop handlers to recalculate positions on drop.

---

## Phase 1 — Supabase project setup

7. **Create Supabase project** — Via the Supabase dashboard. Enable email+password auth (disable email confirmation for dev, enable for prod).

8. **Run the migration SQL** — Create 3 tables with RLS:
   - `profiles` (id UUID FK → auth.users, `theme` text default `'dark'`). Auto-created via a trigger on `auth.users` insert.
   - `lists` (id UUID PK, `user_id` UUID FK, `title`, `position`). RLS policies scoped to `auth.uid()`.
   - `tasks` (id UUID PK, `list_id` UUID FK, `user_id` UUID FK, `title`, `description`, `completed` bool, `position`). RLS policies scoped to `auth.uid()`.

9. **Seed function** — Create a Postgres function `seed_default_lists(user_uuid)` that inserts the 3 default lists for a new user. Call it from the same trigger that creates the profile row.

---

## Phase 2 — Auth UI

10. **Create `src/auth.js`** — A module exporting the Supabase client instance and auth helper functions (`signUp`, `signIn`, `signOut`, `onAuthStateChange`).

11. **Build an auth screen** — Add a login/signup form in `index.html` (or a new `auth.html` section), sitting inside a `#auth-page` div. Contains: email input, password input, "Sign In" button, "Create Account" link that toggles to a sign-up form. Styled using existing CSS variables so it matches the active theme.

12. **Auth state routing** — In `assets/js/app.js`, replace the direct `App.init()` call with an `onAuthStateChange` listener:
    - `INITIAL_SESSION` with session → load the board
    - `INITIAL_SESSION` without session → show auth screen
    - `SIGNED_IN` → load the board
    - `SIGNED_OUT` → clear board, show auth screen

13. **Add sign-out button** — Place it in the nav bar's `.nav-actions` div, next to the existing settings gear.

---

## Phase 3 — Data layer

14. **Create `src/db.js`** — A module with async functions for all CRUD operations:
    - `fetchBoard(userId)` → returns `{ lists, tasks, profile }` in one call
    - `createTask(listId, title, position)` → inserts into `tasks`
    - `updateTask(taskId, fields)` → updates title, description, completed, list_id, position
    - `deleteTask(taskId)`
    - `reorderTasks(listId, taskPositions[])` → batch update positions
    - `reorderLists(listPositions[])` → batch update list positions
    - `updateTheme(theme)` → updates `profiles.theme`

15. **Wire mutations** — Replace each of the 9 in-memory mutation points with calls to `src/db.js`:

    | Current mutation | Wire to |
    |---|---|
    | `TaskList.submitNewTask()` | `db.createTask()` then `addTask()` with the returned UUID |
    | `TaskCardModal.save()` | `db.updateTask()` for title + description |
    | Task check toggle (complete) | `db.updateTask()` for `completed` |
    | `TaskList.removeTask()` | `db.deleteTask()` (not currently exposed in UI, but ready) |
    | Task drag-drop between lists | `db.updateTask()` for `list_id` + `position`, then `db.reorderTasks()` for affected lists |
    | List drag-drop reorder | `db.reorderLists()` |
    | Theme change | `db.updateTheme()` instead of `localStorage` |
    | Board initialization | `db.fetchBoard()` instead of hardcoded `DEFAULT_LISTS` |

16. **Replace hardcoded seed data** — The `Board` constructor currently iterates `DEFAULT_LISTS` and creates 3 `TaskList` instances with dummy tasks. Replace this with an async `loadBoard()` that calls `db.fetchBoard()` and creates `TaskList` + `Task` instances from the returned data.

---

## Phase 4 — Theme persistence via Supabase

17. **Update `ThemeManager`** — On init, read theme from the profile fetched in step 16 instead of `localStorage`. On theme change, call `db.updateTheme()` in addition to applying the CSS attribute. Keep `localStorage` as a fast cache for the initial paint before the Supabase response arrives.

---

## Phase 5 — Error handling & polish

18. **Add loading states** — Show a spinner or skeleton while `fetchBoard()` is in progress.

19. **Add error toasts** — A minimal notification system for failed network requests (e.g., "Failed to save task — please try again").

20. **Add input validation** — Validate email format and password length on the auth form client-side before calling Supabase.

---

## Verification

- Create a new account → see the 3 default lists, no tasks
- Add tasks, edit title/description, mark complete → refresh page → all state persists
- Sign out → sign in with a different account → see a separate empty board (with default lists)
- Switch theme → refresh → theme persists
- Open browser DevTools → Supabase RLS prevents seeing other users' data via direct API calls
- Drag tasks between lists and reorder lists → refresh → order persists

---

## Decisions

- **Vite over bare `<script type="module">`**: enables `import.meta.env`, HMR, and npm dependency resolution
- **Email+Password over Magic Link/Passkey**: Supabase passkeys are MFA-only and alpha-stage; email+password is the simplest proven path
- **Online-only**: no optimistic UI or retry queue in this iteration — errors surface to the user
- **Auto-seed default lists**: `seed_default_lists()` runs via a DB trigger on user creation, so new users see a ready-to-use board
- **`position` integers for ordering**: simple and battle-tested; fractional indexing deferred to a future iteration if needed
- **Keep `localStorage` for theme as cache**: avoids a flash of wrong theme on page load before the Supabase fetch resolves
