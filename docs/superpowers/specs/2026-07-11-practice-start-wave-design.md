# Design: Practice start-wave select

**Date:** 2026-07-11  
**Status:** Implemented  
**Branch:** `feature/practice-start-wave`

---

## Goal

Let Practice mode start at a chosen wave (1–20) so players can jump to chapter bosses and mid-run pressure without playing from wave 1. Chapter follows existing Endless rotation (`getChapterForWave`).

Builds on Practice mode (`practiceInvincible`, meta isolation) — does not change those rules.

---

## Decisions (locked)

| Topic           | Choice                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| What to pick    | **Wave number only** (not chapter picker)                               |
| Menu visibility | **Only when `gameMode === 'practice'`**                                 |
| UI              | Extra menu row between Difficulty and Start                             |
| Range           | **1–20**, wraps                                                         |
| Persistence     | None (session menu field only; resets to 1 with fresh `createGameData`) |

---

## Behavior

### Data

```typescript
// GameData
practiceStartWave: number; // menu selection; default 1
```

Helpers in `modes.ts` (or small `practice.ts` if preferred — keep in `modes.ts` for v1):

```typescript
export const PRACTICE_START_WAVE_MIN = 1;
export const PRACTICE_START_WAVE_MAX = 20;

export function nextPracticeStartWave(wave: number, direction: -1 | 1): number;
export function practiceStartWaveLabel(wave: number): string; // e.g. chapter name + " · boss" when isBossWave-equivalent
```

`practiceStartWaveLabel` uses `getChapter(getChapterForWave(wave)).name` and notes boss when `wave % 5 === 0 && wave >= 5` (same cadence as Endless/Practice bosses).

### Menu (Practice only)

- Row label: `START WAVE`
- Value: `◀  WAVE N  ▶`
- Tagline: chapter name; append ` · boss` on boss waves (5 / 10 / 15 / 20)
- Keyboard: `-` / `=` (`Minus` / `Equal`) cycle while `state === 'menu'` **and** Practice selected
- Touch: new hit band in `menu-layout.ts`; `resolveMenuTouch` returns `cycle_practice_start_wave`
- Controls legend: add `- / =` → `Practice start wave` (only needs to appear when Practice is selected, or always listed like `I` — prefer **always list** next to other practice hints for discoverability)

Non-Practice: row hidden; `-` / `=` no-op on menu; touch hit zone absent so layout matches today.

### Layout

When Practice is selected, insert the start-wave block and **shift** `start` + `controls` (+ high scores) downward by a fixed delta (~46px, matching difficulty block height). Prefer a small helper:

```typescript
export function getMenuLayout(g: GameData): typeof MENU_LAYOUT | AdjustedLayout;
```

or compute `practiceOffset` in `drawMenu` / `resolveMenuTouch` from the same constant so draw and hit-test stay synced (same rule as current `MENU_LAYOUT` comment).

Do **not** permanently move Difficulty for other modes.

### Start run (`resetGame`)

Today always sets `wave: 1`. Change to:

```typescript
wave: g.gameMode === 'practice' ? clampPracticeStartWave(g.practiceStartWave) : 1,
```

Then existing `syncChapterForMode(g)` + `getEnemiesPerWave(g)` + `initChapterHazards(g)` apply. Wave announce / spawn timers unchanged.

Leaving Practice mode does not need to reset `practiceStartWave` (harmless); switching back to Practice keeps last menu choice for the session.

### Out of scope

- Chapter-only picker / dual chapter+wave UI
- Waves above 20
- Persisting start wave in `localStorage`
- In-run wave skip
- Touch-only numeric keypad

---

## Files (expected)

| File                             | Change                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| `src/game/types.ts`              | `practiceStartWave`                                                 |
| `src/game/engine.ts`             | Init default; `cyclePracticeStartWave`; `resetGame` uses start wave |
| `src/game/modes.ts`              | Clamp / next / label helpers + tests                                |
| `src/game/modes.test.ts`         | Wrap 1↔20; label boss waves; reset path optional via engine test   |
| `src/game/render/menu-layout.ts` | Practice offset + `cycle_practice_start_wave` touch action          |
| `src/game/render/menu.ts`        | Draw row when Practice; controls line                               |
| `src/app/use-keyboard-input.ts`  | `-` / `=` on menu + Practice                                        |
| `src/app/menu-touch.ts`          | Dispatch new action                                                 |
| `docs/PLAYER_GUIDE.md`           | Practice start wave + keys                                          |
| `.issue/2026-07-07-roadmap.md`   | Move “Practice wave / chapter select” → done (wave-only)            |

---

## Acceptance

1. Non-Practice menu layout unchanged (no extra row, hit zones same).
2. Practice menu shows start-wave row; `-` / `=` and touch cycle 1…20 with wrap.
3. Tagline shows correct chapter; waves 5/10/15/20 show boss hint.
4. Starting Practice at wave 10 begins on wave 10 in Asteroid with rain boss when that wave’s boss spawns.
5. Other modes still start at wave 1.
6. `npm run typecheck && npm run test:run` pass.

## Non-goals

- Story stage select
- Boss Rush start index
- Saving preferred start wave across reloads
