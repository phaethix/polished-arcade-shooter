# Design: Daily seeded RNG, enemies split, run stats

**Date:** 2026-07-11  
**Status:** Implemented  
**Scope:** Three sequential slices; each ships playable and reviewable on its own.

---

## Goals

1. **A — Daily seeded RNG:** Same calendar day + same loadout + same input sequence → same gameplay random outcomes (spawns, drops, hazards). Cosmetic randomness stays non-deterministic.
2. **B — Split `enemies.ts`:** Decompose the ~650-line module into spawn / AI / helpers / render without behavior changes.
3. **C — Run stats:** Track and show accuracy, damage dealt, and kills on the game-over / mission-complete screen.

Out of scope: Practice mode, full replay/recording, object pools, gamepad, colorblind palettes.

---

## A — Daily seeded RNG

### Approach

`GameData` always carries an `rng` instance (`createRng(seed)` → `{ next(): number }` in `[0, 1)`).

| Mode        | Seed source                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| Daily       | `g.dailySeed` (existing `YYYYMMDD` integer from `getDailySeed()`)            |
| Other modes | Non-stable seed at `resetGame` (e.g. `Date.now()` mixed) so each run differs |

**Gameplay** calls (`enemies` spawn, `hazards` spawn, `combat` power-up rolls) use `g.rng.next()`.  
**Cosmetics** (`effects` particles, screen shake jitter, star/nebula wrap, laser flicker, trail particles) keep `Math.random()`.

### Files

| File                                   | Change                                       |
| -------------------------------------- | -------------------------------------------- |
| `src/game/core/rng.ts`                 | New: mulberry32 `createRng(seed)`            |
| `src/game/core/rng.test.ts`            | Same seed → identical sequence               |
| `src/game/types.ts`                    | Add `rng: Rng` to `GameData`                 |
| `src/game/engine.ts`                   | Init `rng` in `createGameData` / `resetGame` |
| `src/game/enemies.ts` (then B modules) | Replace gameplay `Math.random` with `g.rng`  |
| `src/game/hazards.ts`                  | Same for spawn/timing rolls                  |
| `src/game/combat.ts`                   | Same for drop rolls                          |
| `docs/PLAYER_GUIDE.md`                 | Note that Daily gameplay RNG is date-seeded  |
| `.issue/2026-07-07-roadmap.md`         | Mark difficulty done; note seeded Daily      |

### Acceptance

- Unit test: identical seeds produce identical `next()` streams.
- Integration-style test: two `GameData` instances with the same daily seed and the same sequence of spawn/drop helper calls produce the same enemy types / drop outcomes.
- Non-daily runs still feel random across restarts.
- Visual particles still vary frame-to-frame (not frozen).

### Non-goals

- Deterministic cosmetics or full input replay.
- Reseeding per wave (single stream for the run is enough).

---

## B — Split `enemies.ts`

### Layout

```text
src/game/enemies/
  index.ts      # re-exports public API (keep `from '../enemies'` working)
  spawn.ts      # pool, createEnemy, spawnEnemy, spawnSplitterChildren
  ai.ts         # updateEnemies, enemyShoot, type-specific AI
  helpers.ts    # blocksCenterShot, isFrontalShieldBlock, kamikaze helpers
src/game/render/enemies.ts  # drawEnemy only
```

Delete or replace the monolithic `src/game/enemies.ts` with the folder + barrel.

### Rules

- No AI or numeric tuning changes.
- `drawEnemy` moves to `render/` per architecture (pure draw).
- Existing tests (`enemies.test.ts`) keep importing from `./enemies` or `./enemies/index`.
- After A, spawn code uses `g.rng` (already wired).

### Acceptance

- `npm run typecheck` and `npm run test:run` pass.
- Public exports used by `engine`, `combat`, `collision-system`, `wave-spawner` unchanged in name.

---

## C — Run stats on game over

### Data

Add to `GameData` (or nested `runStats`):

| Field           | Meaning                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| `shotsFired`    | Player projectiles / laser ticks that count as a shot attempt                         |
| `shotsHit`      | Player shots that dealt damage to an enemy (pierce: count once per enemy hit is fine) |
| `damageDealt`   | Cumulative HP damage applied to enemies                                               |
| `enemiesKilled` | Enemies removed via kill path                                                         |

Reset all to `0` in `resetGame`. `grazeCount` / `maxCombo` already exist.

### Instrumentation

- Increment `shotsFired` where player bullets/laser are created or laser damage ticks fire.
- Increment `shotsHit` / `damageDealt` / `enemiesKilled` in the existing combat/kill path (`combat.ts`).

Accuracy display: `shotsFired === 0 ? '—' : Math.round(100 * shotsHit / shotsFired) + '%'`.

### UI

In `render/gameover.ts`, below the existing wave/combo/graze line, add one compact line:

`Accuracy N%  ·  Damage X  ·  Kills Y`

Adjust vertical spacing so high-score list still fits; shrink font if needed. No new screens.

### Acceptance

- Fresh run shows zeros / em dash until first shot.
- Killing enemies updates kills and damage; game-over line reflects them.
- Unit test for accuracy helper (pure function) if extracted.

### Non-goals

- Persisting stats to leaderboard.
- DPS charts or Practice mode.

---

## Implementation order

1. A — RNG module + wire gameplay call sites + tests + docs
2. B — File split (behavior-preserving refactor)
3. C — Stats fields + instrumentation + game-over UI

Prefer one concern per commit within each slice (types → logic → UI/docs).

---

## Risks

| Risk                                  | Mitigation                                                    |
| ------------------------------------- | ------------------------------------------------------------- |
| Missed `Math.random` in gameplay path | Grep audit after A; Daily determinism test covers spawn/drops |
| Game-over layout overflow             | Compact one-line stats; reuse `lineStep`                      |
| Import churn in B                     | Barrel `enemies/index.ts` preserves paths                     |
