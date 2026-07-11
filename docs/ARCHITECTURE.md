# Sky Blaster — Architecture Guide

This document describes how the `src/` tree is organized after the v0.7.x architecture split. For product context, see [WHITEPAPER.md](./WHITEPAPER.md).

## Layered layout

```text
src/
├── App.tsx                 React shell — canvas sizing, wires hooks
├── app/
│   ├── input.ts            Mutable input state (keyboard + touch/mouse)
│   ├── use-game-loop.ts    RAF fixed-timestep loop
│   ├── use-keyboard-input.ts
│   ├── use-pointer-input.ts
│   └── menu-touch.ts       Title-screen hit targets
└── game/
    ├── engine.ts           Orchestrator (update, render, state machine, menu)
    ├── combat.ts           Damage, kills, bombs, laser fire
    ├── player-factory.ts   Player ship construction
    ├── run-progress.ts     Achievements, coins, wave-clear rewards
    ├── run-stats.ts        Accuracy / damage / kills helpers for game over
    ├── systems/
    │   ├── player-controller.ts  Movement, shooting, skills
    │   ├── wave-spawner.ts       Wave timers and enemy spawning
    │   ├── bullet-system.ts      Bullet motion, homing, culling
    │   ├── collision-system.ts   Graze, hits, hazards
    │   ├── power-up-system.ts    Pickup handling
    │   └── ambient-system.ts     Particles, combo, stars, shake decay
    ├── types.ts            Shared interfaces
    ├── core/
    │   ├── constants.ts    Canvas size, player bounds, combo/graze tuning
    │   ├── collision.ts    AABB overlap helper
    │   └── rng.ts          Seeded mulberry32 RNG (`createRng`)
    ├── effects.ts          Particles, screen shake, score popups
    ├── storage/
    │   └── highscores.ts   localStorage high-score persistence
    ├── render/
    │   ├── menu.ts         Title screen and loadout selection
    │   ├── menu-layout.ts  Menu row geometry / hit zones
    │   ├── hud.ts          In-game HUD (HP, score, skills, AUTO/INV)
    │   ├── gameover.ts     End-of-run screen (+ run stats)
    │   ├── achievement-toast.ts
    │   ├── world.ts        Player, bullets, power-ups, laser beam
    │   ├── overlays.ts     Particles, flash, combo, pause, slow-mo
    │   └── enemies.ts      Enemy sprite rendering (drawEnemy)
    ├── aircraft.ts         Aircraft stats and visuals
    ├── weapons.ts          Firing patterns and weapon config
    ├── skills.ts           Active abilities + homing bullet steering
    ├── enemies/
    │   ├── index.ts        Public barrel (spawn, AI, helpers)
    │   ├── spawn.ts        Spawn pool, enemy construction, splitter children
    │   ├── ai.ts           Per-tick enemy movement and shooting AI
    │   ├── boss.ts         Chapter → boss pattern mapping and accents
    │   ├── boss-ai.ts      Fan / rain / broadside / ring fire
    │   ├── helpers.ts      Shield-block and kamikaze-blast pure helpers
    │   └── constants.ts    Enemy tuning constants
    ├── chapters.ts         Background themes and chapter rotation
    ├── hazards.ts          Environmental threats per chapter
    ├── modes.ts            Per-mode wave rules, difficulty, daily modifiers
    ├── progress.ts         Coins, unlocks, achievements
    └── audio.ts            Synthesized sound effects
```

## Dependency rules

1. **`engine.ts` is the hub** — it imports domain modules and render helpers; domain modules must not import `engine.ts`.
2. **Render modules are pure drawing** — they receive `CanvasRenderingContext2D` and read-only game state; they do not mutate `GameData` or advance simulation.
3. **`app/` is outside the game domain** — input collection lives next to `App.tsx` so the game package stays testable without React.
4. **Data modules stay side-effect free** — `aircraft.ts`, `weapons.ts`, `chapters.ts`, and `modes.ts` export config and pure helpers only.
5. **Gameplay RNG** — seeded via `GameData.rng` (`core/rng.ts`); cosmetics may still use `Math.random()`.

## Runtime flow

```text
App.tsx
  ├─ useKeyboardInput / usePointerInput → inputRef
  ├─ useGameLoop → update() / updateBackground() / render()  ← engine.ts
  └─ canvas
        ├─ chapters / hazards / render/enemies
        └─ render/* (HUD, menu, overlays, game over)
```

`GameData` is a single mutable struct passed through update and render. Mode-specific behavior is resolved at runtime via `gameMode` and helpers in `modes.ts`.

## What still lives in `engine.ts`

The orchestrator intentionally retains:

- State machine transitions (`menu` → `playing` → `paused` / `gameover`)
- Menu selection cycling, unlock actions, and `resetGame`
- Delegation to `systems/*` for per-tick simulation

Combat helpers live in `combat.ts`; run rewards and achievements in `run-progress.ts`; post-run stats helpers in `run-stats.ts`.

## Known tech debt

| Item                                   | Notes                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.ts` size                       | Reduced to ~280 lines; simulation logic lives in `systems/` and `combat.ts`.                                                          |
| Enemy rendering in `render/enemies.ts` | Enemy sprite drawing lives in `render/`, separate from spawn/AI/boss fire in `enemies/`.                                              |
| Test coverage                          | Vitest covers `core/`, `modes`, `enemies` (incl. boss), `weapons`, `progress`, `chapters`, `run-stats`, menu layout. Integration TBD. |

## Related documents

| Document                                   | Role                                      |
| ------------------------------------------ | ----------------------------------------- |
| [WHITEPAPER.md](./WHITEPAPER.md)           | Product and high-level technical overview |
| [PLAYER_GUIDE.md](./PLAYER_GUIDE.md)       | Controls, modes, enemies, scoring         |
| [GIT_CONVENTIONS.md](./GIT_CONVENTIONS.md) | Commit and branch workflow                |
