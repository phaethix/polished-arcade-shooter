import { describe, it, expect } from 'vitest';
import { createGameData } from './engine';
import { isCoopMode, activePlayers, shouldTeamWipe } from './coop';
import { createPlayer } from './player-factory';

describe('coop', () => {
  it('isCoopMode detects coop_endless', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    expect(isCoopMode(g)).toBe(true);
  });

  it('activePlayers returns one ship in solo', () => {
    const g = createGameData();
    expect(activePlayers(g)).toHaveLength(1);
  });

  it('shouldTeamWipe when either hp is 0 in coop', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.player2 = createPlayer('phantom');
    g.player.hp = 1;
    g.player2.hp = 0;
    expect(shouldTeamWipe(g)).toBe(true);
  });
});
