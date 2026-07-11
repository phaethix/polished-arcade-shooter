import type { GameData, Player } from '../types';
import type { InputState } from '../../app/input';
import { CANVAS_W, CANVAS_H } from '../core/constants';
import { addParticles } from '../effects';
import { tryActivateSkill, tickSkills } from '../skills';
import { activateBomb, playerShoot, updateLaserFire } from '../combat';
import { isCoopMode } from '../coop';

export function tickSlowMotion(g: GameData, dt: number): number {
  if (g.slowMotionTimer > 0) {
    g.slowMotionTimer -= dt;
    g.slowMotion = 0.3;
    if (g.slowMotionTimer <= 0) {
      g.slowMotion = 1;
    }
  }
  return g.slowMotion;
}

export function updatePlayerFromInput(g: GameData, input: InputState, dt: number): void {
  const p = g.player;

  let mx = 0;
  let my = 0;
  if (input.left || input.padLeft) mx--;
  if (input.right || input.padRight) mx++;
  if (input.up || input.padUp) my--;
  if (input.down || input.padDown) my++;

  if (mx || my) {
    const l = Math.sqrt(mx * mx + my * my);
    p.x += (mx / l) * p.speed;
    p.y += (my / l) * p.speed;
  }

  if (input.touchActive && input.touchX != null && input.touchY != null) {
    if (input.prevTouchX != null && input.prevTouchY != null) {
      p.x += (input.touchX - input.prevTouchX) * 1.5;
      p.y += (input.touchY - input.prevTouchY) * 1.5;
    }
    input.prevTouchX = input.touchX;
    input.prevTouchY = input.touchY;
  } else {
    input.prevTouchX = input.prevTouchY = null;
  }

  p.x = Math.max(p.width / 2, Math.min(CANVAS_W - p.width / 2, p.x));
  p.y = Math.max(p.height / 2, Math.min(CANVAS_H - p.height / 2, p.y));

  const targetTilt =
    mx * 0.6 +
    (input.touchActive && input.touchX != null && input.prevTouchX != null
      ? Math.max(-1, Math.min(1, (input.touchX - input.prevTouchX) * 0.15))
      : 0);
  p.tilt += (targetTilt - p.tilt) * 0.15;

  const shooting = g.autoFire || input.shoot || input.padShoot || input.touchActive;
  if (p.weaponId === 'laser') {
    updateLaserFire(g, shooting, dt);
  } else if (shooting) {
    p.shootTimer--;
    if (p.shootTimer <= 0) {
      playerShoot(g);
      p.shootTimer = p.shootInterval;
    }
  } else {
    p.shootTimer = Math.min(p.shootTimer, 3);
  }

  if (input.bomb) {
    input.bomb = false;
    activateBomb(g);
  }

  if (input.skill) {
    input.skill = false;
    tryActivateSkill(g, mx, my);
  }

  tickSkills(g, dt);

  p.x = Math.max(p.width / 2, Math.min(CANVAS_W - p.width / 2, p.x));
  p.y = Math.max(p.height / 2, Math.min(CANVAS_H - p.height / 2, p.y));

  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.shieldTimer > 0) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) p.shieldActive = false;
  }
  if (p.grazeTimer > 0) p.grazeTimer -= dt;

  if (Math.random() > 0.3) {
    addParticles(
      g,
      p.x + (Math.random() - 0.5) * 8,
      p.y + p.height / 2 + 2,
      1,
      Math.random() > 0.5 ? '#0af' : '#06f',
      1.5,
      'trail',
      [2, 4],
    );
  }

  if (isCoopMode(g) && g.player2) {
    updateGuestShip(g, g.player2, g.coopGuestInput, dt);
  }
}

/**
 * Drives the co-op guest ship from its synced input snapshot. Skills and bombs stay
 * host-only for now (they hard-code `g.player`); guest gets movement, firing, and timers.
 */
function updateGuestShip(g: GameData, p: Player, input: InputState, dt: number): void {
  let mx = 0;
  let my = 0;
  if (input.left || input.padLeft) mx--;
  if (input.right || input.padRight) mx++;
  if (input.up || input.padUp) my--;
  if (input.down || input.padDown) my++;

  if (mx || my) {
    const l = Math.sqrt(mx * mx + my * my);
    p.x += (mx / l) * p.speed;
    p.y += (my / l) * p.speed;
  }

  p.x = Math.max(p.width / 2, Math.min(CANVAS_W - p.width / 2, p.x));
  p.y = Math.max(p.height / 2, Math.min(CANVAS_H - p.height / 2, p.y));
  p.tilt += (mx * 0.6 - p.tilt) * 0.15;

  const shooting = g.autoFire || input.shoot || input.padShoot;
  if (p.weaponId === 'laser') {
    updateLaserFire(g, shooting, dt, p);
  } else if (shooting) {
    p.shootTimer--;
    if (p.shootTimer <= 0) {
      playerShoot(g, p);
      p.shootTimer = p.shootInterval;
    }
  } else {
    p.shootTimer = Math.min(p.shootTimer, 3);
  }

  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.shieldTimer > 0) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) p.shieldActive = false;
  }
  if (p.grazeTimer > 0) p.grazeTimer -= dt;

  if (Math.random() > 0.3) {
    addParticles(
      g,
      p.x + (Math.random() - 0.5) * 8,
      p.y + p.height / 2 + 2,
      1,
      Math.random() > 0.5 ? '#0af' : '#06f',
      1.5,
      'trail',
      [2, 4],
    );
  }
}
