# Git Conventions

This document defines the Git workflow for this repository. Following these rules keeps history readable and makes reviews, changelogs, and automation easier for the whole team.

## Branch strategy

- `main` is the default branch and should always stay deployable.
- Do all work on short-lived branches created from the latest `main`.
- Open a pull request early when possible; avoid long-lived branches that drift from `main`.
- Delete feature branches after merge.

### Stacked feature branches

For large features, split work into **dependent branches** and merge them in order:

```text
main
 └── feature/expansion-foundation    # types, config, menu picker
      └── feature/skill-framework    # shared skill system
           └── feature/falcon-missile-salvo
                └── feature/phantom-dash
                     └── feature/fortress-energy-shield
```

Guidelines:

- Branch each slice from the previous slice (not from stale `main`) when work depends on it.
- Open pull requests **bottom-up** (foundation first, then skills one by one).
- Keep each branch small enough to review in under 30 minutes.
- Rebase onto `main` only after upstream PRs merge, or retarget PRs to the previous branch until merge.

Current expansion work uses this pattern under `.issue/roadmap.md`.

## Branch naming

Use this format:

```text
<type>/<short-description>
```

### Allowed types

| Type       | Use for                                         |
| ---------- | ----------------------------------------------- |
| `feature`  | New gameplay, UI, or product behavior           |
| `fix`      | Bug fixes                                       |
| `docs`     | Documentation-only changes                      |
| `chore`    | Tooling, housekeeping, non-product code         |
| `refactor` | Code structure changes without behavior changes |
| `ci`       | CI/CD workflow changes                          |
| `test`     | Test additions or updates                       |
| `hotfix`   | Urgent fixes targeting `main`                   |

### Rules

- Use lowercase letters, numbers, and hyphens only.
- Keep names short and descriptive.
- Prefer nouns over ticket IDs alone.

### Examples

```text
feature/boss-attack-patterns
fix/mobile-touch-input
docs/git-conventions
chore/update-dependencies
refactor/engine-collision-loop
ci/add-commitlint
```

### Invalid examples

```text
my-branch
Feature/NewBoss
fix_bug
feature/
```

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Allowed commit types

| Type       | Use for                                    |
| ---------- | ------------------------------------------ |
| `feat`     | A new feature                              |
| `fix`      | A bug fix                                  |
| `docs`     | Documentation only                         |
| `style`    | Formatting, whitespace, no logic change    |
| `refactor` | Refactoring without feature or bug changes |
| `perf`     | Performance improvements                   |
| `test`     | Adding or updating tests                   |
| `build`    | Build system or dependency changes         |
| `ci`       | CI configuration changes                   |
| `chore`    | Other maintenance tasks                    |
| `revert`   | Reverting a previous commit                |

### Scope (optional)

Use a scope when it helps reviewers understand the area of change:

- `game` — engine, enemies, waves, scoring
- `ui` — React shell, canvas, input
- `audio` — sound effects
- `docs` — documentation
- `deps` — dependency updates

### Subject rules

- Use the imperative mood: `add`, `fix`, `update`, not `added` or `fixes`.
- Do not capitalize the first word.
- Do not end with a period.
- Keep the header at or under 72 characters.

### Examples

```text
feat(game): add zigzag movement for fast enemies

fix(ui): correct canvas scaling on high-DPR displays

docs: document git branch and commit conventions

chore(deps): bump vite to 7.3.2
```

### Breaking changes

If a change breaks existing behavior, add `BREAKING CHANGE:` in the footer or append `!` after the type/scope:

```text
feat(game)!: replace local storage key for high scores
```

## Pull requests

- Branch from the latest `main`.
- Keep pull requests focused on one topic when possible.
- Use a PR title that follows the same Conventional Commit format as commit messages.
- Fill out the pull request template completely.
- Rebase or update your branch before merge if `main` has moved forward.
- Prefer **Squash and merge** so each pull request becomes one clean commit on `main`.

## Local enforcement

After `npm install`, Git hooks are installed automatically through Husky.

- The `commit-msg` hook validates commit messages with Commitlint.
- Fix invalid messages locally before pushing to avoid CI failures.

Manual check:

```bash
echo "feat(game): add shield power-up" | npx commitlint
```

## CI enforcement

Pull requests to `main` are checked automatically:

1. Branch name must match the allowed pattern.
2. Every commit in the pull request must follow Conventional Commits.

Dependabot branches are exempt from branch-name checks.

## Recommended workflow

```bash
git checkout main
git pull origin main
git checkout -b feature/my-change

# make changes
npm run typecheck
npm run build

git add .
git commit -m "feat(game): describe the change"
git push -u origin feature/my-change
```

Then open a pull request on GitHub.
