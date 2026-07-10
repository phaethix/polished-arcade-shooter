import type { GameData, Hazard } from './types';
import { getChapter } from './chapters';
import * as sfx from './audio';
import { CANVAS_W, CANVAS_H } from './core/constants';
import { boxesOverlap } from './core/collision';

const MAX_ASTEROIDS = 5;

function spawnAsteroid(g: GameData): void {
  const size = 18 + Math.random() * 16;
  g.hazards.push({
    type: 'asteroid',
    x: 30 + Math.random() * (CANVAS_W - 60),
    y: -size,
    width: size,
    height: size,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 2 + Math.random() * 2,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.06,
  });
}

function spawnTurrets(g: GameData): void {
  const slots = [
    { x: 36, y: 140 },
    { x: CANVAS_W - 36, y: 220 },
    { x: 56, y: 320 },
  ];
  for (const slot of slots) {
    g.hazards.push({
      type: 'turret',
      x: slot.x,
      y: slot.y,
      width: 28,
      height: 28,
      shootTimer: 40 + Math.random() * 40,
      shootInterval: 70 + Math.random() * 30,
      side: slot.x < CANVAS_W / 2 ? -1 : 1,
    });
  }
}

function spawnTeleporters(g: GameData): void {
  g.hazards.push(
    {
      type: 'teleporter',
      x: 100,
      y: CANVAS_H * 0.45,
      width: 44,
      height: 44,
      padId: 0,
      pulse: 0,
    },
    {
      type: 'teleporter',
      x: CANVAS_W - 100,
      y: CANVAS_H * 0.62,
      width: 44,
      height: 44,
      padId: 1,
      pulse: Math.PI,
    },
  );
}

export function initChapterHazards(g: GameData): void {
  g.hazards = [];
  g.hazardSpawnTimer = 0;
  const hazardType = getChapter(g.chapterId).hazardType;
  if (hazardType === 'turret') spawnTurrets(g);
  else if (hazardType === 'teleporter') spawnTeleporters(g);
}

function fireTurret(g: GameData, h: Hazard): void {
  const p = g.player;
  const dx = p.x - h.x;
  const dy = p.y - h.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const s = 3.5 + g.wave * 0.08;
  sfx.playEnemyShoot();
  g.bullets.push({
    x: h.x,
    y: h.y,
    vx: (dx / d) * s,
    vy: (dy / d) * s,
    width: 5,
    height: 5,
    damage: 1,
    isPlayer: false,
    color: '#f84',
  });
}

function tryTeleport(g: GameData, pad: Hazard): void {
  const other = g.hazards.find(h => h.type === 'teleporter' && h.padId !== pad.padId);
  if (!other) return;
  const p = g.player;
  p.x = other.x;
  p.y = other.y;
  p.invincibleTimer = 0.6;
  sfx.playPowerUp();
  for (let i = 0; i < 12; i++) {
    g.particles.push({
      x: p.x,
      y: p.y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 0.35,
      maxLife: 0.35,
      size: 2 + Math.random() * 2,
      color: '#c8f',
      type: 'spark',
    });
  }
  for (const h of g.hazards) {
    if (h.type === 'teleporter') h.cooldown = 1.2;
  }
}

export function updateHazards(g: GameData, dt: number, tm: number): void {
  const chapter = getChapter(g.chapterId);

  if (chapter.hazardType === 'asteroid') {
    g.hazardSpawnTimer -= tm;
    const count = g.hazards.filter(h => h.type === 'asteroid').length;
    if (g.hazardSpawnTimer <= 0 && count < MAX_ASTEROIDS) {
      spawnAsteroid(g);
      g.hazardSpawnTimer = 50 + Math.random() * 40;
    }
  }

  for (const h of g.hazards) {
    if (h.cooldown && h.cooldown > 0) h.cooldown -= dt;
  }

  for (let i = g.hazards.length - 1; i >= 0; i--) {
    const h = g.hazards[i];

    if (h.type === 'asteroid') {
      h.x += (h.vx ?? 0) * tm;
      h.y += (h.vy ?? 0) * tm;
      h.rot = (h.rot ?? 0) + (h.rotSpeed ?? 0) * tm;
      if (h.y > CANVAS_H + 40) g.hazards.splice(i, 1);
      continue;
    }

    if (h.type === 'turret') {
      h.shootTimer = (h.shootTimer ?? 0) - tm;
      if ((h.shootTimer ?? 0) <= 0) {
        fireTurret(g, h);
        h.shootTimer = h.shootInterval ?? 80;
      }
      continue;
    }

    if (h.type === 'teleporter') {
      h.pulse = (h.pulse ?? 0) + dt * 3;
    }
  }
}

export function drawHazards(ctx: CanvasRenderingContext2D, g: GameData): void {
  for (const h of g.hazards) {
    ctx.save();
    ctx.translate(h.x, h.y);

    if (h.type === 'asteroid') {
      ctx.rotate(h.rot ?? 0);
      ctx.fillStyle = '#876';
      ctx.beginPath();
      const r = h.width / 2;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rr = r * (0.75 + Math.sin(i * 2.1) * 0.2);
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a98';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (h.type === 'turret') {
      ctx.fillStyle = '#422';
      ctx.fillRect(-h.width / 2, -h.height / 2, h.width, h.height);
      ctx.fillStyle = '#f44';
      const side = h.side ?? 1;
      ctx.fillRect(side > 0 ? -4 : 0, -3, 8, 6);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.arc(0, 0, h.width * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (h.type === 'teleporter') {
      const pulse = 0.6 + Math.sin(h.pulse ?? 0) * 0.25;
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.2;
      ctx.strokeStyle = '#c8f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, h.width / 2 + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pulse * 0.5;
      ctx.fillStyle = '#a6f';
      ctx.beginPath();
      ctx.arc(0, 0, h.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#eef';
      ctx.font = '10px "Segoe UI",Arial,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◇', 0, 4);
    }

    ctx.restore();
  }
}

export interface HazardCollisionResult {
  playerDied: boolean;
}

export function handleHazardCollisions(
  g: GameData,
  isPlayerVulnerable: (p: GameData['player']) => boolean,
  hurtPlayer: () => void,
): HazardCollisionResult {
  const p = g.player;
  if (!isPlayerVulnerable(p)) return { playerDied: false };

  for (const h of g.hazards) {
    if (h.type === 'teleporter') {
      if ((h.cooldown ?? 0) > 0) continue;
      if (!boxesOverlap(p.x, p.y, p.width * 0.5, p.height * 0.5, h.x, h.y, h.width, h.height)) continue;
      tryTeleport(g, h);
      return { playerDied: false };
    }

    if (h.type === 'asteroid') {
      if (!boxesOverlap(p.x, p.y, p.width * 0.4, p.height * 0.4, h.x, h.y, h.width, h.height)) continue;
      hurtPlayer();
      return { playerDied: p.hp <= 0 };
    }
  }

  return { playerDied: false };
}
