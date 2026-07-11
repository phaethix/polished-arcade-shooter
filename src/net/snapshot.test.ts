import { describe, it, expect } from 'vitest';
import { createGameData } from '../game/engine';
import { createPlayer } from '../game/player-factory';
import { buildSnapshot, applySnapshot } from './snapshot';

describe('snapshot', () => {
  it('round-trips players enemies bullets score wave state', () => {
    const host = createGameData();
    host.gameMode = 'coop_endless';
    host.state = 'playing';
    host.player2 = createPlayer('phantom');
    host.score = 42;
    host.wave = 3;
    host.enemies = [
      {
        x: 10,
        y: 20,
        width: 30,
        height: 30,
        hp: 2,
        maxHp: 2,
        speed: 1,
        type: 'basic',
        shootTimer: 0,
        shootInterval: 1,
        movePattern: 'straight',
        movePhase: 0,
        scoreValue: 100,
        flashTimer: 0,
      },
    ];
    const snap = buildSnapshot(host);
    const guest = createGameData();
    guest.gameMode = 'coop_endless';
    guest.player2 = createPlayer('phantom');
    applySnapshot(guest, snap);
    expect(guest.score).toBe(42);
    expect(guest.wave).toBe(3);
    expect(guest.enemies).toHaveLength(1);
    expect(guest.player.x).toBe(host.player.x);
    expect(guest.player2?.hp).toBe(host.player2.hp);
  });
});
