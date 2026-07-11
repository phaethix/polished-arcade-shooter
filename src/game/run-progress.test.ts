import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameData } from './engine';
import { createPlayer } from './player-factory';
import { awardRunCoins } from './run-progress';
import { loadCoins, _resetProgressCache } from './progress';

/** Minimal in-memory localStorage mock so coin persistence is controllable. */
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
  _resetProgressCache();
});

describe('awardRunCoins', () => {
  it('adds coins and tracks them on the run for solo play', () => {
    const g = createGameData();
    g.state = 'playing';
    awardRunCoins(g, 10);
    expect(loadCoins()).toBe(10);
    expect(g.runCoinsEarned).toBe(10);
  });

  it('persists coins for the coop host', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'host';
    g.state = 'playing';
    awardRunCoins(g, 25);
    expect(loadCoins()).toBe(25);
    expect(g.runCoinsEarned).toBe(25);
  });

  it('does not persist coins for the coop guest', () => {
    const g = createGameData();
    g.gameMode = 'coop_endless';
    g.coopRole = 'guest';
    g.player2 = createPlayer('phantom');
    g.state = 'playing';
    awardRunCoins(g, 25);
    expect(loadCoins()).toBe(0);
    expect(g.runCoinsEarned).toBe(0);
  });
});
