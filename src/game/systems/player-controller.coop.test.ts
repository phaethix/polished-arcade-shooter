import { describe, it, expect } from 'vitest';
import { createGameData } from '../engine';
import { createPlayer } from '../player-factory';
import { createInputState } from '../../app/input';
import { updatePlayerFromInput } from './player-controller';

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
