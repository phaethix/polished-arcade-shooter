import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EnemyType } from '../types';
import { createGameData, resetGame } from '../engine';
import { spawnEnemy } from '../enemies';
import { pickDailyModifier } from '../modes';
import { createRng } from './rng';

/** Minimal in-memory localStorage mock for node test environment. */
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

function runSpawns(seed: number): EnemyType[] {
  const g = createGameData();
  g.gameMode = 'daily';
  resetGame(g);
  // initModeState stamps today's date onto dailySeed; pin it for the test.
  g.dailySeed = seed;
  g.dailyModifier = pickDailyModifier(seed);
  g.rng = createRng(seed);
  g.wave = 3;
  g.enemiesPerWave = 10;
  g.enemiesSpawned = 0;
  g.enemies = [];
  g.specialSpawns = { sniper: false, healer: false };

  const types: EnemyType[] = [];
  for (let i = 0; i < 8; i++) {
    spawnEnemy(g);
    types.push(g.enemies[g.enemies.length - 1].type);
  }
  return types;
}

describe('daily seeded rng determinism', () => {
  it('spawns the same enemy types for the same daily seed', () => {
    expect(runSpawns(20260711)).toEqual(runSpawns(20260711));
  });

  it('spawns a different type sequence for a different seed', () => {
    expect(runSpawns(20260711)).not.toEqual(runSpawns(20260101));
  });

  it('produces the same enemy stats, not just types, for the same seed', () => {
    const g1 = createGameData();
    g1.gameMode = 'daily';
    resetGame(g1);
    g1.dailySeed = 42;
    g1.dailyModifier = pickDailyModifier(42);
    g1.rng = createRng(42);
    g1.wave = 3;

    const g2 = createGameData();
    g2.gameMode = 'daily';
    resetGame(g2);
    g2.dailySeed = 42;
    g2.dailyModifier = pickDailyModifier(42);
    g2.rng = createRng(42);
    g2.wave = 3;

    for (let i = 0; i < 5; i++) {
      spawnEnemy(g1);
      spawnEnemy(g2);
    }
    expect(g1.enemies).toEqual(g2.enemies);
  });
});
