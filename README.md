# Sky Blaster — Polished Arcade Shooter

[![CI](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/ci.yml/badge.svg)](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/ci.yml)
[![Deploy](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/pages.yml/badge.svg)](https://github.com/phaethix/polished-arcade-shooter/actions/workflows/pages.yml)
[![Release](https://img.shields.io/github/v/release/phaethix/polished-arcade-shooter)](https://github.com/phaethix/polished-arcade-shooter/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A browser-native vertical shoot-'em-up built with **React**, **TypeScript**, and **Canvas**. **v0.7.1** ships four game modes, three aircraft with active skills, five weapons, four environmental chapters, and local meta progression (coins, unlocks, achievements).

**[▶ Play online](https://phaethix.github.io/polished-arcade-shooter/)** — no install, runs at 60 fps on desktop and mobile.

For product vision, architecture, and release history, see [docs/WHITEPAPER.md](docs/WHITEPAPER.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Features

- **Four game modes** — Story (20 stages), Endless, Boss Rush, and Daily Challenge
- **Three aircraft** — Falcon, Phantom, and Fortress, each with a unique active skill
- **Five weapons** — Standard, armor-piercing, shotgun, laser, and homing missiles
- **Ten enemy types** — From basics and tanks to splitters, snipers, shielded units, kamikaze, and healers
- **Four chapters** — Deep Space, Asteroid Belt, Enemy Carrier, and Wormhole with environmental hazards
- **Meta progression** — Coins, permanent unlocks, six achievements, and a local top-10 leaderboard
- **Juicy feedback** — Screen shake, particles, shockwave rings, score popups, slow-motion boss kills
- **Procedural audio** — Web Audio API synthesis; no external sound files
- **Dual input** — Keyboard and touch/mouse drag; skill button zone on mobile

---

## Game modes

| Mode                | Goal                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Story**           | Clear 20 stages across 4 chapters; defeat chapter bosses and earn a mission-complete ending              |
| **Endless**         | Survive infinite waves; difficulty and chapter environments rotate every 5 waves                         |
| **Boss Rush**       | Fight consecutive bosses with scaling HP — no filler waves                                               |
| **Daily Challenge** | Same seeded modifier for all players each day (double speed, no power-ups, single HP, or kamikaze swarm) |

---

## Loadout

### Aircraft

| Ship         | Style                | Skill                                             |
| ------------ | -------------------- | ------------------------------------------------- |
| **Falcon**   | Balanced all-rounder | Missile Salvo — homing missiles at nearby enemies |
| **Phantom**  | Fast and fragile     | Dash — short invincible burst                     |
| **Fortress** | Slow and tanky       | Energy Shield — absorbs hits and boosts attacks   |

### Weapons

| Weapon             | Effect                                  |
| ------------------ | --------------------------------------- |
| **Standard**       | Reliable spread-fire blaster (default)  |
| **Armor Piercing** | Rounds pierce through enemies           |
| **Shotgun**        | Wide burst at close range               |
| **Laser**          | Sustained beam; damage ramps while held |
| **Homing**         | Slow missiles that track targets        |

Select aircraft and weapon on the menu before starting. Phantom, Fortress, and alternate weapons unlock with coins earned in runs.

---

## Controls

### In-game

| Action | Keyboard               | Touch / Mouse                      |
| ------ | ---------------------- | ---------------------------------- |
| Move   | `WASD` or `Arrow Keys` | Drag anywhere                      |
| Shoot  | `Space` or `Z` (hold)  | Auto-fire while touching           |
| Bomb   | `X` or `B`             | —                                  |
| Skill  | `C` or `Shift`         | Tap the skill zone (bottom center) |
| Pause  | `Esc` or `P`           | Tap when paused                    |

### Menu

| Key           | Action                                           |
| ------------- | ------------------------------------------------ |
| `↑` / `↓`     | Cycle game mode                                  |
| `←` / `→`     | Cycle aircraft                                   |
| `[` / `]`     | Cycle weapon                                     |
| `U`           | Unlock selected aircraft or weapon (costs coins) |
| `Space` / `Z` | Start game                                       |

Touch: tap the mode, aircraft, and weapon rows to cycle; tap **TAP or PRESS SPACE** to start.

---

## Power-ups

| Icon  | Effect                                                      |
| ----- | ----------------------------------------------------------- |
| **S** | Spread — +1 power level (max 3; more bullets per shot)      |
| **F** | Fire rate — faster shooting                                 |
| **◇** | Shield — blocks one hit (~10 s)                             |
| **B** | Bomb — clears enemy bullets and damages all enemies         |
| **+** | Heal — +1 HP, or +500 score if already full                 |
| **W** | Weapon — swap to the dropped weapon for the rest of the run |

---

## Enemies

| Type         | Behavior                                 | Base score |
| ------------ | ---------------------------------------- | ---------- |
| **Basic**    | Standard patterns                        | 100        |
| **Fast**     | Quick, erratic movement                  | 150        |
| **Tank**     | High HP, slow                            | 300        |
| **Splitter** | Spawns mini enemies on death             | 220        |
| **Sniper**   | Long-range aimed shots                   | 350        |
| **Shielded** | Frontal immunity                         | 280        |
| **Kamikaze** | Rushes the player and explodes           | 180        |
| **Healer**   | Heals nearby enemies                     | 400        |
| **Mini**     | Small splitter spawn                     | 75         |
| **Boss**     | Appears on boss waves / story milestones | 2000       |

---

## Scoring & progression

| Mechanic         | Detail                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| **Combo**        | Chain kills within 1.5 s; every 5 combo adds +50% score multiplier                             |
| **Graze**        | Fly near enemy bullets (not hitting) for +10 points each                                       |
| **Coins**        | Earned from kills, bosses, story clears, and daily milestones; spent on unlocks                |
| **Achievements** | Six goals (first kill, 20× combo, 50 grazes, 10 boss kills lifetime, wave 10, no-damage stage) |
| **High scores**  | Top 10 saved locally with wave and date                                                        |

---

## Tech stack

- **React 19** — UI shell and game loop host
- **TypeScript** — Type-safe game logic
- **Vite** — Build tool; single-file production output for GitHub Pages
- **Tailwind CSS 4** — Full-screen layout
- **Canvas 2D** — Rendering, particles, and HUD
- **Web Audio API** — Procedural sound effects

---

## Getting started

### Prerequisites

- Node.js 18+ (CI uses Node 24)
- npm

### Installation

```bash
git clone https://github.com/phaethix/polished-arcade-shooter.git
cd polished-arcade-shooter
npm install
npm run dev
```

### Scripts

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the Vite development server     |
| `npm run build`     | Build the production bundle           |
| `npm run preview`   | Preview the production build locally  |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run lint`      | Run ESLint on all source files        |
| `npm run format`    | Format all files with Prettier        |
| `npm run test:run`  | Run unit tests once (CI mode)         |
| `npm test`          | Run unit tests in watch mode          |

### Play online (GitHub Pages)

Deployed automatically when changes land on `main`:

**https://phaethix.github.io/polished-arcade-shooter/**

If deployment fails with a `404`, enable Pages once: **Settings → Pages → Source → GitHub Actions**, then re-run the deploy workflow.

### Project structure

```text
src/
├── App.tsx           # React shell — game loop and input wiring
├── app/input.ts      # Keyboard / touch input state
└── game/             # Game domain (engine, render, modes, progress, …)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full module tree.

### Documentation

| Document                                      | Description                                  |
| --------------------------------------------- | -------------------------------------------- |
| [WHITEPAPER.md](docs/WHITEPAPER.md)           | Product vision, systems, and release history |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)       | Source layout and module responsibilities    |
| [GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md) | Branch naming and commit format              |
| [roadmap.md](.issue/roadmap.md)               | Expansion phases (complete) and backlog      |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md) before opening a pull request.

- Git workflow: branch naming and [Conventional Commits](https://www.conventionalcommits.org/) are enforced in CI
- Bug reports: [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- Feature ideas: [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- Security: [SECURITY.md](SECURITY.md)

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgments

Inspired by classic vertical shooters such as _Raiden_, _1942_, and _Touhou_.
