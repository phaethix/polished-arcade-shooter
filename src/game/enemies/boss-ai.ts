import type { Enemy, GameData } from '../types';
import { ringAngles } from './boss';

function pushEnemyBullet(
  g: GameData,
  x: number,
  y: number,
  vx: number,
  vy: number,
  opts?: { size?: number; color?: string; homingStrength?: number },
): void {
  g.bullets.push({
    x,
    y,
    vx,
    vy,
    width: opts?.size ?? 6,
    height: opts?.size ?? 6,
    damage: 1,
    isPlayer: false,
    color: opts?.color ?? '#f46',
    homingStrength: opts?.homingStrength,
  });
}

function fireFan(g: GameData, e: Enemy, speed: number): void {
  const dx = g.player.x - e.x;
  const dy = g.player.y - e.y;
  for (let i = -2; i <= 2; i++) {
    const a = Math.atan2(dy, dx) + i * 0.25;
    pushEnemyBullet(g, e.x, e.y + e.height / 2, Math.cos(a) * speed, Math.sin(a) * speed, {
      color: '#f46',
    });
  }
}

function fireRain(g: GameData, e: Enemy, speed: number, volley: number): void {
  const y = e.y + e.height / 2;
  if (volley % 3 === 2) {
    const dir = volley % 6 === 2 ? 1 : -1;
    const baseX = dir > 0 ? e.x - e.width / 2 : e.x + e.width / 2;
    for (let i = 0; i < 4; i++) {
      pushEnemyBullet(g, baseX + dir * i * 14, y, dir * (speed * 0.85), speed * 0.35, {
        color: '#fa4',
        size: 5,
      });
    }
    return;
  }
  const count = 5;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = e.x - e.width / 2 + t * e.width;
    pushEnemyBullet(g, x, y, (t - 0.5) * 0.4, speed * 0.95, { color: '#fc6', size: 5 });
  }
}

function fireBroadside(g: GameData, e: Enemy, speed: number, volley: number): void {
  const y = e.y + e.height / 2;
  const side = volley % 2 === 0 ? -1 : 1;
  const originX = e.x + side * (e.width / 2);
  for (let i = -1; i <= 1; i++) {
    pushEnemyBullet(g, originX, y + i * 10, side * speed * 1.05, speed * 0.25 + i * 0.15, {
      color: '#8cf',
      size: 5,
    });
  }
  if (volley % 2 === 1) {
    const dx = g.player.x - e.x;
    const dy = g.player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    pushEnemyBullet(g, e.x, y, (dx / d) * (speed + 0.8), (dy / d) * (speed + 0.8), {
      color: '#4af',
      size: 6,
    });
  }
}

function fireRing(g: GameData, e: Enemy, speed: number, volley: number): void {
  const y = e.y + e.height / 2;
  const ringSpeed = speed * 0.75;
  for (const a of ringAngles(10)) {
    pushEnemyBullet(g, e.x, y, Math.cos(a) * ringSpeed, Math.sin(a) * ringSpeed, {
      color: '#c8f',
      size: 5,
    });
  }
  if (volley % 2 === 1) {
    const dx = g.player.x - e.x;
    const dy = g.player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const slow = speed * 0.45;
    pushEnemyBullet(g, e.x, y, (dx / d) * slow, (dy / d) * slow, {
      color: '#eaf',
      size: 7,
      homingStrength: 0.06,
    });
  }
}

/** Fire one boss volley using the enemy's chapter pattern. */
export function fireBossPattern(g: GameData, e: Enemy): void {
  const speed = 3 + g.wave * 0.1;
  const volley = e.bossVolley ?? 0;
  e.bossVolley = volley + 1;
  const pattern = e.bossPattern ?? 'fan';

  switch (pattern) {
    case 'rain':
      fireRain(g, e, speed, volley);
      break;
    case 'broadside':
      fireBroadside(g, e, speed, volley);
      break;
    case 'ring':
      fireRing(g, e, speed, volley);
      break;
    case 'fan':
    default:
      fireFan(g, e, speed);
      break;
  }
}
