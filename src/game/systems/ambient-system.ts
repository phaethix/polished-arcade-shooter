import type { GameData } from '../types';
import { CANVAS_W, CANVAS_H } from '../core/constants';

export function updateAmbientEffects(g: GameData, dt: number, tm: number): void {
  const p = g.player;

  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) {
      g.combo = 0;
    }
  }

  const hpRatio = p.hp / p.maxHp;
  if (hpRatio <= 0.34) {
    g.dangerAlpha = 0.15 + Math.sin(g.frameCount * 0.08) * 0.1;
  } else {
    g.dangerAlpha *= 0.9;
  }

  if (g.screenShake.timer > 0) {
    g.screenShake.timer--;
  }
  if (g.flashAlpha > 0) {
    g.flashAlpha -= 0.04;
    if (g.flashAlpha < 0) {
      g.flashAlpha = 0;
    }
  }

  for (let i = g.particles.length - 1; i >= 0; i--) {
    const pt = g.particles[i];
    pt.x += pt.vx * tm;
    pt.y += pt.vy * tm;
    pt.life -= dt * (pt.type === 'score' ? 1 : tm);
    if (pt.type === 'trail') {
      pt.vy += 0.1;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
    } else if (pt.type === 'ember') {
      pt.vy += 0.04;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
    } else {
      pt.vx *= 0.96;
      pt.vy *= 0.96;
    }
    if (pt.life <= 0) {
      g.particles.splice(i, 1);
    }
  }

  for (const s of g.stars) {
    s.y += s.speed * tm;
    if (s.y > CANVAS_H) {
      s.y = -2;
      s.x = Math.random() * CANVAS_W;
    }
  }
  for (const n of g.nebulae) {
    n.y += n.speed * tm;
    if (n.y - n.radius > CANVAS_H) {
      n.y = -n.radius;
      n.x = Math.random() * CANVAS_W;
    }
  }
}

export function updateBackgroundAmbient(g: GameData, dt: number): void {
  for (const s of g.stars) {
    s.y += s.speed;
    if (s.y > CANVAS_H) {
      s.y = -2;
      s.x = Math.random() * CANVAS_W;
    }
  }
  for (const n of g.nebulae) {
    n.y += n.speed;
    if (n.y - n.radius > CANVAS_H) {
      n.y = -n.radius;
      n.x = Math.random() * CANVAS_W;
    }
  }
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const pt = g.particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life -= dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    if (pt.life <= 0) {
      g.particles.splice(i, 1);
    }
  }
  if (g.screenShake.timer > 0) {
    g.screenShake.timer--;
  }
  if (g.flashAlpha > 0) {
    g.flashAlpha -= 0.04;
    if (g.flashAlpha < 0) {
      g.flashAlpha = 0;
    }
  }
  g.dangerAlpha *= 0.92;
}
