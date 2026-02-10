# Contributing to KAN BAN JS

## Git Flow

This project uses a simplified Git Flow branching model:

```
main          production-ready, deploys to GitHub Pages
  |
develop         integration branch, receives feature merges
  |
feature/*       individual feature or fix branches
```

### Branches

| Branch      | Purpose                                                |
| ----------- | ------------------------------------------------------ |
| `main`      | Stable, production-ready code. Deploys via CI.         |
| `develop`   | Integration branch. All features merge here first.     |
| `feature/*` | Short-lived branches for individual features or fixes. |

## Workflow

### 1. Start a new feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. Work on your feature

Make commits on your feature branch. Keep commits focused and descriptive.

### 3. Merge into develop

Once your feature is complete:

```bash
git checkout develop
git pull origin develop
git merge --no-ff feature/my-feature
```

The `--no-ff` flag preserves the feature branch history in the merge commit.

### 4. Release to production

When `develop` is stable and ready for release:

```bash
git checkout main
git pull origin main
git merge --no-ff develop
git push origin main
```

Pushing to `main` triggers the Vite build and GitHub Pages deployment.

## Local Development

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (see [README > Supabase Setup](README.md#2-supabase-setup))

### Setup

```bash
# Clone and install
git clone https://github.com/<your-username>/kanban-js.git
cd kanban-js
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Start dev server
npm run dev
```

### Available Scripts

```bash
npm run dev           # Start Vite dev server with HMR
npm run build         # Production build to dist/
npm run preview       # Preview the production build
npm run lint          # Check for lint errors
npm run lint:fix      # Auto-fix lint errors
npm run format        # Format all files
npm run format:check  # Verify formatting
npm run validate      # Run both lint + format check
```

## Code Style

- **Linting:** ESLint (config in `.eslintrc.json`)
- **Formatting:** Prettier (config in `.prettierrc`)
- **Modules:** ES modules (`import`/`export`) -- `sourceType: "module"` in ESLint
- Run `npm run validate` before merging to ensure code passes all checks.

## Project Structure

```
src/
├── app.js          Main application (classes, auth routing, UI)
├── config.js       Supabase client initialization
├── auth.js         Authentication helper functions
├── db.js           Data layer (all Supabase CRUD operations)
└── toast.js        Toast notification system
```

All source code lives in `src/`. Styles are in `assets/css/app.css`. The Supabase migration SQL is in `supabase/migration.sql`.
