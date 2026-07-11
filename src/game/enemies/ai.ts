import type { Enemy, GameData } from '../types';
import * as sfx from '../audio';
import { getEnemySpeedMult } from '../modes';
import { CANVAS_W } from '../core/constants';
import {
  HEAL_INTERVAL,
  HEAL_RADIUS,
  KAMIKAZE_RUSH_SPEED,
  KAMIKAZE_TRIGGER_DIST,
  SNIPER_AIM_FRAMES,
} from './constants';
import { fireBossPattern } from './boss-ai';

function fireEnemyBullet(
  g: GameData,
  e: Enemy,
  speed: number,
  damage = 1,
  size = 5,
  color = '#f64',
) {
  const p = g.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  g.bullets.push({
    x: e.x,
    y: e.y + e.height / 2,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    width: size,
    height: size,
    damage,
    isPlayer: false,
    color,
  });
}

export function enemyShoot(g: GameData, e: Enemy): void {
  const s = 3 + g.wave * 0.1;
  sfx.playEnemyShoot();

  if (e.type === 'boss') {
    fireBossPattern(g, e);
    return;
  }

  if (e.type === 'sniper') {
    fireEnemyBullet(g, e, s + 2.5, 1, 6, '#f28');
    return;
  }

  if (e.type === 'kamikaze' || e.type === 'healer') return;

  fireEnemyBullet(g, e, s);
}

function tickHealerAuras(g: GameData, dt: number): void {
  const healers = g.enemies.filter((e) => e.type === 'healer');
  if (healers.length === 0) return;

  for (const healer of healers) {
    healer.healPulse = (healer.healPulse ?? 0) + dt;
    if ((healer.healPulse ?? 0) < HEAL_INTERVAL) continue;
    healer.healPulse = 0;

    for (const e of g.enemies) {
      if (e === healer || e.type === 'boss') continue;
      const dx = e.x - healer.x;
      const dy = e.y - healer.y;
      if (dx * dx + dy * dy > HEAL_RADIUS * HEAL_RADIUS) continue;
      if (e.hp >= e.maxHp) continue;
      e.hp = Math.min(e.maxHp, e.hp + 1);
      e.flashTimer = 0.12;
    }
  }
}

function updateKamikaze(e: Enemy, g: GameData, tm: number): void {
  const p = g.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (e.state !== 'rush' && (e.y > 120 || dist < KAMIKAZE_TRIGGER_DIST)) {
    e.state = 'rush';
  }

  if (e.state === 'rush') {
    const d = dist || 1;
    e.x += (dx / d) * KAMIKAZE_RUSH_SPEED * tm;
    e.y += (dy / d) * KAMIKAZE_RUSH_SPEED * tm;
  } else {
    e.y += e.speed * tm;
  }
}

function updateSniperAim(g: GameData, e: Enemy, tm: number): void {
  if (e.state === 'aim') {
    e.aimTimer = (e.aimTimer ?? 0) - tm;
    if ((e.aimTimer ?? 0) <= 0) {
      e.state = 'patrol';
      enemyShoot(g, e);
      e.shootTimer = e.shootInterval;
    }
    return;
  }

  e.shootTimer -= tm;
  if (e.shootTimer <= 0 && e.y > 0) {
    e.state = 'aim';
    e.aimTimer = SNIPER_AIM_FRAMES;
  }
}

export function updateEnemies(g: GameData, dt: number, tm: number): void {
  tickHealerAuras(g, dt);
  const speedMult = getEnemySpeedMult(g);

  for (const e of g.enemies) {
    e.movePhase += 0.03 * tm;
    if (e.flashTimer > 0) e.flashTimer -= dt;

    if (e.type === 'kamikaze') {
      updateKamikaze(e, g, tm * speedMult);
    } else {
      e.y += e.speed * tm * speedMult;
      if (e.movePattern === 'sine') e.x += Math.sin(e.movePhase) * 2 * tm * speedMult;
      else if (e.movePattern === 'zigzag')
        e.x += (Math.sin(e.movePhase * 2) > 0 ? 1.5 : -1.5) * tm * speedMult;
    }

    if (e.type === 'boss' && e.y > 100) {
      e.y = 100;
      e.speed = 0;
      e.movePattern = 'sine';
    } else if (e.type === 'sniper' && e.y > 55) {
      e.y = 55;
      e.speed = 0;
    } else if (e.type === 'healer' && e.y > 75) {
      e.y = 75;
      e.speed = 0;
      e.movePattern = 'sine';
    }

    e.x = Math.max(e.width / 2, Math.min(CANVAS_W - e.width / 2, e.x));

    if (e.type === 'sniper') {
      updateSniperAim(g, e, tm);
      continue;
    }

    if (e.type === 'kamikaze' || e.type === 'healer') continue;

    e.shootTimer -= tm;
    if (e.shootTimer <= 0 && e.y > 0) {
      enemyShoot(g, e);
      e.shootTimer = e.shootInterval;
    }
  }
}
