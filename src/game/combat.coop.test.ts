import { describe, it, expect } from 'vitest';
import { createGameData } from './engine';
import { createPlayer } from './player-factory';
import { hurtPlayer } from './combat';

describe('coop hurt', () => {
  it('team-wipes when player2 reaches 0 hp', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.state = 'playing';
    g.player2 = createPlayer('fortress');
    g.player2.hp = 1;
    g.player2.invincibleTimer = 0;
    hurtPlayer(g, g.player2);
    expect(g.player2.hp).toBe(0);
    expect(g.state).toBe('gameover');
  });

  it('does not team-wipe while the other ship still has hp', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.state = 'playing';
    g.player2 = createPlayer('fortress');
    g.player.hp = 3;
    g.player2.hp = 3;
    hurtPlayer(g, g.player2);
    expect(g.player2.hp).toBe(2);
    expect(g.state).toBe('playing');
  });
});

describe('solo hurt', () => {
  it('hurts g.player by default and gameovers at 0 hp', () => {
    const g = createGameData();
    g.state = 'playing';
    g.player.hp = 1;
    hurtPlayer(g);
    expect(g.player.hp).toBe(0);
    expect(g.state).toBe('gameover');
  });

  it('does not gameover while hp remains', () => {
    const g = createGameData();
    g.state = 'playing';
    g.player.hp = 2;
    hurtPlayer(g);
    expect(g.player.hp).toBe(1);
    expect(g.state).toBe('playing');
  });
});
