import { describe, it, expect } from 'vitest';
import {
  GAMEPAD_DEADZONE,
  applyDeadzone,
  readStickDigital,
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
    const standard = fakePad({ mapping: 'standard', index: 0 });
    expect(pickStandardGamepad([null, standard, fakePad({ mapping: 'standard', index: 1 })])).toBe(
      standard,
    );
  });

  it('returns null when no standard pad exists', () => {
    expect(pickStandardGamepad([null, fakePad({ mapping: '' as GamepadMappingType })])).toBeNull();
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
    input.left = true;
    const prev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };
    const pad = fakePad({
      axes: [0.5, 0],
      buttons: [{ pressed: true }, { pressed: false }, { pressed: false }],
    });
    applyGamepadToInput(mkPlaying(), input, pad, prev);
    expect(input.right).toBe(true);
    expect(input.left).toBe(true);
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
});
