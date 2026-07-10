# Contributing to Sky Blaster

Thank you for your interest in contributing. This project is a browser-based arcade shooter built with React, TypeScript, Vite, and Canvas.

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Before opening a pull request, run:

   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm run test:run
   npm run build
   ```

## Development guidelines

- Keep changes focused and easy to review.
- Match the existing code style and naming conventions.
- Prefer small, readable functions over large refactors unless discussed first.
- Avoid adding external assets unless there is a clear reason; the project currently uses procedural audio and canvas rendering.
- Update documentation when behavior, controls, or setup steps change.

## Linting and formatting

Code quality is enforced by **ESLint** and formatting by **Prettier**. Both run in CI.

```bash
npm run lint          # check for lint errors
npm run lint:fix      # auto-fix lint errors
npm run format        # format all files with Prettier
npm run format:check  # verify formatting (CI uses this)
```

- Prettier config lives in `.prettierrc` — single quotes, semicolons, 2-space indent, 100 char width.
- ESLint uses the flat config in `eslint.config.js` with `@typescript-eslint` recommended rules.
- Unused parameters prefixed with `_` (e.g. `_chapter`) are allowed.

## Testing

Unit tests run on [Vitest](https://vitest.dev/) in a Node environment — no browser or DOM required.

### Running tests

```bash
npm test          # watch mode (re-runs on file change)
npm run test:run  # single run (used in CI)
```

### Adding tests

- Co-locate test files next to the source: `foo.ts` → `foo.test.ts`.
- Test **pure functions** first — collision helpers, mode logic, scoring, and spawn pools are ideal candidates.
- Import Vitest APIs explicitly: `import { describe, it, expect } from "vitest"`.
- For modules that touch `localStorage`, mock it with `vi.stubGlobal("localStorage", …)` in a `beforeEach` hook.

### What to avoid

- Do not test rendering or Canvas drawing — those are verified by manual play-testing.
- Do not test the React shell or input wiring in unit tests.

## Project layout

```text
src/
├── App.tsx           # React shell, input handling, game loop
├── game/
│   ├── engine.ts     # Core gameplay, rendering, persistence
│   ├── types.ts      # Shared TypeScript interfaces
│   └── audio.ts      # Web Audio sound effects
├── index.css         # Global styles
└── main.tsx          # Application entry point
```

## Git conventions

This project uses documented and enforced Git conventions for branch names and commit messages.

Read [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md) before opening a pull request. In short:

- Branch format: `<type>/<short-description>` (example: `feature/mobile-touch-fix`)
- Commit format: [Conventional Commits](https://www.conventionalcommits.org/) (example: `feat(game): add shield power-up`)
- Pull request titles should follow the same commit format
- Prefer squash merges to keep `main` history clean

Local commit messages are checked by a Husky hook after `npm install`. Pull requests are checked by GitHub Actions.

## Pull requests

1. Create a branch from `main` using the naming rules in [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md).
2. Write Conventional Commit messages for every commit.
3. Fill out the pull request template completely.
4. Confirm the game still runs locally and that CI checks pass.

## Reporting issues

Use the GitHub issue templates for bugs and feature requests. Include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser/device information
- Screenshots or console output when helpful

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Questions

For open-ended questions or design discussions, prefer [GitHub Discussions](https://github.com/phaethix/polished-arcade-shooter/discussions).
