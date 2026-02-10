# Software Architecture

Detailed architecture reference for **KAN BAN JS** -- a Vue 3 kanban board with Supabase backend.

---

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                               │
│                                                                      │
│  ┌────────────┐   ┌────────────────┐   ┌──────────────────────────┐ │
│  │ Vue Router  │──▶│  App.vue       │──▶│  Components              │ │
│  │ (hash mode) │   │  (root)        │   │  (Vue 3 SFCs)            │ │
│  └────────────┘   └───────┬────────┘   └────────────┬─────────────┘ │
│                           │                          │               │
│                           ▼                          ▼               │
│                   ┌────────────────┐        ┌──────────────────┐    │
│                   │  Pinia Stores  │◀──────▶│  Pinia Stores    │    │
│                   │  (reactive)    │        │  (reactive)      │    │
│                   └───────┬────────┘        └──────────────────┘    │
│                           │                                          │
│                           ▼                                          │
│                   ┌────────────────┐                                 │
│                   │  Services      │                                 │
│                   │  (pure JS)     │                                 │
│                   └───────┬────────┘                                 │
│                           │                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │ HTTPS
                            ▼
                   ┌────────────────┐
                   │   Supabase     │
                   │  ┌──────────┐  │
                   │  │ Auth     │  │
                   │  ├──────────┤  │
                   │  │ Postgres │  │
                   │  │ + RLS    │  │
                   │  └──────────┘  │
                   └────────────────┘
```

---

## Layer Details

### 1. Routing Layer

```
Vue Router (src/router.js)
│
├── /login          → AuthForm.vue (public)
├── /               → Board page  (requires auth)
│
└── Navigation Guard
     └── Checks authStore.user
         ├── null  → redirect to /login
         └── valid → allow access
```

- Uses **hash history** (`createWebHashHistory`) for GitHub Pages compatibility
- Auth guard runs before each navigation, reading from `authStore`

### 2. Component Tree

```
App.vue
 │
 ├─ [unauthenticated]
 │   └── <router-view>
 │        └── AuthForm.vue
 │             ├── Email + password fields
 │             ├── Client-side validation
 │             └── Toggle sign-in / create-account
 │
 └─ [authenticated]
     └── <router-view>
          └── Board Page (in App.vue)
               │
               ├── AppNavbar.vue
               │    ├── Brand title ("KAN BAN JS")
               │    ├── Archive toggle button ←── boardStore.toggleShowArchived()
               │    ├── Settings gear button  ←── emits 'openSettings'
               │    └── Sign out button       ←── authStore.signOut()
               │
               ├── ThemeSettings.vue (overlay, toggled by navbar)
               │    └── Theme option cards (dark / light / awesome)
               │
               ├── BoardView.vue
               │    │
               │    ├── <draggable> (list reordering)
               │    │    └── TaskListColumn.vue[] (one per regular list)
               │    │         │
               │    │         ├── List header (title, drag handle)
               │    │         ├── <draggable> (task reordering)
               │    │         │    └── TaskCard.vue[] (one per task)
               │    │         │         ├── Completion checkbox
               │    │         │         ├── Task title
               │    │         │         └── Edit button → opens TaskEditModal
               │    │         └── Add task row (input + button)
               │    │
               │    ├── [if showArchived && archivedList has tasks]
               │    │    └── TaskListColumn.vue (readonly, hideAddTask)
               │    │         ├── Title: "Archived"
               │    │         ├── DnD disabled (pull: false, put: false, sort: false)
               │    │         └── No add-task row
               │    │
               │    └── TaskEditModal.vue
               │         ├── Title input
               │         ├── "in <list>" label
               │         ├── Description textarea
               │         └── Footer
               │              ├── [left] Danger actions
               │              │    ├── [default] Archive + Delete buttons
               │              │    └── [confirming] "Delete this task?" + Yes/Cancel
               │              └── [right] Save button
               │
               ├── ToastNotification.vue
               │    └── Error / success toasts (auto-dismiss)
               │
               └── LoadingSpinner.vue (shown during board fetch)
```

### 3. State Management (Pinia Stores)

```
┌─────────────────────────────────────────────────────────┐
│                    auth store                            │
│  State:   user, session, initialized                    │
│  Actions: signIn, signUp, signOut, init                 │
│  Used by: App.vue, AuthForm, AppNavbar, router guard    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    board store                           │
│  State:   lists[], archivedList, showArchived, loading  │
│  Actions:                                               │
│   ├── loadBoard(userId)      Fetch & separate lists     │
│   ├── clearBoard()           Reset all state            │
│   ├── addTask(listId, title) Create task in list        │
│   ├── updateTask(id, fields) Update task fields         │
│   ├── deleteTask(id)         Permanent DB deletion      │
│   ├── archiveTask(id)        Move to __archived__ list  │
│   ├── unarchiveTask(id, to)  Move back to regular list  │
│   ├── toggleShowArchived()   Flip showArchived flag     │
│   ├── toggleTaskComplete(id) Toggle completed status    │
│   ├── reorderTasksInList()   Persist task positions     │
│   ├── moveTask()             Cross-list task move       │
│   └── reorderLists()         Persist list positions     │
│  Used by: BoardView, TaskListColumn, TaskEditModal,     │
│           TaskCard, AppNavbar                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    theme store                           │
│  State:   current                                       │
│  Actions: apply(theme), save(theme)                     │
│  Used by: App.vue, ThemeSettings, board store           │
└─────────────────────────────────────────────────────────┘
```

### 4. Services Layer (Pure Functions)

```
src/services/
│
├── supabase.js
│    └── createClient(url, key) → supabase instance
│
├── auth.js
│    ├── signUp(email, password)
│    ├── signIn(email, password)
│    ├── signOut()
│    ├── getSession()
│    └── onAuthStateChange(callback)
│
└── db.js
     ├── ARCHIVED_LIST_TITLE = '__archived__'  (constant)
     ├── createList(title, position)
     ├── fetchBoard(userId)     → { profile, lists[], tasks[] }
     ├── createTask(listId, title, position)
     ├── updateTask(taskId, fields)
     ├── deleteTask(taskId)
     ├── reorderTasks(listId, positions[])
     ├── reorderLists(positions[])
     └── updateTheme(theme)
```

All service functions are framework-agnostic (no Vue imports). They can be reused with React, Svelte, or any other framework.

---

## Data Flow Diagrams

### Task CRUD Flow

```
Create Task:
  User types title → submitNewTask() → boardStore.addTask()
    → db.createTask() → Supabase INSERT → push to list.tasks[]

Edit Task:
  User opens modal → edits fields → save()
    → boardStore.updateTask() → db.updateTask() → Supabase UPDATE
    → Object.assign(task, fields) in local state

Delete Task (2-step):
  User clicks "Delete" → confirmingDelete = true
  User clicks "Yes, delete" → boardStore.deleteTask()
    → db.deleteTask() → Supabase DELETE → splice from list.tasks[]

Complete Task:
  User clicks checkbox → boardStore.toggleTaskComplete()
    → optimistic toggle → db.updateTask() → rollback on error
```

### Archive Flow

```
Archive:
  User clicks "Archive" in edit modal → boardStore.archiveTask(taskId)
    ├── [if no archivedList] db.createList('__archived__', pos)
    │    → archivedList.value = new list
    ├── db.updateTask(taskId, { list_id: archivedList.id })
    └── splice from source list → push to archivedList.tasks[]

Unarchive:
  User clicks "Unarchive" in edit modal → boardStore.unarchiveTask(taskId)
    ├── db.updateTask(taskId, { list_id: targetList.id })
    └── splice from archivedList.tasks[] → push to targetList.tasks[]

Toggle Visibility:
  User clicks "Archive" button in navbar → boardStore.toggleShowArchived()
    → showArchived.value = !showArchived.value
    → BoardView computed: showArchivedColumn recalculates
    → Archived TaskListColumn renders/hides
```

### Drag-and-Drop Flow

```
Reorder tasks within a list:
  vuedraggable mutates list.tasks[] → onTaskChange(evt.moved)
    → db.reorderTasks(listId, positions)

Move task between lists:
  vuedraggable fires evt.added on target, evt.removed on source
    → db.reorderTasks() for both lists

Reorder lists:
  vuedraggable mutates boardStore.lists[] → onListChange()
    → db.reorderLists(positions)

Note: Archived column has DnD disabled (readonly prop)
  → group: { name: 'tasks', pull: false, put: false }, sort: false
```

---

## Database Schema

```
┌──────────────────────────────────────────────────────────┐
│                    profiles                               │
├──────────────────────────────────────────────────────────┤
│  id       UUID  PK  → auth.users(id)                    │
│  theme    TEXT  default 'dark'                           │
│                                                          │
│  RLS: auth.uid() = id                                    │
└──────────────────────────────────────────────────────────┘
           │ 1
           │
           │ user_id
           ▼ *
┌──────────────────────────────────────────────────────────┐
│                    lists                                  │
├──────────────────────────────────────────────────────────┤
│  id        UUID  PK  (generated)                         │
│  user_id   UUID  FK  → auth.users(id)                    │
│  title     TEXT                                          │
│  position  INT                                           │
│                                                          │
│  RLS: auth.uid() = user_id                               │
│                                                          │
│  Special: title = '__archived__' is the archive list     │
│           (lazily created, at most one per user)          │
└──────────────────────────────────────────────────────────┘
           │ 1
           │
           │ list_id
           ▼ *
┌──────────────────────────────────────────────────────────┐
│                    tasks                                  │
├──────────────────────────────────────────────────────────┤
│  id           UUID   PK  (generated)                     │
│  list_id      UUID   FK  → lists(id)                     │
│  user_id      UUID   FK  → auth.users(id)                │
│  title        TEXT                                        │
│  description  TEXT   nullable                             │
│  completed    BOOL   default false                        │
│  position     INT                                         │
│                                                          │
│  RLS: auth.uid() = user_id                               │
└──────────────────────────────────────────────────────────┘
```

### Auto-Seed Trigger

```
on_auth_user_created (AFTER INSERT on auth.users)
  ├── INSERT INTO profiles (id, theme) VALUES (new.id, 'dark')
  ├── INSERT INTO lists (user_id, title, position)
  │    VALUES (new.id, 'Pendientes', 0)
  ├── INSERT INTO lists (user_id, title, position)
  │    VALUES (new.id, 'En Proceso', 1)
  └── INSERT INTO lists (user_id, title, position)
       VALUES (new.id, 'Finalizadas', 2)
```

---

## CSS Architecture

### Theme System

Three themes controlled via `data-theme` attribute on `<html>`:

```
[data-theme='dark']     Dark background, blue accents (default)
[data-theme='light']    Light background, blue accents
[data-theme='awesome']  Neon synthwave, pink/cyan accents
```

Each theme defines ~60 CSS custom properties covering all UI elements. Theme-specific variables added for the archive/delete feature:

| Variable                     | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `--card-delete-bg`           | Delete button background               |
| `--card-delete-hover-bg`     | Delete button hover state              |
| `--card-archive-bg`          | Archive button background              |
| `--card-archive-hover-bg`    | Archive button hover state             |
| `--card-confirm-label-color` | "Delete this task?" label color (red)  |
| `--archive-toggle-active-bg` | Active state for navbar archive toggle |
| `--archived-column-border`   | Dashed border for archived column      |

### File Organization

All styles live in a single file `assets/css/app.css`:

```
1. Theme definitions (CSS custom properties for dark, light, awesome)
2. Base styles (reset, body, #app)
3. Auth page styles
4. Loading spinner
5. Board page layout
6. Navigation bar
7. Settings overlay
8. Board + list + task styles
9. Drag-and-drop states (ghost, dragging, preview)
10. Add-task row
11. Task card modal (edit, archive, delete, confirmation)
12. Backdrop
13. Toast notifications
```

---

## Security Model

```
┌─────────────────────────────────┐
│         Client (Browser)        │
│                                 │
│  Supabase JS SDK               │
│  ├── JWT stored in localStorage │
│  ├── Auto-refresh on expiry     │
│  └── Sends JWT in every request │
└──────────┬──────────────────────┘
           │ HTTPS + JWT
           ▼
┌─────────────────────────────────┐
│         Supabase                │
│                                 │
│  Auth: Validates JWT            │
│  PostgREST: Applies RLS        │
│                                 │
│  RLS policies:                  │
│  ├── profiles: uid() = id      │
│  ├── lists:    uid() = user_id │
│  └── tasks:    uid() = user_id │
│                                 │
│  Result: Users can ONLY access  │
│  their own data. Period.        │
└─────────────────────────────────┘
```

### XSS Prevention

- Vue's default text interpolation (`{{ }}`) auto-escapes HTML
- No `v-html` is used anywhere in the codebase
- All user input is rendered via `textContent` equivalent

### Delete Safety

- 2-step confirmation prevents accidental permanent deletion
- Archive provides a non-destructive alternative

---

## Build & Deploy Pipeline

```
Developer Machine              GitHub                    GitHub Pages
┌──────────────┐     push     ┌──────────────┐  deploy  ┌──────────┐
│ feature/*    │────────────▶│ CI Pipeline  │─────────▶│ Static   │
│ develop      │              │              │          │ Site     │
│ main         │              │ 1. npm ci    │          │          │
└──────────────┘              │ 2. lint      │          │ dist/    │
                              │ 3. format    │          │ index.html│
                              │ 4. build     │          │ assets/  │
                              └──────────────┘          └──────────┘

CI triggers: push/PR to develop or main
Deploy triggers: push to main only
Secrets: VITE_SUPABASE_URL, VITE_SUPABASE_API_KEY
```

---

## Key Design Decisions

| Decision                                       | Rationale                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Sentinel list for archive** (`__archived__`) | No schema migration needed; uses existing `lists` table; lazy creation avoids empty rows |
| **Separate `archivedList` ref in store**       | Keeps `lists[]` clean for DnD; archived column renders independently                     |
| **2-step delete confirmation**                 | Prevents accidental permanent data loss; pattern is familiar to users                    |
| **Readonly prop on TaskListColumn**            | Reuses the same component; disables DnD via vuedraggable's `group` config                |
| **Services layer is framework-free**           | Pure functions can be tested without Vue; could swap to React/Svelte                     |
| **CSS custom properties for theming**          | No JS runtime cost; instant theme switching; single source of truth                      |
| **Hash routing**                               | Required for GitHub Pages (no server-side routing)                                       |
| **No optimistic updates (yet)**                | Simpler error handling; planned for future version                                       |
