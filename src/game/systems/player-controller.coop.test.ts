import { describe, it, expect } from 'vitest';
import { createGameData } from '../engine';
import { createPlayer } from '../player-factory';
import { createInputState } from '../../app/input';
import { updatePlayerFromInput, predictGuestKeyboard } from './player-controller';
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

describe('predictGuestKeyboard', () => {
  it('moves the local ship by input and keeps it inside the play field', () => {
    const g = createGameData();
    g.state = 'playing';
    g.coopRole = 'guest';
    const p = g.player;
    p.x = CANVAS_W / 2;
    p.y = CANVAS_H / 2;
    const input = createInputState();
    input.right = true;

    const beforeX = p.x;
    predictGuestKeyboard(p, input);

    expect(p.x).toBeGreaterThan(beforeX);
    expect(p.x).toBeLessThanOrEqual(CANVAS_W - p.width / 2);
    expect(p.x).toBeGreaterThanOrEqual(p.width / 2);
  });

  it('eases tilt toward the movement direction', () => {
    const g = createGameData();
    g.coopRole = 'guest';
    const p = g.player;
    p.tilt = 0;
    const input = createInputState();
    input.right = true;

    predictGuestKeyboard(p, input);

    expect(p.tilt).toBeGreaterThan(0);
  });
});

describe('beginCoopRun', () => {
  it('clears coopSelfTarget so the guest never snaps to a stale position', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    g.coopSelfTarget = { x: 10, y: 20, tilt: 0.5 };

    beginCoopRun(g, {
      difficulty: 'normal',
      seed: 1,
      hostLoadout: { aircraftId: 'falcon', weaponId: 'standard' },
      guestLoadout: { aircraftId: 'phantom', weaponId: 'standard' },
    });

    expect(g.coopSelfTarget).toBeNull();
  });
});
