import type { GameData, Player } from './types';
import { getAircraft } from './aircraft';

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
export function tryActivateSkill(g: GameData, _moveX: number, _moveY: number): boolean {
  const p = g.player;
  if (p.skillCooldown > 0) return false;

  const craft = getAircraft(p.aircraftId);
  switch (craft.skill) {
    case 'missile_salvo':
    case 'dash':
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
