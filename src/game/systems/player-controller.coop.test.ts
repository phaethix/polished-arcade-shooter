import { describe, it, expect } from 'vitest';
import { createGameData } from '../engine';
import { createPlayer } from '../player-factory';
import { createInputState } from '../../app/input';
import {
  updatePlayerFromInput,
  stepGuestMovement,
  advanceGuestPosition,
} from './player-controller';
import { beginCoopRun } from '../engine';
import { CANVAS_W, CANVAS_H } from '../core/constants';

describe('updateGuestShip (via updatePlayerFromInput)', () => {
  it('moves player2 by relayed touchDx/touchDy', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.state = 'playing';
    g.coopRole = 'host';
    g.player2 = createPlayer('phantom');
    const startX = g.player2.x;
    const startY = g.player2.y;
    g.coopGuestInput = createInputState();
    g.coopGuestInput.touchDx = 20;
    g.coopGuestInput.touchDy = -10;

    updatePlayerFromInput(g, createInputState(), 1 / 60);

    expect(g.player2.x).toBe(startX + 20);
    expect(g.player2.y).toBe(startY - 10);
    expect(g.coopGuestInput.touchDx).toBe(0);
    expect(g.coopGuestInput.touchDy).toBe(0);
  });

  it('fires the guest bomb from coopGuestInput without using host autoFire', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.state = 'playing';
    g.coopRole = 'host';
    g.autoFire = true;
    g.player2 = createPlayer('phantom');
    g.enemies = [
      {
        x: 200,
        y: 100,
        width: 20,
        height: 20,
        hp: 10,
        maxHp: 10,
        speed: 1,
        type: 'basic',
        shootTimer: 0,
        shootInterval: 99,
        movePattern: 'straight',
        movePhase: 0,
        scoreValue: 10,
        flashTimer: 0,
      },
    ];
    g.coopGuestInput = createInputState();
    g.coopGuestInput.bomb = true;
    g.coopGuestInput.shoot = false;

    updatePlayerFromInput(g, createInputState(), 1 / 60);

    expect(g.coopGuestInput.bomb).toBe(false);
    expect(g.enemies[0]!.hp).toBe(7);
  });
});

describe('advanceGuestPosition', () => {
  it('moves by the command and eases tilt toward the direction', () => {
    const pos = { x: CANVAS_W / 2, y: CANVAS_H / 2, tilt: 0, width: 40, height: 40, speed: 5 };
    const moved = advanceGuestPosition(pos, {
      left: false,
      right: true,
      up: false,
      down: false,
      touchDx: 0,
      touchDy: 0,
    });
    expect(moved.x).toBeGreaterThan(pos.x);
    expect(moved.tilt).toBeGreaterThan(0);
  });

  it('keeps the ship inside the play field', () => {
    const pos = { x: CANVAS_W - 5, y: CANVAS_H / 2, tilt: 0, width: 40, height: 40, speed: 5 };
    const moved = advanceGuestPosition(pos, {
      left: false,
      right: true,
      up: false,
      down: false,
      touchDx: 0,
      touchDy: 0,
    });
    expect(moved.x).toBeLessThanOrEqual(CANVAS_W - pos.width / 2);
    expect(moved.x).toBeGreaterThanOrEqual(pos.width / 2);
  });

  it('applies pointer drag deltas', () => {
    const pos = { x: 100, y: 100, tilt: 0, width: 40, height: 40, speed: 5 };
    const moved = advanceGuestPosition(pos, {
      left: false,
      right: false,
      up: false,
      down: false,
      touchDx: 12,
      touchDy: -8,
    });
    expect(moved.x).toBe(112);
    expect(moved.y).toBe(92);
  });
});

describe('stepGuestMovement', () => {
  it('mutates the live player in place', () => {
    const g = createGameData();
    g.state = 'playing';
    g.coopRole = 'guest';
    const p = g.player;
    p.x = CANVAS_W / 2;
    const beforeX = p.x;
    stepGuestMovement(p, {
      left: false,
      right: true,
      up: false,
      down: false,
      touchDx: 0,
      touchDy: 0,
    });
    expect(p.x).toBeGreaterThan(beforeX);
  });
});

describe('beginCoopRun', () => {
  it('resets prediction state so a rematch never reconciles against stale inputs', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    g.coopGuestTick = 5;
    g.coopInputLog = [
      { tick: 1, left: true, right: false, up: false, down: false, touchDx: 0, touchDy: 0 },
    ];
    g.coopLastGuestTick = 9;

    beginCoopRun(g, {
      difficulty: 'normal',
      seed: 1,
      hostLoadout: { aircraftId: 'falcon', weaponId: 'standard' },
      guestLoadout: { aircraftId: 'phantom', weaponId: 'standard' },
    });

    expect(g.coopGuestTick).toBe(0);
    expect(g.coopInputLog).toEqual([]);
    expect(g.coopLastGuestTick).toBe(-1);
  });
});
