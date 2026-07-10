import type { GameData } from '../types';
import { CANVAS_W, CANVAS_H, MAX_PARTICLES } from '../core/constants';
import { updateHomingBullets } from '../skills';
import { updateBulletTravel } from '../weapons';

export function updateBullets(g: GameData, dt: number, tm: number): void {
  for (const b of g.bullets) {
    const m = b.isPlayer ? 1 : tm;
    b.x += b.vx * m;
    b.y += b.vy * m;
    if (b.isPlayer && Math.random() > 0.65 && g.particles.length < MAX_PARTICLES) {
      g.particles.push({
        x: b.x,
        y: b.y + 4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random(),
        life: 0.12,
        maxLife: 0.12,
        size: 2,
        color: '#0ff8',
        type: 'trail',
      });
    }
  }
  updateHomingBullets(g, dt);
  updateBulletTravel(g);
  g.bullets = g.bullets.filter(
    (b) => b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20,
  );
}
