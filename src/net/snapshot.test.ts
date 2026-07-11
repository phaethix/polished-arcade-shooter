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

  it('remaps identity for a guest so g.player stays "me"', () => {
    const host = createGameData();
    host.gameMode = 'coop_endless';
    host.state = 'playing';
    host.coopRole = 'host';
    host.player.x = 100;
    host.player2 = createPlayer('phantom');
    host.player2.x = 200;
    const snap = buildSnapshot(host);

    const guest = createGameData();
    guest.gameMode = 'coop_endless';
    guest.coopRole = 'guest';
    guest.player.x = 200;
    guest.player2 = createPlayer(host.selectedAircraft);
    guest.player2.x = 100;

    applySnapshot(guest, snap);

    // Guest's own ship (host's player2) stays on g.player so the HUD reflects "me".
    expect(guest.player.x).toBe(host.player2.x);
    // The host's ship (host's player) is mirrored onto g.player2.
    expect(guest.player2?.x).toBe(host.player.x);
  });

  it('round-trips hazards and chapterId for guest chapter visuals', () => {
    const host = createGameData();
    host.gameMode = 'coop_endless';
    host.state = 'playing';
    host.chapterId = 'asteroid';
    host.hazards = [
      {
        type: 'asteroid',
        x: 40,
        y: 80,
        width: 20,
        height: 20,
        vx: 0.5,
        vy: 2,
        rot: 1,
        rotSpeed: 0.1,
      },
    ];
    const snap = buildSnapshot(host);
    const guest = createGameData();
    guest.gameMode = 'coop_endless';
    guest.coopRole = 'guest';
    guest.chapterId = 'space';
    guest.hazards = [];
    applySnapshot(guest, snap);
    expect(guest.chapterId).toBe('asteroid');
    expect(guest.hazards).toHaveLength(1);
    expect(guest.hazards[0]?.type).toBe('asteroid');
    expect(guest.hazards[0]?.x).toBe(40);
  });
});
