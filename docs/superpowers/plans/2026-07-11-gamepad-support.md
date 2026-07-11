# Gamepad Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players control in-run gameplay (move, shoot, bomb, skill, pause) with a standard browser gamepad, merged into existing `InputState`.

**Architecture:** Pure helpers in `src/app/gamepad.ts` select a standard pad, apply deadzone/digital OR, and write level/edge inputs. `use-game-loop.ts` polls once per rAF frame before the fixed-timestep update. Keyboard/touch unchanged; gamepad only sets flags to `true` (never clears move/shoot).

**Tech Stack:** TypeScript, Vitest, Gamepad API (`navigator.getGamepads`), existing `InputState` + `togglePause`.

**Spec:** `docs/superpowers/specs/2026-07-11-gamepad-support-design.md`

---

## File map

| File                           | Responsibility                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| `src/app/gamepad.ts`           | Constants, pad pick, axis/button helpers, `pollGamepadInput`           |
| `src/app/gamepad.test.ts`      | Unit tests with fake Gamepad snapshots                                 |
| `src/app/use-game-loop.ts`     | Call poll each frame with a module-level or closure button-prev buffer |
| `docs/PLAYER_GUIDE.md`         | Gamepad controls                                                       |
| `.issue/2026-07-07-roadmap.md` | Mark controller support done                                           |
| Spec status → Implemented      | After verify                                                           |

No changes to `InputState`, `player-controller.ts`, or menu input in v1.

---

### Task 1: Pure gamepad helpers + tests (TDD)

**Files:**

- Create: `src/app/gamepad.ts`
- Create: `src/app/gamepad.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import {
  GAMEPAD_DEADZONE,
  applyDeadzone,
  readStickDigital,
  isButtonDown,
  risingEdge,
  pickStandardGamepad,
  applyGamepadToInput,
  type GamepadButtonPrev,
} from './gamepad';
import { createInputState } from './input';
import type { GameData } from '../game/types';

function fakeButton(pressed: boolean, value = pressed ? 1 : 0): GamepadButton {
  return { pressed, touched: pressed, value };
}

function fakePad(partial: {
  axes?: number[];
  buttons?: Array<{ pressed: boolean; value?: number }>;
  mapping?: GamepadMappingType;
  index?: number;
}): Gamepad {
  const buttons = (partial.buttons ?? []).map((b) => fakeButton(b.pressed, b.value));
  while (buttons.length < 16) buttons.push(fakeButton(false));
  return {
    axes: partial.axes ?? [0, 0, 0, 0],
    buttons,
    connected: true,
    id: 'test-pad',
    index: partial.index ?? 0,
    mapping: partial.mapping ?? 'standard',
    timestamp: 0,
    vibrationActuator: undefined as unknown as Gamepad['vibrationActuator'],
  } as Gamepad;
}

describe('applyDeadzone', () => {
  it('zeros values inside the deadzone', () => {
    expect(applyDeadzone(0.2, GAMEPAD_DEADZONE)).toBe(0);
    expect(applyDeadzone(-0.2, GAMEPAD_DEADZONE)).toBe(0);
  });

  it('keeps values outside the deadzone', () => {
    expect(applyDeadzone(0.3, GAMEPAD_DEADZONE)).toBe(0.3);
    expect(applyDeadzone(-0.5, GAMEPAD_DEADZONE)).toBe(-0.5);
  });
});

describe('readStickDigital', () => {
  it('maps left stick past deadzone to digital dirs', () => {
    const d = readStickDigital([-0.5, 0.4], GAMEPAD_DEADZONE);
    expect(d).toEqual({ left: true, right: false, up: false, down: true });
  });

  it('ignores stick inside deadzone', () => {
    expect(readStickDigital([0.1, -0.1], GAMEPAD_DEADZONE)).toEqual({
      left: false,
      right: false,
      up: false,
      down: false,
    });
  });
});

describe('pickStandardGamepad', () => {
  it('prefers the lowest-index standard pad', () => {
    const pads = [
      null,
      fakePad({ mapping: '', index: 1 }),
      fakePad({ mapping: 'standard', index: 2 }),
    ];
    // empty mapping is not standard — only index 2 qualifies if we build correctly
    const standard = fakePad({ mapping: 'standard', index: 0 });
    expect(pickStandardGamepad([null, standard, fakePad({ mapping: 'standard', index: 1 })])).toBe(
      standard,
    );
  });

  it('returns null when no standard pad exists', () => {
    expect(pickStandardGamepad([null, fakePad({ mapping: '' })])).toBeNull();
  });
});

describe('risingEdge', () => {
  it('fires once per press', () => {
    expect(risingEdge(true, false)).toBe(true);
    expect(risingEdge(true, true)).toBe(false);
    expect(risingEdge(false, true)).toBe(false);
  });
});

describe('applyGamepadToInput', () => {
  function mkPlaying(): GameData {
    return { state: 'playing' } as GameData;
  }

  it('sets move and shoot from stick and A without clearing other flags', () => {
    const input = createInputState();
    input.left = true; // simulate keyboard still held
    const prev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };
    const pad = fakePad({
      axes: [0.5, 0],
      buttons: [
        { pressed: true }, // A
        { pressed: false },
        { pressed: false },
      ],
    });
    applyGamepadToInput(mkPlaying(), input, pad, prev);
    expect(input.right).toBe(true);
    expect(input.left).toBe(true); // not cleared
    expect(input.shoot).toBe(true);
  });

  it('triggers bomb on rising edge only while playing', () => {
    const input = createInputState();
    const prev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };
    const pad = fakePad({
      buttons: [{ pressed: false }, { pressed: true }, { pressed: false }],
    });
    applyGamepadToInput(mkPlaying(), input, pad, prev);
    expect(input.bomb).toBe(true);
    expect(prev.bomb).toBe(true);

    input.bomb = false;
    applyGamepadToInput(mkPlaying(), input, pad, prev);
    expect(input.bomb).toBe(false);
  });

  it('does not apply gameplay buttons on menu', () => {
    const input = createInputState();
    const prev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };
    const pad = fakePad({
      axes: [1, 0],
      buttons: [{ pressed: true }, { pressed: true }, { pressed: true }],
    });
    applyGamepadToInput({ state: 'menu' } as GameData, input, pad, prev);
    expect(input.right).toBe(false);
    expect(input.shoot).toBe(false);
    expect(input.bomb).toBe(false);
    expect(input.skill).toBe(false);
  });
});
```

Fix the `pickStandardGamepad` test if empty mapping typing is awkward — use `as GamepadMappingType` or only pass `'standard' | ''`.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:run -- src/app/gamepad.test.ts
```

Expected: cannot find module / exports missing.

- [ ] **Step 3: Implement `src/app/gamepad.ts`**

```typescript
import type { GameData } from '../game/types';
import { togglePause } from '../game/engine';
import { resumeAudio } from '../game/audio';
import type { InputState } from './input';

export const GAMEPAD_DEADZONE = 0.25;

/** Standard Gamepad button indices */
export const GP = {
  A: 0,
  B: 1,
  X: 2,
  RT: 7,
  START: 9,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

export interface GamepadButtonPrev {
  bomb: boolean;
  skill: boolean;
  pause: boolean;
}

export function applyDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) < deadzone ? 0 : value;
}

export function readStickDigital(
  axes: readonly number[],
  deadzone: number,
): { left: boolean; right: boolean; up: boolean; down: boolean } {
  const x = applyDeadzone(axes[0] ?? 0, deadzone);
  const y = applyDeadzone(axes[1] ?? 0, deadzone);
  return {
    left: x < 0,
    right: x > 0,
    up: y < 0,
    down: y > 0,
  };
}

export function isButtonDown(pad: Gamepad, index: number): boolean {
  const b = pad.buttons[index];
  if (!b) return false;
  return b.pressed || b.value > 0.5;
}

export function risingEdge(down: boolean, wasDown: boolean): boolean {
  return down && !wasDown;
}

/** Lowest-index connected pad with standard mapping, or null. */
export function pickStandardGamepad(pads: Array<Gamepad | null>): Gamepad | null {
  let best: Gamepad | null = null;
  for (const p of pads) {
    if (!p || !p.connected) continue;
    if (p.mapping !== 'standard') continue;
    if (!best || p.index < best.index) best = p;
  }
  return best;
}

/**
 * Apply one gamepad snapshot to InputState.
 * Move/shoot only set true; never clear. Bomb/skill rising-edge.
 * Pause handled via togglePause.
 */
export function applyGamepadToInput(
  g: GameData,
  input: InputState,
  pad: Gamepad,
  prev: GamepadButtonPrev,
): void {
  const bombDown = isButtonDown(pad, GP.B);
  const skillDown = isButtonDown(pad, GP.X);
  const pauseDown = isButtonDown(pad, GP.START);

  if (g.state === 'playing' || g.state === 'paused') {
    if (risingEdge(pauseDown, prev.pause)) {
      togglePause(g);
      resumeAudio();
    }
  }
  prev.pause = pauseDown;

  if (g.state !== 'playing') {
    prev.bomb = bombDown;
    prev.skill = skillDown;
    return;
  }

  const stick = readStickDigital(pad.axes, GAMEPAD_DEADZONE);
  const left = stick.left || isButtonDown(pad, GP.DPAD_LEFT);
  const right = stick.right || isButtonDown(pad, GP.DPAD_RIGHT);
  const up = stick.up || isButtonDown(pad, GP.DPAD_UP);
  const down = stick.down || isButtonDown(pad, GP.DPAD_DOWN);

  if (left) input.left = true;
  if (right) input.right = true;
  if (up) input.up = true;
  if (down) input.down = true;

  if (isButtonDown(pad, GP.A) || isButtonDown(pad, GP.RT)) {
    input.shoot = true;
    resumeAudio();
  }

  if (risingEdge(bombDown, prev.bomb)) {
    input.bomb = true;
    resumeAudio();
  }
  if (risingEdge(skillDown, prev.skill)) {
    input.skill = true;
    resumeAudio();
  }
  prev.bomb = bombDown;
  prev.skill = skillDown;
}

/** Read navigator pads (or injected list) and apply. */
export function pollGamepadInput(
  g: GameData,
  input: InputState,
  prev: GamepadButtonPrev,
  pads?: Array<Gamepad | null>,
): void {
  const list =
    pads ??
    (typeof navigator !== 'undefined' && navigator.getGamepads
      ? Array.from(navigator.getGamepads())
      : []);
  const pad = pickStandardGamepad(list);
  if (!pad) return;
  applyGamepadToInput(g, input, pad, prev);
}
```

**Avoid circular imports:** `togglePause` lives in `engine.ts` which may import app types. Prefer importing `togglePause` from a tiny path — if `engine → gamepad` cycle appears, move `togglePause` call to the game-loop caller:

```typescript
// Alternative if cycle: applyGamepadToInput returns { pausePressed: boolean }
```

Check: `engine.ts` exports `togglePause` and imports from `../app/input` only — `gamepad.ts` importing `engine` is OK if engine never imports gamepad. **Do not import gamepad from engine.**

- [ ] **Step 4: Fix tests / typecheck**

```bash
npm run test:run -- src/app/gamepad.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/gamepad.ts src/app/gamepad.test.ts
git commit -m "feat(input): add standard gamepad polling helpers"
```

---

### Task 2: Wire poll into game loop

**Files:**

- Modify: `src/app/use-game-loop.ts`

- [ ] **Step 1: Hold prev-button state in the effect closure**

```typescript
import { pollGamepadInput, type GamepadButtonPrev } from './gamepad';

// inside useEffect, before tick:
const gamepadPrev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };

// inside tick(), before the while accumulator loop:
pollGamepadInput(game, input, gamepadPrev);
```

Call **once per rAF frame** (not inside the fixed-timestep while-loop) so edge detection is once per frame; then fixed updates consume bomb/skill as today.

Order:

```typescript
const game = gameRef.current;
const input = inputRef.current;
pollGamepadInput(game, input, gamepadPrev);

while (accumulator >= FIXED_TIMESTEP_S) {
  ...
}
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/app/use-game-loop.ts
git commit -m "feat(input): poll gamepad each animation frame"
```

---

### Task 3: Pause edge test + docs

**Files:**

- Modify: `src/app/gamepad.test.ts` (pause rising edge with mock toggle — inject or spy)

If `applyGamepadToInput` calls real `togglePause`, pass a minimal `GameData` with `state: 'playing'` and assert `state === 'paused'` after Start rising edge.

```typescript
it('toggles pause on Start rising edge', () => {
  const g = { state: 'playing' } as GameData;
  const input = createInputState();
  const prev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };
  const pad = fakePad({
    buttons: Array.from({ length: 10 }, (_, i) => ({ pressed: i === 9 })),
  });
  applyGamepadToInput(g, input, pad, prev);
  expect(g.state).toBe('paused');
});
```

Ensure `togglePause` works on partial GameData (it only checks `g.state`).

- [ ] **Step 1: Add pause test; run tests**

- [ ] **Step 2: Update PLAYER_GUIDE**

Under Controls, add:

| Action | Gamepad (standard) |
| Shoot | A or RT (hold) |
| Move | Left stick / D-pad |
| Bomb | B |
| Skill | X |
| Pause | Start |

Note: menu still keyboard/touch.

- [ ] **Step 3: Roadmap** — move Controller support to supplementary completed.

- [ ] **Step 4: Spec status → Implemented**

- [ ] **Step 5: Full verify**

```bash
npm run typecheck && npm run test:run && npm run format:check
```

- [ ] **Step 6: Commit**

```bash
git add src/app/gamepad.test.ts docs/PLAYER_GUIDE.md .issue/2026-07-07-roadmap.md docs/superpowers/specs/2026-07-11-gamepad-support-design.md
git commit -m "docs: document standard gamepad gameplay controls"
```

---

## Spec coverage

| Spec item                                      | Task    |
| ---------------------------------------------- | ------- |
| Standard mapping A/B/X/RT/Start/D-pad/stick    | 1       |
| Deadzone 0.25                                  | 1       |
| Level vs edge                                  | 1       |
| Never clear move/shoot from pad                | 1       |
| Playing-only gameplay; pause on playing/paused | 1–3     |
| Standard-only pad pick                         | 1       |
| Poll from game loop                            | 2       |
| Docs / roadmap                                 | 3       |
| Menu ignored                                   | 1 tests |

## Risks

- **Import cycle** `gamepad → engine → …`: if detected, return `{ wantsPause: boolean }` from apply and call `togglePause` in `use-game-loop` instead.
- **RT as analog trigger:** `isButtonDown` uses `value > 0.5` — correct for standard mapping.
