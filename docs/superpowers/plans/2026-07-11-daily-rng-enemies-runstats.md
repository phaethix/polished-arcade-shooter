# Daily RNG, Enemies Split, Run Stats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Daily Challenge gameplay RNG date-seeded and reproducible, split `enemies.ts` into focused modules, and show run accuracy/damage/kills on the game-over screen.

**Architecture:** Add `createRng(seed)` (mulberry32) on `GameData.rng`; gameplay systems call `g.rng.next()`, cosmetics keep `Math.random()`. Then move enemy spawn/AI/helpers/draw into `enemies/` + `render/enemies.ts` via a barrel. Finally track run counters in combat/weapons and render them in `gameover.ts`.

**Tech Stack:** TypeScript, Vitest, existing Canvas game loop (`GameData` mutable struct).

**Spec:** `docs/superpowers/specs/2026-07-11-daily-rng-enemies-runstats-design.md`

---

## File map

| Path                                        | Role                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src/game/core/rng.ts`                      | `Rng` interface + `createRng(seed)`                                 |
| `src/game/core/rng.test.ts`                 | Determinism unit tests                                              |
| `src/game/types.ts`                         | `rng` + run-stat fields on `GameData`                               |
| `src/game/engine.ts`                        | Init/reset `rng` and run stats                                      |
| `src/game/enemies.ts` → `enemies/*`         | Spawn uses `g.rng`; later split                                     |
| `src/game/hazards.ts`                       | Spawn/timing uses `g.rng`; particle FX stay `Math.random`           |
| `src/game/combat.ts`                        | Drop rolls use `g.rng`; laser FX stay `Math.random`; kill/hit stats |
| `src/game/weapons.ts`                       | Count `shotsFired` on fire                                          |
| `src/game/run-stats.ts`                     | Pure `formatAccuracy` helper                                        |
| `src/game/render/gameover.ts`               | Stats line                                                          |
| `src/game/render/enemies.ts`                | `drawEnemy`                                                         |
| `docs/PLAYER_GUIDE.md`, `.issue/2026-07-07-roadmap.md` | Docs sync                                                           |

---

### Task 1: RNG core (TDD)

**Files:**

- Create: `src/game/core/rng.ts`
- Create: `src/game/core/rng.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('returns identical sequences for the same seed', () => {
    const a = createRng(20260711);
    const b = createRng(20260711);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('returns values in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('diverges for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(Array.from({ length: 5 }, () => a.next())).not.toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL** (module missing)

```bash
npm run test:run -- src/game/core/rng.test.ts
```

- [ ] **Step 3: Implement mulberry32**

```typescript
export interface Rng {
  next(): number;
}

/** Deterministic PRNG; `next()` returns [0, 1). */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/game/core/rng.ts src/game/core/rng.test.ts
git commit -m "feat(game): add mulberry32 seeded rng helper"
```

---

### Task 2: Wire `rng` onto `GameData`

**Files:**

- Modify: `src/game/types.ts`
- Modify: `src/game/engine.ts`
- Create: `src/game/core/rng-game.test.ts` (spawn determinism smoke)

- [ ] **Step 1: Add type + init**

In `types.ts`:

```typescript
import type { Rng } from './core/rng';
// on GameData:
rng: Rng;
```

In `createGameData()`:

```typescript
rng: createRng(0),
```

In `resetGame()`, after `initModeState(g)`:

```typescript
g.rng =
  g.gameMode === 'daily'
    ? createRng(g.dailySeed)
    : createRng((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
```

Import `createRng` from `./core/rng`.

- [ ] **Step 2: Replace gameplay `Math.random` in enemies / hazards / combat**

Pattern: `Math.random()` → `g.rng.next()` wherever spawn/drop/timing needs `g`.

For helpers that only have `wave` today (`createEnemy`), pass `g` or `rng: Rng` so spawn can call `rng.next()`.

**Keep `Math.random` in:** `effects.ts`, `engine.ts` screen shake, `chapters.ts` star init, `ambient-system.ts`, `bullet-system` trails, `player-controller` thruster FX, `combat` laser spark FX (`updateLaserFire` particle block), `hazards` death particles, `render/world.ts` flicker.

- [ ] **Step 3: Determinism test**

```typescript
import { describe, it, expect } from 'vitest';
import { createGameData, resetGame } from '../engine';
import { spawnEnemy } from '../enemies';
import { createRng } from './rng';

describe('daily spawn determinism', () => {
  it('spawns the same enemy types for the same daily seed', () => {
    function runSpawns(seed: number) {
      const g = createGameData();
      g.gameMode = 'daily';
      g.dailySeed = seed;
      g.dailyModifier = null;
      resetGame(g);
      g.rng = createRng(seed); // ensure identical even if Date path ran
      // force non-boss wave
      g.wave = 3;
      g.enemiesPerWave = 10;
      g.enemiesSpawned = 0;
      g.enemies = [];
      const types = [];
      for (let i = 0; i < 8; i++) {
        spawnEnemy(g);
        types.push(g.enemies[g.enemies.length - 1].type);
      }
      return types;
    }
    expect(runSpawns(20260711)).toEqual(runSpawns(20260711));
  });
});
```

Adjust if `resetGame` already sets daily rng from `dailySeed` — then omit the manual `g.rng =` and set mode before reset via menu fields + `initModeState` path. Prefer: set `g.gameMode = 'daily'`, call `resetGame` which calls `initModeState` then `createRng(g.dailySeed)`.

Note: `resetGame` calls `initModeState` which overwrites `dailySeed` with `getDailySeed()`. For the test, either:

- export a test helper `resetGameWithSeed(g, seed)`, or
- after `resetGame`, assign `g.dailySeed = seed; g.rng = createRng(seed);` and clear enemies then spawn.

Use the after-reset reassignment approach to avoid changing production API.

- [ ] **Step 4: `npm run typecheck && npm run test:run`**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(game): seed gameplay rng from daily date"
```

---

### Task 3: Docs for Daily RNG

**Files:**

- Modify: `docs/PLAYER_GUIDE.md` (Daily Challenge row)
- Modify: `.issue/2026-07-07-roadmap.md` (difficulty done; add seeded Daily under supplementary or done)

- [ ] Update PLAYER_GUIDE Daily row to mention date-seeded gameplay RNG (spawns/drops/hazards).
- [ ] Roadmap: mark difficulty tiers done; add “Daily seeded gameplay RNG” as done under post-expansion or supplementary.
- [ ] Commit: `docs: note daily seeded gameplay rng`

---

### Task 4: Split enemies module

**Files:**

- Create: `src/game/enemies/helpers.ts` (blocksCenterShot, isFrontalShieldBlock, kamikazeExplosionRadius, isKamikazeBlastHit)
- Create: `src/game/enemies/spawn.ts` (pool, createEnemy, spawnEnemy, spawnSplitterChildren)
- Create: `src/game/enemies/ai.ts` (enemyShoot, updateEnemies, fireEnemyBullet)
- Create: `src/game/render/enemies.ts` (drawEnemy)
- Create: `src/game/enemies/index.ts` (re-export all public symbols)
- Delete: `src/game/enemies.ts`
- Move: `src/game/enemies.test.ts` stays at `src/game/enemies.test.ts` importing from `./enemies`

- [ ] **Step 1:** Move helpers first; keep `enemies.ts` re-exporting from helpers temporarily OR do full cut in one commit if tests stay green.
- [ ] **Step 2:** Move spawn (uses `g.rng` from Task 2).
- [ ] **Step 3:** Move AI.
- [ ] **Step 4:** Move `drawEnemy` to `render/enemies.ts`; `engine.ts` imports `drawEnemy` from `./render/enemies`.
- [ ] **Step 5:** Barrel `index.ts`; delete monolith; run tests.
- [ ] **Step 6: Commit**

```bash
git commit -m "refactor(game): split enemies into spawn, ai, and render"
```

Preferred: one refactor commit if the split is mechanical; otherwise helpers → spawn/ai → render as separate commits.

Update `docs/ARCHITECTURE.md` enemies bullet to list `enemies/` + `render/enemies.ts`.

---

### Task 5: Run stats (TDD + UI)

**Files:**

- Create: `src/game/run-stats.ts` + `src/game/run-stats.test.ts`
- Modify: `src/game/types.ts`, `engine.ts`, `weapons.ts`, `combat.ts`, `render/gameover.ts`
- Optionally: `docs/PLAYER_GUIDE.md` one line under scoring

- [ ] **Step 1: Failing tests for accuracy helper**

```typescript
import { describe, it, expect } from 'vitest';
import { formatAccuracy } from './run-stats';

describe('formatAccuracy', () => {
  it('returns em dash when no shots fired', () => {
    expect(formatAccuracy(0, 0)).toBe('—');
  });
  it('rounds percent from hits over fired', () => {
    expect(formatAccuracy(3, 10)).toBe('30%');
  });
});
```

- [ ] **Step 2: Implement**

```typescript
export function formatAccuracy(shotsHit: number, shotsFired: number): string {
  if (shotsFired <= 0) return '—';
  return `${Math.round((100 * shotsHit) / shotsFired)}%`;
}
```

- [ ] **Step 3: Add fields to `GameData`**

```typescript
shotsFired: number;
shotsHit: number;
damageDealt: number;
enemiesKilled: number;
```

Init `0` in `createGameData` / `resetGame`.

- [ ] **Step 4: Instrument**

- `fireWeapon` / each player bullet pushed: `g.shotsFired++` (count projectiles; for shotgun count each pellet).
- Laser: each damage application tick in `updateLaserFire` that can hit: `g.shotsFired++` once per tick (not per enemy).
- On successful player damage to enemy: `g.shotsHit++`, `g.damageDealt += amount`.
- In `onEnemyKilled`: `g.enemiesKilled++`.

Pierce: increment `shotsHit` once per enemy damaged by that bullet (existing hit loop).

- [ ] **Step 5: Game-over UI**

Below graze line:

```typescript
ctx.fillText(
  `Accuracy ${formatAccuracy(g.shotsHit, g.shotsFired)}  ·  Damage ${Math.round(g.damageDealt).toLocaleString()}  ·  Kills ${g.enemiesKilled}`,
  CANVAS_W / 2,
  y,
);
```

Shift subsequent `y` with `lineStep`.

- [ ] **Step 6: typecheck + test:run + Commit**

```bash
git commit -m "feat(game): show run accuracy damage and kills on game over"
```

---

### Task 6: Final verification

- [ ] `npm run typecheck && npm run lint && npm run test:run && npm run build`
- [ ] Grep audit: no gameplay `Math.random` left in `enemies/`, `hazards` spawn paths, `combat` drops
- [ ] Manual smoke: Daily twice same day → similar early waves if playing similarly; game over shows stats line

---

## Spec coverage checklist

| Spec item                               | Task   |
| --------------------------------------- | ------ |
| mulberry32 + unit tests                 | Task 1 |
| GameData.rng + daily/other seeding      | Task 2 |
| Gameplay vs cosmetic random split       | Task 2 |
| Spawn determinism test                  | Task 2 |
| PLAYER_GUIDE + roadmap                  | Task 3 |
| enemies/ split + render draw            | Task 4 |
| run stats fields + UI + accuracy helper | Task 5 |
| Full verify                             | Task 6 |
