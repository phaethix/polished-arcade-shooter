# Sky Blaster — Architecture Guide

This document describes how the `src/` tree is organized after the v0.7.x architecture split. For product context, see [WHITEPAPER.md](./WHITEPAPER.md).

## Layered layout

```text
src/
├── App.tsx                 React shell — RAF loop, input wiring, canvas sizing
├── app/
│   └── input.ts            Mutable input state (keyboard + touch/mouse)
└── game/
    ├── engine.ts           Game loop orchestrator (update, collisions, state machine)
    ├── types.ts            Shared interfaces
    ├── core/
    │   ├── constants.ts    Canvas size, player bounds, combo/graze tuning
    │   └── collision.ts    AABB overlap helper
    ├── effects.ts            Particles, screen shake, score popups
    ├── storage/
    │   └── highscores.ts   localStorage high-score persistence
    ├── render/
    │   ├── menu.ts         Title screen and loadout selection
    │   ├── hud.ts          In-game HUD (HP, score, skills)
    │   ├── gameover.ts     End-of-run screen
    │   ├── achievement-toast.ts
    │   ├── world.ts        Player, bullets, power-ups, laser beam
    │   └── overlays.ts     Particles, flash, combo, pause, slow-mo
    ├── aircraft.ts         Aircraft stats and visuals
    ├── weapons.ts          Firing patterns and weapon config
    ├── skills.ts           Active abilities per aircraft
    ├── enemies.ts          Spawn logic, AI, rendering
    ├── chapters.ts         Background themes and chapter rotation
    ├── hazards.ts          Environmental threats per chapter
    ├── modes.ts            Per-mode wave rules and daily modifiers
    ├── progress.ts         Coins, unlocks, achievements
    └── audio.ts            Synthesized sound effects
```

## Dependency rules

1. **`engine.ts` is the hub** — it imports domain modules and render helpers; domain modules must not import `engine.ts`.
2. **Render modules are pure drawing** — they receive `CanvasRenderingContext2D` and read-only game state; they do not mutate `GameData` or advance simulation.
3. **`app/` is outside the game domain** — input collection lives next to `App.tsx` so the game package stays testable without React.
4. **Data modules stay side-effect free** — `aircraft.ts`, `weapons.ts`, `chapters.ts`, and `modes.ts` export config and pure helpers only.

## Runtime flow

```text
App.tsx (RAF)
  ├─ inputRef  ← keyboard / pointer handlers
  ├─ update() or updateBackground()  ← engine.ts
  └─ render()  ← engine.ts
        ├─ chapters / hazards / enemies (domain draw)
        └─ render/* (UI and overlays)
```

`GameData` is a single mutable struct passed through update and render. Mode-specific behavior is resolved at runtime via `gameMode` and helpers in `modes.ts`.

## What still lives in `engine.ts`

The orchestrator intentionally retains:

- State machine transitions (`menu` → `playing` → `paused` / `gameover`)
- Wave spawning and collision resolution
- Power-up pickup, combo/graze scoring, achievement triggers
- Menu selection cycling and unlock actions

Future splits (only if `engine.ts` grows again): dedicated `collision-system.ts`, `wave-spawner.ts`, or `menu-actions.ts`.

## Known tech debt

| Item                            | Notes                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine.ts` size                | Reduced from ~1350 lines; still the largest file because collisions and wave logic remain centralized.                                                              |
| Enemy rendering in `enemies.ts` | Enemy sprites stay with spawn/AI; only player-side world drawing moved to `render/world.ts`.                                                                        |
| Test coverage                   | Vitest unit tests cover pure functions in `core/`, `modes`, `enemies`, `weapons`, `progress`, and `chapters`. Integration and rendering tests remain a future goal. |

## Related documents

| Document                                   | Role                                      |
| ------------------------------------------ | ----------------------------------------- |
| [WHITEPAPER.md](./WHITEPAPER.md)           | Product and high-level technical overview |
| [GIT_CONVENTIONS.md](./GIT_CONVENTIONS.md) | Commit and branch workflow                |
