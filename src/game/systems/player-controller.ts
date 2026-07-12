import type { CoopInputCommand, GameData, Player } from '../types';
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
 * Pure movement step for the co-op guest ship. Shared by the host simulator
 * (`updateGuestShip`) and the guest's local prediction (and snapshot
 * reconciliation) so every side computes the identical position from the same
 * input. Returns the new coordinates instead of mutating, which lets prediction
 * replay a log of past inputs without disturbing the live `Player`.
 */
export function advanceGuestPosition(
  p: { x: number; y: number; tilt: number; width: number; height: number; speed: number },
  cmd: CoopInputCommand,
): { x: number; y: number; tilt: number } {
  let mx = 0;
  let my = 0;
  if (cmd.left) mx--;
  if (cmd.right) mx++;
  if (cmd.up) my--;
  if (cmd.down) my++;

  let x = p.x;
  let y = p.y;
  if (mx || my) {
    const l = Math.sqrt(mx * mx + my * my);
    x += (mx / l) * p.speed;
    y += (my / l) * p.speed;
  }

  x += cmd.touchDx;
  y += cmd.touchDy;

  x = Math.max(p.width / 2, Math.min(CANVAS_W - p.width / 2, x));
  y = Math.max(p.height / 2, Math.min(CANVAS_H - p.height / 2, y));
  const targetTilt = mx * 0.6;
  const tilt = p.tilt + (targetTilt - p.tilt) * 0.15;
  return { x, y, tilt };
}

/** Host sim: applies a guest movement command to `p` in place. */
export function stepGuestMovement(p: Player, cmd: CoopInputCommand): void {
  const moved = advanceGuestPosition(p, cmd);
  p.x = moved.x;
  p.y = moved.y;
  p.tilt = moved.tilt;
}

/**
 * Drives the co-op guest ship from its synced input: movement (keys + pointer
 * deltas), firing, and bomb. Active skills stay host-only for now (`tryActivateSkill`
 * hard-codes `g.player`); the guest's `skill` input flag is relayed but has no effect yet.
 */
function updateGuestShip(g: GameData, p: Player, input: InputState, dt: number): void {
  const cmd: CoopInputCommand = {
    left: input.left || input.padLeft,
    right: input.right || input.padRight,
    up: input.up || input.padUp,
    down: input.down || input.padDown,
    touchDx: input.touchDx,
    touchDy: input.touchDy,
  };
  stepGuestMovement(p, cmd);
  // Consume the one-shot pointer delta so a stale value is not re-applied on the
  // next tick before the next input message arrives.
  input.touchDx = 0;
  input.touchDy = 0;

  // Do not inherit the host's autoFire toggle — guest fire comes only from their input.
  const shooting = input.shoot || input.padShoot;
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

  if (input.bomb) {
    input.bomb = false;
    activateBomb(g, p);
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
