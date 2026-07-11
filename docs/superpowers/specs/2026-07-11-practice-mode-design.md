# Design: Practice mode

**Date:** 2026-07-11  
**Status:** Approved for implementation (approach 1 — lean sandbox)  
**Branch naming:** `feature/practice-mode` (CI requires `feature/`, not `feat/`)

---

## Goal

Add a **Practice** game mode for loadout / wave training: Endless-like pacing with **invincibility on by default**, toggleable in-run, and **no meta progression pollution** (no high scores, coins, or achievements).

Wave / chapter select is **out of scope** (follow-up PR).

---

## Behavior

### Mode

| Item           | Choice                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Id             | `'practice'` on `GameMode`                                                                         |
| Menu           | Appears in `MODE_ORDER` after `daily` (or before daily — prefer end of list: `…, daily, practice`) |
| Name / tagline | `Practice` · `Invincible sandbox · no rewards`                                                     |
| Waves          | Same rules as Endless (`getEnemiesPerWave`, boss every 5 from wave 5, chapter rotation)            |
| Difficulty     | Still selectable; multipliers apply (useful for Hard practice)                                     |
| Daily mods     | None                                                                                               |

### Invincibility

| Item          | Choice                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Field         | `practiceInvincible: boolean` on `GameData`                                                      |
| Default       | `true` when starting a practice run (`resetGame` / `initModeState`)                              |
| Toggle        | `I` while `state === 'playing'` **and** `gameMode === 'practice'`                                |
| Effect        | `hurtPlayer` (and any path that calls it) no-ops when practice + invincible; player HP unchanged |
| HUD           | Show `INV` (near `AUTO`) when practice invincible is on                                          |
| Menu controls | List `I` → Toggle invincibility (practice)                                                       |

Non-practice modes ignore `I` and never set invincible via this flag.

### Meta isolation

When `gameMode === 'practice'`:

- Do **not** call `saveHighScore`
- Do **not** call `awardRunCoins` / `addCoins`
- Do **not** call `queueAchievement` / `unlockAchievement`

Prefer early returns in `awardRunCoins`, `queueAchievement`, and the `saveHighScore` call sites (`killPlayer`, story-complete path in wave-spawner) gated by `isPracticeMode(g)` helper in `modes.ts`.

Score / combo / run stats may still update in-memory for the game-over screen (useful feedback); they simply are not persisted.

### Game over

- If the player turns invincibility **off** and dies → normal game-over overlay
- Restart / return to menu unchanged
- Game-over copy can note `Practice` (optional one-line); no high-score highlight for practice runs

---

## Files (expected)

| File                               | Change                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `src/game/types.ts`                | `GameMode` + `practiceInvincible`                                                     |
| `src/game/modes.ts`                | `MODE_ORDER`, `MODE_INFO`, wave helpers treat practice like endless, `isPracticeMode` |
| `src/game/modes.test.ts`           | Mode cycle + endless-equivalent wave rules + practice gates                           |
| `src/game/engine.ts`               | Init / reset `practiceInvincible`                                                     |
| `src/game/combat.ts`               | `hurtPlayer` early-out; skip high score / coins on kill paths via helpers             |
| `src/game/run-progress.ts`         | Guard coins / achievements                                                            |
| `src/game/systems/wave-spawner.ts` | Skip `saveHighScore` on story-complete if ever reachable (practice won't); safe guard |
| `src/app/use-keyboard-input.ts`    | `KeyI` toggle                                                                         |
| `src/game/render/hud.ts`           | `INV` indicator                                                                       |
| `src/game/render/menu.ts`          | Controls line                                                                         |
| `docs/PLAYER_GUIDE.md`             | Mode + controls                                                                       |
| `.issue/2026-07-07-roadmap.md`     | Mark Practice done (or in progress → done on merge)                                   |

---

## Acceptance

1. Menu can select Practice; run starts with auto-invincibility (collisions / bullets do not reduce HP).
2. `I` toggles invincibility only in Practice; HUD reflects state.
3. With invincibility off, player can die and see game over.
4. Practice runs do not change coins, unlocks, achievements, or high-score list.
5. `npm run typecheck && npm run test:run` pass.

## Non-goals

- Wave / chapter picker
- Enemy-type sandbox spawner
- Persisting invincibility preference
- Touch button for invincibility (keyboard `I` only for v1)
