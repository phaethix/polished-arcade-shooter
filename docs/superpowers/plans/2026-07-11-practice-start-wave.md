# Practice Start-Wave Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Practice mode start at a chosen wave (1–20) via a Practice-only menu row, with chapter derived from Endless rotation.

**Architecture:** Store `practiceStartWave` on `GameData`. Pure helpers in `modes.ts` clamp/cycle/label. Menu layout applies a shared Y offset when Practice is selected so draw and touch stay synced. `resetGame` seeds `wave` from that field only in Practice.

**Tech Stack:** TypeScript, Vitest, existing Canvas menu (`menu.ts` / `menu-layout.ts`), keyboard + touch input hooks.

**Spec:** `docs/superpowers/specs/2026-07-11-practice-start-wave-design.md`

---

## File map

| File                                  | Responsibility                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/game/types.ts`                   | Add `practiceStartWave: number`                                                                      |
| `src/game/modes.ts`                   | `PRACTICE_START_WAVE_*`, `clampPracticeStartWave`, `nextPracticeStartWave`, `practiceStartWaveLabel` |
| `src/game/modes.test.ts`              | Unit tests for helpers                                                                               |
| `src/game/engine.ts`                  | Default field; `cyclePracticeStartWave`; `resetGame` wave seed                                       |
| `src/game/render/menu-layout.ts`      | `PRACTICE_START_WAVE_OFFSET`, `getMenuLayout(showPracticeStartWave)`, touch action                   |
| `src/game/render/menu-layout.test.ts` | Hit zones with/without Practice row                                                                  |
| `src/game/render/menu.ts`             | Draw START WAVE row; controls legend                                                                 |
| `src/app/use-keyboard-input.ts`       | `Minus` / `Equal`                                                                                    |
| `src/app/menu-touch.ts`               | Dispatch `cycle_practice_start_wave`                                                                 |
| `docs/PLAYER_GUIDE.md`                | Document control                                                                                     |
| `.issue/2026-07-07-roadmap.md`        | Mark backlog item done                                                                               |

---

### Task 1: Pure helpers + tests (TDD)

**Files:**

- Modify: `src/game/modes.ts`
- Modify: `src/game/modes.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/game/modes.test.ts`:

```typescript
import {
  PRACTICE_START_WAVE_MAX,
  PRACTICE_START_WAVE_MIN,
  clampPracticeStartWave,
  nextPracticeStartWave,
  practiceStartWaveLabel,
} from './modes';

describe('practice start wave helpers', () => {
  it('clamps out-of-range values into 1..20', () => {
    expect(clampPracticeStartWave(0)).toBe(PRACTICE_START_WAVE_MIN);
    expect(clampPracticeStartWave(99)).toBe(PRACTICE_START_WAVE_MAX);
    expect(clampPracticeStartWave(10)).toBe(10);
  });

  it('wraps when cycling past the ends', () => {
    expect(nextPracticeStartWave(1, -1)).toBe(20);
    expect(nextPracticeStartWave(20, 1)).toBe(1);
    expect(nextPracticeStartWave(10, 1)).toBe(11);
  });

  it('labels chapter and marks boss waves', () => {
    expect(practiceStartWaveLabel(1)).toBe('Deep Space');
    expect(practiceStartWaveLabel(10)).toBe('Asteroid Belt · boss');
    expect(practiceStartWaveLabel(5)).toContain('boss');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/game/modes.test.ts`

Expected: FAIL — exports missing / not a function.

- [ ] **Step 3: Implement helpers in `modes.ts`**

Add near other Practice helpers (after `isPracticeInvincible`):

```typescript
export const PRACTICE_START_WAVE_MIN = 1;
export const PRACTICE_START_WAVE_MAX = 20;

/** Clamp a practice start wave into the allowed menu range. */
export function clampPracticeStartWave(wave: number): number {
  if (!Number.isFinite(wave)) return PRACTICE_START_WAVE_MIN;
  return Math.min(PRACTICE_START_WAVE_MAX, Math.max(PRACTICE_START_WAVE_MIN, Math.floor(wave)));
}

/** Cycle practice start wave with wrap-around. */
export function nextPracticeStartWave(wave: number, direction: -1 | 1): number {
  const cur = clampPracticeStartWave(wave);
  const span = PRACTICE_START_WAVE_MAX - PRACTICE_START_WAVE_MIN + 1;
  return PRACTICE_START_WAVE_MIN + ((cur - PRACTICE_START_WAVE_MIN + direction + span) % span);
}

/** Menu tagline: chapter name, plus boss hint on Endless/Practice boss cadence. */
export function practiceStartWaveLabel(wave: number): string {
  const w = clampPracticeStartWave(wave);
  const chapter = getChapter(getChapterForWave(w));
  const isBoss = w % 5 === 0 && w >= 5;
  return isBoss ? `${chapter.name} · boss` : chapter.name;
}
```

(`getChapter` / `getChapterForWave` are already imported in `modes.ts`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/game/modes.test.ts`

Expected: PASS for the new describe block.

- [ ] **Step 5: Commit**

```bash
git add src/game/modes.ts src/game/modes.test.ts
git commit -m "feat(game): add practice start-wave helpers"
```

---

### Task 2: GameData field + resetGame + cycle API

**Files:**

- Modify: `src/game/types.ts` (near `practiceInvincible`)
- Modify: `src/game/engine.ts`
- Modify: `src/game/modes.test.ts` (optional integration-style via `createGameData` + `resetGame` — prefer a small engine-facing test in `modes.test.ts` or new assert in existing rng-game style; simplest: extend modes test with createGameData after field exists)

- [ ] **Step 1: Add field to `GameData`**

In `src/game/types.ts` next to `practiceInvincible`:

```typescript
/** Menu-only Practice start wave (1–20); applied in resetGame. */
practiceStartWave: number;
```

- [ ] **Step 2: Init + cycle + resetGame**

In `createGameData` object literal add:

```typescript
    practiceStartWave: 1,
```

Add import of `nextPracticeStartWave`, `clampPracticeStartWave`, `isPracticeMode` (isPracticeMode already available path via modes).

```typescript
export function cyclePracticeStartWave(g: GameData, direction: -1 | 1): void {
  if (g.gameMode !== 'practice') return;
  g.practiceStartWave = nextPracticeStartWave(g.practiceStartWave, direction);
}
```

In `resetGame` `Object.assign`, change `wave: 1` to:

```typescript
    wave:
      g.gameMode === 'practice' ? clampPracticeStartWave(g.practiceStartWave) : 1,
```

- [ ] **Step 3: Test reset seeds wave**

Add to `modes.test.ts` (with localStorage stub pattern from `rng-game.test.ts` if needed) **or** a tiny test file. Prefer appending in `src/game/core/rng-game.test.ts` style — simplest new block in `modes.test.ts` using `createGameData` / `resetGame` from engine:

```typescript
import { createGameData, resetGame } from './engine';
import { beforeEach, vi } from 'vitest';

// reuse or add localStorage stub if createGameData/progress touches it
```

If `createGameData` needs localStorage, copy the stub from `rng-game.test.ts`.

```typescript
describe('practice resetGame start wave', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
  });

  it('starts practice at the selected wave and endless at 1', () => {
    const g = createGameData();
    g.gameMode = 'practice';
    g.practiceStartWave = 10;
    resetGame(g);
    expect(g.wave).toBe(10);
    expect(g.chapterId).toBe('asteroid');

    g.gameMode = 'endless';
    resetGame(g);
    expect(g.wave).toBe(1);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm run test:run -- src/game/modes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/engine.ts src/game/modes.test.ts
git commit -m "feat(game): seed practice runs from start-wave selection"
```

---

### Task 3: Menu layout offset + touch action (TDD)

**Files:**

- Modify: `src/game/render/menu-layout.ts`
- Modify: `src/game/render/menu-layout.test.ts`

- [ ] **Step 1: Write failing layout tests**

```typescript
import { getMenuLayout, resolveMenuTouch } from './menu-layout';

describe('practice start-wave menu layout', () => {
  it('keeps start hit zone unchanged when practice row hidden', () => {
    const layout = getMenuLayout(false);
    expect(layout.start.hitYMin).toBe(440);
    expect(resolveMenuTouch(180, 450)).toEqual({ kind: 'start' });
  });

  it('shifts start down and hits cycle_practice_start_wave when shown', () => {
    const layout = getMenuLayout(true);
    expect(layout.start.hitYMin).toBeGreaterThan(440);
    const y = (layout.startWave.hitYMin + layout.startWave.hitYMax) / 2;
    expect(resolveMenuTouch(100, y, true)).toEqual({
      kind: 'cycle_practice_start_wave',
      direction: -1,
    });
    expect(resolveMenuTouch(300, y, true)).toEqual({
      kind: 'cycle_practice_start_wave',
      direction: 1,
    });
  });
});
```

Adjust numeric expectations to match the constant you pick (`PRACTICE_MENU_OFFSET = 46`).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- src/game/render/menu-layout.test.ts`

- [ ] **Step 3: Implement layout helper**

```typescript
export const PRACTICE_MENU_OFFSET = 46;

export type MenuLayoutView = {
  // same shape as MENU_LAYOUT fields used by draw/touch, with optional startWave
  mode: typeof MENU_LAYOUT.mode;
  aircraft: typeof MENU_LAYOUT.aircraft;
  weapon: typeof MENU_LAYOUT.weapon;
  difficulty: typeof MENU_LAYOUT.difficulty;
  startWave: {
    labelY: number;
    valueY: number;
    taglineY: number;
    hitYMin: number;
    hitYMax: number;
  };
  start: { textY: number; hitYMin: number; hitYMax: number };
  controls: { topY: number; step: number };
  titleY: number;
  subtitleY: number;
};

/** Build menu geometry; when showPracticeStartWave, insert row and shift start/controls. */
export function getMenuLayout(showPracticeStartWave: boolean): MenuLayoutView {
  const o = showPracticeStartWave ? PRACTICE_MENU_OFFSET : 0;
  return {
    titleY: MENU_LAYOUT.titleY,
    subtitleY: MENU_LAYOUT.subtitleY,
    mode: MENU_LAYOUT.mode,
    aircraft: MENU_LAYOUT.aircraft,
    weapon: MENU_LAYOUT.weapon,
    difficulty: MENU_LAYOUT.difficulty,
    startWave: {
      labelY: 446,
      valueY: 466,
      taglineY: 480,
      hitYMin: 440,
      hitYMax: 440 + PRACTICE_MENU_OFFSET,
    },
    start: {
      textY: MENU_LAYOUT.start.textY + o,
      hitYMin: MENU_LAYOUT.start.hitYMin + o,
      hitYMax: MENU_LAYOUT.start.hitYMax + o,
    },
    controls: {
      topY: MENU_LAYOUT.controls.topY + o,
      step: MENU_LAYOUT.controls.step,
    },
  };
}
```

Update `MenuTouchAction`:

```typescript
  | { kind: 'cycle_practice_start_wave'; direction: -1 | 1 }
```

Update `resolveMenuTouch`:

```typescript
export function resolveMenuTouch(
  x: number,
  y: number,
  showPracticeStartWave = false,
): MenuTouchAction | null {
  const layout = getMenuLayout(showPracticeStartWave);
  const { mode, aircraft, weapon, difficulty, startWave, start } = layout;

  // ... existing mode/aircraft/weapon/difficulty checks using layout fields ...

  if (showPracticeStartWave && y >= startWave.hitYMin && y < startWave.hitYMax) {
    return { kind: 'cycle_practice_start_wave', direction: rowCycleDirection(x) };
  }
  if (y >= start.hitYMin && y < start.hitYMax && isMenuRowCenter(x)) {
    return { kind: 'start' };
  }
  return null;
}
```

Tune `startWave` Y values so the block sits between difficulty (`hitYMax` 440) and shifted start — i.e. offset band `[440, 440+46)`.

- [ ] **Step 4: Fix existing menu-layout tests** that call `resolveMenuTouch` — pass `false` or rely on default.

- [ ] **Step 5: Run tests — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/game/render/menu-layout.ts src/game/render/menu-layout.test.ts
git commit -m "feat(ui): add practice start-wave menu hit layout"
```

---

### Task 4: Draw menu + keyboard + touch wiring

**Files:**

- Modify: `src/game/render/menu.ts`
- Modify: `src/app/use-keyboard-input.ts`
- Modify: `src/app/menu-touch.ts`

- [ ] **Step 1: `drawMenu` uses `getMenuLayout`**

```typescript
import { getMenuLayout } from './menu-layout';
import { practiceStartWaveLabel, isPracticeMode } from '../modes';

// inside drawMenu:
const showPracticeStart = isPracticeMode(g);
const layout = getMenuLayout(showPracticeStart);
```

Replace `MENU_LAYOUT` / `layout.*` usages with this `layout`. After difficulty block, if `showPracticeStart`:

```typescript
if (showPracticeStart) {
  const sw = layout.startWave;
  ctx.fillStyle = '#fd4';
  ctx.font = 'bold 13px "Segoe UI",Arial,sans-serif';
  ctx.fillText('START WAVE', CANVAS_W / 2, sw.labelY);
  ctx.fillStyle = '#8df';
  ctx.font = 'bold 18px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`◀  WAVE ${g.practiceStartWave}  ▶`, CANVAS_W / 2, sw.valueY);
  ctx.fillStyle = '#889';
  ctx.font = '10px "Segoe UI",Arial,sans-serif';
  ctx.fillText(practiceStartWaveLabel(g.practiceStartWave), CANVAS_W / 2, sw.taglineY);
}
```

Add controls line (always listed):

```typescript
    ['- / =', 'Practice start wave'],
```

- [ ] **Step 2: Keyboard**

In `use-keyboard-input.ts` import `cyclePracticeStartWave`. Add cases:

```typescript
        case 'Minus':
          if (g.state === 'menu' && down && g.gameMode === 'practice') {
            resumeAudio();
            cyclePracticeStartWave(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'Equal':
          if (g.state === 'menu' && down && g.gameMode === 'practice') {
            resumeAudio();
            cyclePracticeStartWave(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
```

- [ ] **Step 3: Touch**

```typescript
import { cyclePracticeStartWave } from '../game/engine';

  const action = resolveMenuTouch(pt.x, pt.y, g.gameMode === 'practice');
  // ...
    case 'cycle_practice_start_wave':
      cyclePracticeStartWave(g, action.direction);
      playMenuSelect();
      break;
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/game/render/menu.ts src/app/use-keyboard-input.ts src/app/menu-touch.ts
git commit -m "feat(ui): wire practice start-wave menu controls"
```

---

### Task 5: Docs + verify

**Files:**

- Modify: `docs/PLAYER_GUIDE.md`
- Modify: `.issue/2026-07-07-roadmap.md`
- Modify: `docs/superpowers/specs/2026-07-11-practice-start-wave-design.md` (Status → Implemented)

- [ ] **Step 1: PLAYER_GUIDE**

Under Practice mode / Menu controls:

- Practice row: start wave 1–20 with `-` / `=`
- Note chapter follows Endless rotation; bosses on 5/10/15/20

- [ ] **Step 2: Roadmap**

Move “Practice wave / chapter select” from backlog to supplementary completed as “Practice start-wave select (wave 1–20)”.

- [ ] **Step 3: Full verify**

```bash
npm run typecheck && npm run test:run && npm run format:check
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add docs/PLAYER_GUIDE.md .issue/2026-07-07-roadmap.md docs/superpowers/specs/2026-07-11-practice-start-wave-design.md
git commit -m "docs: document practice start-wave select"
```

---

## Spec coverage check

| Spec requirement              | Task    |
| ----------------------------- | ------- |
| `practiceStartWave` field     | 2       |
| Helpers clamp/next/label      | 1       |
| Menu row Practice-only        | 3, 4    |
| `-` / `=` + touch             | 4       |
| Layout offset synced          | 3       |
| `resetGame` wave seed         | 2       |
| PLAYER_GUIDE + roadmap        | 5       |
| Non-Practice layout unchanged | 3 tests |

## Placeholder scan

None intentional — layout Y numbers may need ±2px visual tweak in Task 4 while keeping tests green.
