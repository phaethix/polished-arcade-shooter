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
   npm run build
   ```

## Development guidelines

- Keep changes focused and easy to review.
- Match the existing code style and naming conventions.
- Prefer small, readable functions over large refactors unless discussed first.
- Avoid adding external assets unless there is a clear reason; the project currently uses procedural audio and canvas rendering.
- Update documentation when behavior, controls, or setup steps change.

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

## Pull requests

1. Create a feature branch from `main`.
2. Make your changes with clear commit messages.
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
