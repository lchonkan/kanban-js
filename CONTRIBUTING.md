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

| Branch       | Purpose                                        |
|--------------|-------------------------------------------------|
| `main`     | Stable, production-ready code. Deploys via CI.  |
| `develop`    | Integration branch. All features merge here first. |
| `feature/*`  | Short-lived branches for individual features or fixes. |

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

Pushing to `main` triggers the GitHub Pages deployment.

## Local Development

```bash
# Clone and install
git clone https://github.com/<your-username>/kanban-js.git
cd kanban-js
npm install

# Open in browser (no build step needed)
open index.html

# Linting and formatting
npm run lint            # Check for lint errors
npm run lint:fix        # Auto-fix lint errors
npm run format          # Format all files
npm run format:check    # Verify formatting
npm run validate        # Run both lint + format check
```

## Code Style

- **Linting:** ESLint (config in `.eslintrc.json`)
- **Formatting:** Prettier (config in `.prettierrc`)
- Run `npm run validate` before merging to ensure code passes all checks.
