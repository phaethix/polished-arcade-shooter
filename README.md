# Sky Blaster

> A browser-native vertical shoot-'em-up with four game modes, loadout depth, local meta progression, and procedural audio — built with React, TypeScript, and Canvas 2D.

[![CI](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/ci.yml/badge.svg)](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/ci.yml)
[![Deploy](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/pages.yml/badge.svg)](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/pages.yml)
[![Release](https://img.shields.io/github/v/release/phaethix/polished-arcade-shooter)](https://github.com/phaethix/polished-arcade-shooter/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](package.json)

**[Play online](https://phaethix.github.io/polished-arcade-shooter/)** · [Player guide](docs/PLAYER_GUIDE.md) · [Report a bug](https://github.com/phaethix/polished-arcade-shooter/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/phaethix/polished-arcade-shooter/issues/new?template=feature_request.yml)

No install required for the live demo. Runs at 60 fps on desktop and mobile (keyboard or touch).

---

## Overview

Sky Blaster (_polished-arcade-shooter_) is an open-source arcade shooter you can play instantly in the browser or run locally for development. The game ships as a single static page on GitHub Pages — no backend, no asset downloads, offline-capable progression via `localStorage`.

The codebase is structured for incremental feature growth: a thin React shell hosts a fixed-timestep Canvas game loop, with typed domain modules for combat, modes, and meta progression.

---

## Highlights

|                 |                                                               |
| --------------- | ------------------------------------------------------------- |
| **Modes**       | Story (20 stages), Endless, Boss Rush, Daily Challenge        |
| **Loadout**     | 3 aircraft with active skills · 5 weapons                     |
| **Difficulty**  | Easy / Normal / Hard — speed, HP, spawn rate, starting HP     |
| **World**       | 4 chapters with environmental hazards · 10 enemy archetypes   |
| **Progression** | Coins, unlocks, 6 achievements, local top-10 leaderboard      |
| **Tech**        | Canvas 2D rendering · Web Audio synthesis · Vitest unit tests |

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (CI uses Node 24)
- npm

### Run locally

```bash
git clone https://github.com/phaethix/polished-arcade-shooter.git
cd polished-arcade-shooter
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

### Verify changes

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:run
npm run build
```

---

## How to play

1. Open the **[live demo](https://phaethix.github.io/polished-arcade-shooter/)** or run `npm run dev`.
2. On the title screen, choose **mode**, **aircraft**, **weapon**, and **difficulty**.
3. **Move** with WASD / arrow keys (or drag on touch). **Shoot** with Space / Z (auto-fire on touch).
4. Use **bombs** (`X` / `B`), **skills** (`C` / `Shift` or the on-screen skill zone), and power-ups to survive waves and bosses.

Full control reference, enemy tables, and scoring rules: **[docs/PLAYER_GUIDE.md](docs/PLAYER_GUIDE.md)**.

---

## Development

### npm scripts

| Command                           | Description                                 |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | Start Vite dev server                       |
| `npm run build`                   | Production build                            |
| `npm run build:pages`             | Build for GitHub Pages (single-file output) |
| `npm run preview`                 | Preview production build                    |
| `npm run typecheck`               | TypeScript check (`tsc --noEmit`)           |
| `npm run lint` / `lint:fix`       | ESLint                                      |
| `npm run format` / `format:check` | Prettier                                    |
| `npm test` / `test:run`           | Vitest (watch / single run)                 |

### Project structure

```text
src/
├── main.tsx              # Vite entry
├── index.css             # Tailwind global styles
├── App.tsx               # React shell — game loop and input wiring
├── app/
│   └── input.ts          # Keyboard / touch state
└── game/
    ├── engine.ts         # Update loop, collisions, state machine
    ├── types.ts          # Shared interfaces
    ├── core/             # Constants, collision helpers
    ├── storage/          # High-score persistence
    ├── render/           # Menu, HUD, overlays, game-over, world
    ├── modes.ts          # Modes, difficulty, wave rules
    ├── enemies.ts        # Spawn logic, AI
    ├── weapons.ts        # Firing patterns
    ├── skills.ts         # Active abilities
    ├── aircraft.ts       # Ship stats
    ├── chapters.ts       # Chapter themes
    ├── hazards.ts        # Environmental threats
    ├── progress.ts       # Coins, unlocks, achievements
    ├── effects.ts        # Particles, screen shake
    ├── audio.ts          # Procedural SFX
    └── *.test.ts         # Co-located Vitest suites
```

Module boundaries and dependency rules: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

### Tech stack

| Layer     | Choice                                |
| --------- | ------------------------------------- |
| UI        | React 19                              |
| Language  | TypeScript 5.9 (strict)               |
| Build     | Vite 7 + single-file plugin for Pages |
| Rendering | Canvas 2D                             |
| Styling   | Tailwind CSS 4 (page chrome only)     |
| Audio     | Web Audio API                         |
| Tests     | Vitest                                |
| Quality   | ESLint, Prettier, commitlint, Husky   |

---

## Documentation

| Document                                      | Description                               |
| --------------------------------------------- | ----------------------------------------- |
| [PLAYER_GUIDE.md](docs/PLAYER_GUIDE.md)       | Controls, modes, enemies, scoring         |
| [WHITEPAPER.md](docs/WHITEPAPER.md)           | Product vision, systems, release history  |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)       | Source layout and module responsibilities |
| [GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md) | Branch naming and commit format           |
| [CONTRIBUTING.md](CONTRIBUTING.md)            | Setup, testing, and pull request workflow |
| [roadmap.md](.issue/roadmap.md)               | Expansion phases and backlog              |

---

## Contributing

Contributions are welcome. This repository follows the [GitHub community standards](https://github.com/phaethix/polished-arcade-shooter/community) for healthy open source projects.

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md).
2. Fork the repo and create a branch (`feat/…`, `fix/…`, etc.).
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
4. Open a pull request using the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
5. Ensure CI passes (`typecheck`, `lint`, `format:check`, `test:run`, `build`).

| Resource         | Link                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Bug reports      | [New issue](https://github.com/phaethix/polished-arcade-shooter/issues/new?template=bug_report.yml)      |
| Feature requests | [New issue](https://github.com/phaethix/polished-arcade-shooter/issues/new?template=feature_request.yml) |
| Questions        | [GitHub Discussions](https://github.com/phaethix/polished-arcade-shooter/discussions)                    |
| Security         | [SECURITY.md](SECURITY.md)                                                                               |
| Code of conduct  | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)                                                                 |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

Inspired by classic vertical shooters including _Raiden_, _1942_, and _Touhou_.
