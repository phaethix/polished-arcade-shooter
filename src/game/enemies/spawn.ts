import type { Enemy, EnemyType, GameData } from '../types';
import type { Rng } from '../core/rng';
import { getBossHp, getEnemyHpMult, getSpawnPoolOverride, isBossWave } from '../modes';
import { CANVAS_W } from '../core/constants';
import { addParticles } from '../effects';

function buildSpawnPool(g: GameData): EnemyType[] {
  const override = getSpawnPoolOverride(g);
  if (override) return override;

  const w = g.wave;
  const pool: EnemyType[] = ['basic', 'basic', 'basic'];
  if (w >= 2) pool.push('fast');
  if (w >= 3) {
    pool.push('tank');
    pool.push('kamikaze');
  }
  if (w >= 4) pool.push('splitter');
  if (w >= 5) pool.push('shielded');
  if (w >= 6 && !isBossWave(g) && !g.specialSpawns.sniper) pool.push('sniper');
  if (w >= 8 && !isBossWave(g) && !g.specialSpawns.healer) pool.push('healer');
  return pool;
}

function baseEnemy(
  rng: Rng,
  partial: Partial<Enemy> &
    Pick<
      Enemy,
      | 'type'
      | 'x'
      | 'y'
      | 'width'
      | 'height'
      | 'hp'
      | 'maxHp'
      | 'speed'
      | 'shootInterval'
      | 'scoreValue'
    >,
): Enemy {
  return {
    shootTimer: 60 + rng.next() * 60,
    movePattern: 'straight',
    movePhase: rng.next() * Math.PI * 2,
    flashTimer: 0,
    ...partial,
  };
}

function createEnemy(type: EnemyType, wave: number, rng: Rng): Enemy {
  const pats: Enemy['movePattern'][] = ['straight', 'sine', 'zigzag'];
  const pat = pats[Math.floor(rng.next() * pats.length)];

  switch (type) {
    case 'fast':
      return baseEnemy(rng, {
        type,
        x: 30 + rng.next() * (CANVAS_W - 60),
        y: -30,
        width: 24,
        height: 24,
        hp: 1,
        maxHp: 1,
        speed: 3 + rng.next(),
        shootInterval: 80,
        scoreValue: 150,
        movePattern: pat,
      });
    case 'tank': {
      const hp = 5 + Math.floor(wave / 2);
      return baseEnemy(rng, {
        type,
        x: 40 + rng.next() * (CANVAS_W - 80),
        y: -40,
        width: 40,
        height: 40,
        hp,
        maxHp: hp,
        speed: 0.8 + rng.next() * 0.5,
        shootInterval: 50,
        scoreValue: 300,
        movePattern: 'straight',
      });
    }
    case 'splitter': {
      const hp = 3 + Math.floor(wave / 4);
      return baseEnemy(rng, {
        type,
        x: 30 + rng.next() * (CANVAS_W - 60),
        y: -36,
        width: 34,
        height: 34,
        hp,
        maxHp: hp,
        speed: 1 + rng.next() * 0.5,
        shootInterval: 70,
        scoreValue: 220,
        movePattern: 'sine',
      });
    }
    case 'sniper':
      return baseEnemy(rng, {
        type,
        x: 50 + rng.next() * (CANVAS_W - 100),
        y: -40,
        width: 30,
        height: 30,
        hp: 2,
        maxHp: 2,
        speed: 0.6,
        shootInterval: 110,
        scoreValue: 350,
        movePattern: 'straight',
        state: 'patrol',
      });
    case 'shielded': {
      const hp = 8 + Math.floor(wave / 2);
      return baseEnemy(rng, {
        type,
        x: 40 + rng.next() * (CANVAS_W - 80),
        y: -44,
        width: 38,
        height: 38,
        hp,
        maxHp: hp,
        speed: 0.7 + rng.next() * 0.3,
        shootInterval: 65,
        scoreValue: 280,
        movePattern: 'straight',
      });
    }
    case 'kamikaze':
      return baseEnemy(rng, {
        type,
        x: 20 + rng.next() * (CANVAS_W - 40),
        y: -28,
        width: 26,
        height: 26,
        hp: 2,
        maxHp: 2,
        speed: 1.4 + rng.next() * 0.6,
        shootInterval: 9999,
        scoreValue: 180,
        movePattern: 'straight',
        state: 'patrol',
      });
    case 'healer':
      return baseEnemy(rng, {
        type,
        x: 60 + rng.next() * (CANVAS_W - 120),
        y: -36,
        width: 32,
        height: 32,
        hp: 4,
        maxHp: 4,
        speed: 0.5,
        shootInterval: 120,
        scoreValue: 400,
        movePattern: 'sine',
        healPulse: 0,
      });
    case 'mini':
      return baseEnemy(rng, {
        type,
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        hp: 1,
        maxHp: 1,
        speed: 2.5 + rng.next(),
        shootInterval: 100,
        scoreValue: 75,
        movePattern: 'zigzag',
      });
    default: {
      const hp = 1 + Math.floor(wave / 3);
      return baseEnemy(rng, {
        type: 'basic',
        x: 20 + rng.next() * (CANVAS_W - 40),
        y: -30,
        width: 28,
        height: 28,
        hp,
        maxHp: hp,
        speed: 1.2 + rng.next() * 0.8 + wave * 0.05,
        shootInterval: Math.max(50, 90 - wave * 3),
        scoreValue: 100,
        movePattern: pat,
      });
    }
  }
}

export function spawnEnemy(g: GameData): void {
  const w = g.wave;
  if (isBossWave(g) && g.enemiesSpawned === 0) {
    const hp = getBossHp(g);
    g.enemies.push(
      baseEnemy(g.rng, {
        type: 'boss',
        x: CANVAS_W / 2,
        y: -60,
        width: 64,
        height: 56,
        hp,
        maxHp: hp,
        speed: 0.5,
        shootTimer: 40,
        shootInterval: 25,
        movePattern: 'sine',
        scoreValue: 2000,
      }),
    );
    g.enemiesSpawned++;
    return;
  }

  const pool = buildSpawnPool(g);
  const type = pool[Math.floor(g.rng.next() * pool.length)];
  if (type === 'sniper') g.specialSpawns.sniper = true;
  if (type === 'healer') g.specialSpawns.healer = true;
  const enemy = createEnemy(type, w, g.rng);
  const hpMult = getEnemyHpMult(g);
  if (hpMult !== 1) {
    enemy.hp = Math.max(1, Math.round(enemy.hp * hpMult));
    enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * hpMult));
  }
  g.enemies.push(enemy);
  g.enemiesSpawned++;
}

export function spawnSplitterChildren(g: GameData, x: number, y: number): void {
  for (const ox of [-18, 18]) {
    const mini = createEnemy('mini', g.wave, g.rng);
    mini.x = x + ox;
    mini.y = y;
    g.enemies.push(mini);
  }
  addParticles(g, x, y, 8, '#a6f', 2, 'spark', [2, 4]);
}
