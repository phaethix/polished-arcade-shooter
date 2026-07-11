import { describe, it, expect } from 'vitest';
import { fireBossPattern } from './boss-ai';
import { createGameData } from '../engine';
import type { Enemy } from '../types';

function makeBoss(pattern: Enemy['bossPattern']): Enemy {
  return {
    type: 'boss',
    x: 180,
    y: 100,
    width: 64,
    height: 56,
    hp: 50,
    maxHp: 50,
    speed: 0.5,
    shootTimer: 0,
    shootInterval: 25,
    movePattern: 'sine',
    movePhase: 0,
    flashTimer: 0,
    scoreValue: 2000,
    bossPattern: pattern,
    bossVolley: 0,
  };
}

describe('fireBossPattern', () => {
  it('fires a 5-bullet fan for space bosses', () => {
    const g = createGameData();
    g.player.x = 180;
    g.player.y = 400;
    fireBossPattern(g, makeBoss('fan'));
    expect(g.bullets.filter((b) => !b.isPlayer)).toHaveLength(5);
  });

  it('fires a downward rain for asteroid bosses', () => {
    const g = createGameData();
    fireBossPattern(g, makeBoss('rain'));
    const enemy = g.bullets.filter((b) => !b.isPlayer);
    expect(enemy).toHaveLength(5);
    expect(enemy.every((b) => b.vy > 0)).toBe(true);
  });

  it('fires a ring of 10 bullets for wormhole bosses', () => {
    const g = createGameData();
    fireBossPattern(g, makeBoss('ring'));
    expect(g.bullets.filter((b) => !b.isPlayer)).toHaveLength(10);
  });

  it('adds a slow homing pellet on odd ring volleys', () => {
    const g = createGameData();
    const boss = makeBoss('ring');
    boss.bossVolley = 1;
    fireBossPattern(g, boss);
    const homing = g.bullets.filter((b) => !b.isPlayer && b.homingStrength);
    expect(homing).toHaveLength(1);
    expect(homing[0].homingStrength).toBeLessThanOrEqual(0.1);
  });

  it('alternates broadside sides across volleys', () => {
    const g = createGameData();
    const boss = makeBoss('broadside');
    fireBossPattern(g, boss);
    const first = g.bullets.filter((b) => !b.isPlayer);
    expect(first).toHaveLength(3);
    expect(first.every((b) => b.vx < 0)).toBe(true);

    g.bullets.length = 0;
    fireBossPattern(g, boss);
    const second = g.bullets.filter((b) => !b.isPlayer);
    expect(second.length).toBeGreaterThanOrEqual(3);
    expect(second.some((b) => b.vx > 0)).toBe(true);
  });
});
