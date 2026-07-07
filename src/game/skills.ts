import type { GameData, Player, Enemy } from './types';
import { getAircraft } from './aircraft';
import * as sfx from './audio';

const MISSILE_COUNT = 5;
const MISSILE_SPEED = 9;

function nearestEnemies(g: GameData, count: number): Enemy[] {
  const p = g.player;
  return [...g.enemies]
    .sort((a, b) => {
      const da = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
      const db = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      return da - db;
    })
    .slice(0, count);
}

export function updateHomingBullets(g: GameData, dt: number) {
  for (const b of g.bullets) {
    if (!b.isPlayer || !b.homingStrength) continue;

    let target: Enemy | null = null;
    let bestDist = Infinity;
    for (const e of g.enemies) {
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        target = e;
      }
    }
    if (!target) continue;

    const dx = target.x - b.x;
    const dy = target.y - b.y;
    const current = Math.atan2(b.vy, b.vx);
    let desired = Math.atan2(dy, dx);
    let delta = desired - current;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    const turn = b.homingStrength * dt * 4;
    const next = current + Math.max(-turn, Math.min(turn, delta));
    const speed = Math.hypot(b.vx, b.vy) || MISSILE_SPEED;
    b.vx = Math.cos(next) * speed;
    b.vy = Math.sin(next) * speed;
  }
}

function activateMissileSalvo(g: GameData): boolean {
  const p = g.player;
  const targets = nearestEnemies(g, MISSILE_COUNT);

  for (let i = 0; i < MISSILE_COUNT; i++) {
    const spread = (i - (MISSILE_COUNT - 1) / 2) * 0.18;
    const angle = -Math.PI / 2 + spread;
    g.bullets.push({
      x: p.x + Math.cos(angle) * 6,
      y: p.y - p.height / 2,
      vx: Math.cos(angle) * MISSILE_SPEED,
      vy: Math.sin(angle) * MISSILE_SPEED,
      width: 5,
      height: 10,
      damage: 2,
      isPlayer: true,
      color: '#f84',
      homingStrength: targets.length ? 0.12 : 0.04,
    });
  }

  startSkillCooldown(p);
  sfx.playPowerUp();
  return true;
}

function activateDash(g: GameData, moveX: number, moveY: number): boolean {
  const p = g.player;
  let dx = moveX;
  let dy = moveY;
  if (!dx && !dy) dy = -1;

  const len = Math.hypot(dx, dy) || 1;
  p.dashVx = (dx / len) * 16;
  p.dashVy = (dy / len) * 16;
  p.skillActiveTimer = 0.22;
  startSkillCooldown(p);
  sfx.playMenuSelect();

  g.particles.push({
    x: p.x, y: p.y,
    vx: -p.dashVx * 0.15, vy: -p.dashVy * 0.15,
    life: 0.25, maxLife: 0.25,
    size: 4, color: '#c8f', type: 'trail',
  });

  return true;
}

/** True when the player can take damage from bullets or collisions. */
export function isPlayerVulnerable(p: Player): boolean {
  return p.invincibleTimer <= 0 && p.skillActiveTimer <= 0;
}

export function tickSkills(g: GameData, dt: number) {
  const p = g.player;

  if (p.skillCooldown > 0) {
    p.skillCooldown = Math.max(0, p.skillCooldown - dt);
  }

  if (p.skillActiveTimer > 0) {
    p.skillActiveTimer = Math.max(0, p.skillActiveTimer - dt);
    p.x += p.dashVx * dt * 60;
    p.y += p.dashVy * dt * 60;
  }

  if (p.skillShieldTimer > 0) {
    p.skillShieldTimer -= dt;
    if (p.skillShieldTimer <= 0) {
      p.skillShieldActive = false;
      p.skillAbsorbedHits = 0;
    }
  }
}

/**
 * Attempt to activate the current aircraft skill.
 * Returns true when the skill fires (cooldown applied).
 */
export function tryActivateSkill(g: GameData, moveX: number, moveY: number): boolean {
  const p = g.player;
  if (p.skillCooldown > 0) return false;

  const craft = getAircraft(p.aircraftId);
  switch (craft.skill) {
    case 'missile_salvo':
      return activateMissileSalvo(g);
    case 'dash':
      return activateDash(g, moveX, moveY);
    case 'energy_shield':
      return false;
    default:
      return false;
  }
}

export function getSkillCooldownRatio(p: Player): number {
  const craft = getAircraft(p.aircraftId);
  if (craft.skillCooldown <= 0) return 1;
  return 1 - p.skillCooldown / craft.skillCooldown;
}

export function drawSkillIndicator(
  ctx: CanvasRenderingContext2D,
  p: Player,
  x: number,
  y: number,
) {
  const craft = getAircraft(p.aircraftId);
  const ready = p.skillCooldown <= 0;
  const ratio = getSkillCooldownRatio(p);
  const radius = 14;

  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = ready ? '#ffffff18' : '#00000055';
  ctx.fill();
  ctx.strokeStyle = ready ? '#8ef' : '#556';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (!ready) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.closePath();
    ctx.fillStyle = '#4af5';
    ctx.fill();
  }

  ctx.fillStyle = ready ? '#fff' : '#889';
  ctx.font = 'bold 10px "Segoe UI",Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', 0, 1);

  ctx.fillStyle = '#889';
  ctx.font = '8px "Segoe UI",Arial,sans-serif';
  ctx.fillText(craft.skillName.split(' ')[0].toUpperCase(), 0, radius + 10);

  ctx.restore();
}

export function startSkillCooldown(p: Player) {
  p.skillCooldown = getAircraft(p.aircraftId).skillCooldown;
}
