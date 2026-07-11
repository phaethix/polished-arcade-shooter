import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameData } from './engine';
import { createPlayer } from './player-factory';
import { hurtPlayer, killPlayer, endCoopRunForDisconnect } from './combat';
import { loadHighScores } from './storage/highscores';

/** Minimal in-memory localStorage mock so high-score persistence is controllable. */
function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorage());
});

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

describe('coop meta persistence', () => {
  it('saves a high score when the host is killed', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    g.state = 'playing';
    g.score = 500;
    killPlayer(g);
    expect(loadHighScores()).toHaveLength(1);
  });

  it('does not save a high score when the guest is killed', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    g.player2 = createPlayer('phantom');
    g.state = 'playing';
    g.score = 500;
    killPlayer(g);
    expect(loadHighScores()).toHaveLength(0);
  });
});

describe('endCoopRunForDisconnect', () => {
  it('ends the run and saves a high score for the host', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    g.state = 'playing';
    g.score = 250;
    endCoopRunForDisconnect(g);
    expect(g.state).toBe('gameover');
    expect(loadHighScores()).toHaveLength(1);
  });

  it('ends the run without saving a high score for the guest', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    g.player2 = createPlayer('phantom');
    g.state = 'paused';
    g.score = 250;
    endCoopRunForDisconnect(g);
    expect(g.state).toBe('gameover');
    expect(loadHighScores()).toHaveLength(0);
  });

  it('is a no-op outside an active run', () => {
    const g = createGameData();
    g.state = 'menu';
    endCoopRunForDisconnect(g);
    expect(g.state).toBe('menu');
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
