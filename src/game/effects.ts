import type { GameData, Particle } from './types';
import { MAX_PARTICLES } from './core/constants';

export function shake(g: GameData, intensity: number, duration: number): void {
  const cur = g.screenShake.intensity * (g.screenShake.timer / (g.screenShake.duration || 1));
  if (intensity > cur) g.screenShake = { intensity, duration, timer: duration };
}

export function addParticles(
  g: GameData,
  x: number,
  y: number,
  n: number,
  color: string,
  spd = 3,
  type: Particle['type'] = 'explosion',
  sz: [number, number] = [2, 5],
): void {
  for (let i = 0; i < n && g.particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.5 + Math.random()) * spd;
    const l = 0.35 + Math.random() * 0.55;
    g.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: l,
      maxLife: l,
      size: sz[0] + Math.random() * (sz[1] - sz[0]),
      color,
      type,
    });
  }
}

export function addRing(g: GameData, x: number, y: number, color: string, maxR: number): void {
  if (g.particles.length >= MAX_PARTICLES) return;
  g.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.4,
    maxLife: 0.4,
    size: 2,
    color,
    type: 'ring',
    startSize: maxR,
  });
}

export function addScorePopup(
  g: GameData,
  x: number,
  y: number,
  text: string,
  color = '#fff',
): void {
  if (g.particles.length >= MAX_PARTICLES) return;
  g.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 0.5,
    vy: -1.5,
    life: 0.8,
    maxLife: 0.8,
    size: 12,
    color,
    type: 'score',
    text,
  });
}
