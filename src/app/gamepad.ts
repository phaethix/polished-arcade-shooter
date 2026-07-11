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
 * Move/shoot use pad* level flags (cleared each frame). Bomb/skill rising-edge.
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
    input.padLeft = false;
    input.padRight = false;
    input.padUp = false;
    input.padDown = false;
    input.padShoot = false;
    prev.bomb = bombDown;
    prev.skill = skillDown;
    return;
  }

  const stick = readStickDigital(pad.axes, GAMEPAD_DEADZONE);
  const left = stick.left || isButtonDown(pad, GP.DPAD_LEFT);
  const right = stick.right || isButtonDown(pad, GP.DPAD_RIGHT);
  const up = stick.up || isButtonDown(pad, GP.DPAD_UP);
  const down = stick.down || isButtonDown(pad, GP.DPAD_DOWN);

  input.padLeft = left;
  input.padRight = right;
  input.padUp = up;
  input.padDown = down;

  const shoot = isButtonDown(pad, GP.A) || isButtonDown(pad, GP.RT);
  input.padShoot = shoot;
  if (shoot) resumeAudio();

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
