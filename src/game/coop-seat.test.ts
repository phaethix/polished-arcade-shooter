import { describe, it, expect } from 'vitest';
import { createGameData } from './engine';
import { createPlayer } from './player-factory';
import { coopSeatForShip, resolveCoopShipPalette } from './coop';

describe('coop ship seat colors', () => {
  it('maps host/guest seats on the host client', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    g.player2 = createPlayer('phantom');
    expect(coopSeatForShip(g, g.player)).toBe('host');
    expect(coopSeatForShip(g, g.player2)).toBe('guest');
  });

  it('maps host/guest seats on the guest client after identity remap', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    g.player = createPlayer('phantom');
    g.player2 = createPlayer('falcon');
    expect(coopSeatForShip(g, g.player)).toBe('guest');
    expect(coopSeatForShip(g, g.player2)).toBe('host');
  });

  it('returns null outside coop', () => {
    const g = createGameData();
    expect(coopSeatForShip(g, g.player)).toBeNull();
  });

  it('gives host and guest distinct hull palettes even for the same craft', () => {
    const host = resolveCoopShipPalette('falcon', 'host');
    const guest = resolveCoopShipPalette('falcon', 'guest');
    expect(host.hullTop).not.toBe(guest.hullTop);
    expect(host.engineColor).not.toBe(guest.engineColor);
  });
});
