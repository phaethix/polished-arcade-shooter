import type { Enemy, Bullet } from '../types';

export function blocksCenterShot(e: Enemy, shotX: number): boolean {
  if (e.type !== 'shielded') return false;
  return Math.abs(shotX - e.x) < e.width * 0.38;
}

export function isFrontalShieldBlock(e: Enemy, b: Bullet): boolean {
  if (e.type !== 'shielded') return false;
  // Shield faces downward toward the player; block upward-traveling center hits.
  if (b.vy >= 0) return false;
  return blocksCenterShot(e, b.x);
}

export function kamikazeExplosionRadius(): number {
  return 55;
}

export function isKamikazeBlastHit(e: Enemy, px: number, py: number): boolean {
  const r = kamikazeExplosionRadius();
  const dx = px - e.x;
  const dy = py - e.y;
  return dx * dx + dy * dy <= r * r;
}
