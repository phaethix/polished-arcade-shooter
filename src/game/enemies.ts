import type { Enemy, EnemyType, GameData, Bullet } from './types';
import * as sfx from './audio';
import { getBossHp, getEnemySpeedMult, getSpawnPoolOverride, isBossWave } from './modes';
import { CANVAS_W } from './core/constants';
import { addParticles } from './effects';

const HEAL_RADIUS = 100;
const HEAL_INTERVAL = 2;
const KAMIKAZE_RUSH_SPEED = 5.5;
const KAMIKAZE_TRIGGER_DIST = 160;
const SNIPER_AIM_FRAMES = 50;

function buildSpawnPool(g: GameData): EnemyType[] {
  const override = getSpawnPoolOverride(g);
  if (override) return override;

  const w = g.wave;
  const pool: EnemyType[] = ['basic', 'basic', 'basic'];
  if (w >= 2) pool.push('fast');
  if (w >= 3) { pool.push('tank'); pool.push('kamikaze'); }
  if (w >= 4) pool.push('splitter');
  if (w >= 5) pool.push('shielded');
  if (w >= 6 && !isBossWave(g) && !g.specialSpawns.sniper) pool.push('sniper');
  if (w >= 8 && !isBossWave(g) && !g.specialSpawns.healer) pool.push('healer');
  return pool;
}

function baseEnemy(partial: Partial<Enemy> & Pick<Enemy, 'type' | 'x' | 'y' | 'width' | 'height' | 'hp' | 'maxHp' | 'speed' | 'shootInterval' | 'scoreValue'>): Enemy {
  return {
    shootTimer: 60 + Math.random() * 60,
    movePattern: 'straight',
    movePhase: Math.random() * Math.PI * 2,
    flashTimer: 0,
    ...partial,
  };
}

function createEnemy(type: EnemyType, wave: number): Enemy {
  const pats: Enemy['movePattern'][] = ['straight', 'sine', 'zigzag'];
  const pat = pats[Math.floor(Math.random() * pats.length)];

  switch (type) {
    case 'fast':
      return baseEnemy({
        type, x: 30 + Math.random() * (CANVAS_W - 60), y: -30,
        width: 24, height: 24, hp: 1, maxHp: 1,
        speed: 3 + Math.random(), shootInterval: 80, scoreValue: 150,
        movePattern: pat,
      });
    case 'tank': {
      const hp = 5 + Math.floor(wave / 2);
      return baseEnemy({
        type, x: 40 + Math.random() * (CANVAS_W - 80), y: -40,
        width: 40, height: 40, hp, maxHp: hp,
        speed: 0.8 + Math.random() * 0.5, shootInterval: 50, scoreValue: 300,
        movePattern: 'straight',
      });
    }
    case 'splitter': {
      const hp = 3 + Math.floor(wave / 4);
      return baseEnemy({
        type, x: 30 + Math.random() * (CANVAS_W - 60), y: -36,
        width: 34, height: 34, hp, maxHp: hp,
        speed: 1 + Math.random() * 0.5, shootInterval: 70, scoreValue: 220,
        movePattern: 'sine',
      });
    }
    case 'sniper':
      return baseEnemy({
        type, x: 50 + Math.random() * (CANVAS_W - 100), y: -40,
        width: 30, height: 30, hp: 2, maxHp: 2,
        speed: 0.6, shootInterval: 110, scoreValue: 350,
        movePattern: 'straight', state: 'patrol',
      });
    case 'shielded': {
      const hp = 8 + Math.floor(wave / 2);
      return baseEnemy({
        type, x: 40 + Math.random() * (CANVAS_W - 80), y: -44,
        width: 38, height: 38, hp, maxHp: hp,
        speed: 0.7 + Math.random() * 0.3, shootInterval: 65, scoreValue: 280,
        movePattern: 'straight',
      });
    }
    case 'kamikaze':
      return baseEnemy({
        type, x: 20 + Math.random() * (CANVAS_W - 40), y: -28,
        width: 26, height: 26, hp: 2, maxHp: 2,
        speed: 1.4 + Math.random() * 0.6, shootInterval: 9999, scoreValue: 180,
        movePattern: 'straight', state: 'patrol',
      });
    case 'healer':
      return baseEnemy({
        type, x: 60 + Math.random() * (CANVAS_W - 120), y: -36,
        width: 32, height: 32, hp: 4, maxHp: 4,
        speed: 0.5, shootInterval: 120, scoreValue: 400,
        movePattern: 'sine', healPulse: 0,
      });
    case 'mini':
      return baseEnemy({
        type, x: 0, y: 0,
        width: 16, height: 16, hp: 1, maxHp: 1,
        speed: 2.5 + Math.random(), shootInterval: 100, scoreValue: 75,
        movePattern: 'zigzag',
      });
    default: {
      const hp = 1 + Math.floor(wave / 3);
      return baseEnemy({
        type: 'basic', x: 20 + Math.random() * (CANVAS_W - 40), y: -30,
        width: 28, height: 28, hp, maxHp: hp,
        speed: 1.2 + Math.random() * 0.8 + wave * 0.05,
        shootInterval: Math.max(50, 90 - wave * 3), scoreValue: 100,
        movePattern: pat,
      });
    }
  }
}

export function spawnEnemy(g: GameData): void {
  const w = g.wave;
  if (isBossWave(g) && g.enemiesSpawned === 0) {
    const hp = getBossHp(g);
    g.enemies.push(baseEnemy({
      type: 'boss', x: CANVAS_W / 2, y: -60,
      width: 64, height: 56, hp, maxHp: hp,
      speed: 0.5, shootTimer: 40, shootInterval: 25,
      movePattern: 'sine', scoreValue: 2000,
    }));
    g.enemiesSpawned++;
    return;
  }

  const pool = buildSpawnPool(g);
  const type = pool[Math.floor(Math.random() * pool.length)];
  if (type === 'sniper') g.specialSpawns.sniper = true;
  if (type === 'healer') g.specialSpawns.healer = true;
  g.enemies.push(createEnemy(type, w));
  g.enemiesSpawned++;
}

export function spawnSplitterChildren(g: GameData, x: number, y: number): void {
  for (const ox of [-18, 18]) {
    const mini = createEnemy('mini', g.wave);
    mini.x = x + ox;
    mini.y = y;
    g.enemies.push(mini);
  }
  addParticles(g, x, y, 8, '#a6f', 2, 'spark', [2, 4]);
}

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

function fireEnemyBullet(g: GameData, e: Enemy, speed: number, damage = 1, size = 5, color = '#f64') {
  const p = g.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  g.bullets.push({
    x: e.x, y: e.y + e.height / 2,
    vx: (dx / d) * speed, vy: (dy / d) * speed,
    width: size, height: size, damage, isPlayer: false, color,
  });
}

export function enemyShoot(g: GameData, e: Enemy): void {
  const dx = g.player.x - e.x;
  const dy = g.player.y - e.y;
  const s = 3 + g.wave * 0.1;
  sfx.playEnemyShoot();

  if (e.type === 'boss') {
    for (let i = -2; i <= 2; i++) {
      const a = Math.atan2(dy, dx) + i * 0.25;
      g.bullets.push({
        x: e.x, y: e.y + e.height / 2,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        width: 6, height: 6, damage: 1, isPlayer: false, color: '#f46',
      });
    }
    return;
  }

  if (e.type === 'sniper') {
    fireEnemyBullet(g, e, s + 2.5, 1, 6, '#f28');
    return;
  }

  if (e.type === 'kamikaze' || e.type === 'healer') return;

  fireEnemyBullet(g, e, s);
}

function tickHealerAuras(g: GameData, dt: number): void {
  const healers = g.enemies.filter(e => e.type === 'healer');
  if (healers.length === 0) return;

  for (const healer of healers) {
    healer.healPulse = (healer.healPulse ?? 0) + dt;
    if ((healer.healPulse ?? 0) < HEAL_INTERVAL) continue;
    healer.healPulse = 0;

    for (const e of g.enemies) {
      if (e === healer || e.type === 'boss') continue;
      const dx = e.x - healer.x;
      const dy = e.y - healer.y;
      if (dx * dx + dy * dy > HEAL_RADIUS * HEAL_RADIUS) continue;
      if (e.hp >= e.maxHp) continue;
      e.hp = Math.min(e.maxHp, e.hp + 1);
      e.flashTimer = 0.12;
    }
  }
}

function updateKamikaze(e: Enemy, g: GameData, tm: number): void {
  const p = g.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (e.state !== 'rush' && (e.y > 120 || dist < KAMIKAZE_TRIGGER_DIST)) {
    e.state = 'rush';
  }

  if (e.state === 'rush') {
    const d = dist || 1;
    e.x += (dx / d) * KAMIKAZE_RUSH_SPEED * tm;
    e.y += (dy / d) * KAMIKAZE_RUSH_SPEED * tm;
  } else {
    e.y += e.speed * tm;
  }
}

function updateSniperAim(g: GameData, e: Enemy, tm: number): void {
  if (e.state === 'aim') {
    e.aimTimer = (e.aimTimer ?? 0) - tm;
    if ((e.aimTimer ?? 0) <= 0) {
      e.state = 'patrol';
      enemyShoot(g, e);
      e.shootTimer = e.shootInterval;
    }
    return;
  }

  e.shootTimer -= tm;
  if (e.shootTimer <= 0 && e.y > 0) {
    e.state = 'aim';
    e.aimTimer = SNIPER_AIM_FRAMES;
  }
}

export function updateEnemies(g: GameData, dt: number, tm: number): void {
  tickHealerAuras(g, dt);
  const speedMult = getEnemySpeedMult(g);

  for (const e of g.enemies) {
    e.movePhase += 0.03 * tm;
    if (e.flashTimer > 0) e.flashTimer -= dt;

    if (e.type === 'kamikaze') {
      updateKamikaze(e, g, tm * speedMult);
    } else {
      e.y += e.speed * tm * speedMult;
      if (e.movePattern === 'sine') e.x += Math.sin(e.movePhase) * 2 * tm * speedMult;
      else if (e.movePattern === 'zigzag') e.x += (Math.sin(e.movePhase * 2) > 0 ? 1.5 : -1.5) * tm * speedMult;
    }

    if (e.type === 'boss' && e.y > 100) {
      e.y = 100;
      e.speed = 0;
      e.movePattern = 'sine';
    } else if (e.type === 'sniper' && e.y > 55) {
      e.y = 55;
      e.speed = 0;
    } else if (e.type === 'healer' && e.y > 75) {
      e.y = 75;
      e.speed = 0;
      e.movePattern = 'sine';
    }

    e.x = Math.max(e.width / 2, Math.min(CANVAS_W - e.width / 2, e.x));

    if (e.type === 'sniper') {
      updateSniperAim(g, e, tm);
      continue;
    }

    if (e.type === 'kamikaze' || e.type === 'healer') continue;

    e.shootTimer -= tm;
    if (e.shootTimer <= 0 && e.y > 0) {
      enemyShoot(g, e);
      e.shootTimer = e.shootInterval;
    }
  }
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

export function drawEnemy(ctx: CanvasRenderingContext2D, g: GameData, e: Enemy, frame: number): void {
  ctx.save();
  ctx.translate(e.x, e.y);
  const f = e.flashTimer > 0;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.globalCompositeOperation = 'lighter';
  const eg = ctx.createRadialGradient(0, -e.height / 3, 0, 0, -e.height / 3, e.width * 0.4);
  const glow = e.type === 'boss' ? '#ff2244'
    : e.type === 'healer' ? '#4f8'
    : e.type === 'kamikaze' ? '#fa4'
    : e.type === 'sniper' ? '#f6a'
    : '#ff8844';
  eg.addColorStop(0, glow);
  eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg;
  ctx.fillRect(-e.width, -e.height, e.width * 2, e.height * 0.8);
  ctx.restore();

  if (e.type === 'healer') {
    const pulse = 0.25 + Math.sin(frame * 0.06) * 0.1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#4f8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, HEAL_RADIUS * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (e.type === 'sniper' && e.state === 'aim' && (e.aimTimer ?? 0) > 0) {
    const p = g.player;
    const alpha = 0.35 + (1 - (e.aimTimer ?? 0) / SNIPER_AIM_FRAMES) * 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f44';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(p.x - e.x, p.y - e.y);
    ctx.stroke();
    ctx.restore();
  }

  if (e.type === 'boss') {
    const gr = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gr.addColorStop(0, f ? '#fff' : '#cc2244');
    gr.addColorStop(1, f ? '#f88' : '#611');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(0, -e.height / 3);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();
    const eyeR = 6 + Math.sin(frame * 0.08) * 2;
    ctx.fillStyle = '#f46';
    ctx.beginPath();
    ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05) * 0.1;
    ctx.strokeStyle = '#ff4466';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  } else if (e.type === 'splitter') {
    ctx.fillStyle = f ? '#fff' : '#94f';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = f ? '#eef' : '#c6f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -e.height / 3);
    ctx.lineTo(0, e.height / 3);
    ctx.stroke();
  } else if (e.type === 'sniper') {
    ctx.fillStyle = f ? '#fff' : '#624';
    ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
    ctx.fillStyle = f ? '#faa' : '#f84';
    ctx.fillRect(-4, -e.height / 2 - 6, 8, 10);
  } else if (e.type === 'shielded') {
    ctx.fillStyle = f ? '#fff' : '#468';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f ? '#bdf' : '#8cf';
    ctx.beginPath();
    ctx.moveTo(-e.width / 2, e.height / 4);
    ctx.lineTo(0, e.height / 2 + 4);
    ctx.lineTo(e.width / 2, e.height / 4);
    ctx.lineTo(e.width / 3, e.height / 6);
    ctx.lineTo(0, e.height / 3);
    ctx.lineTo(-e.width / 3, e.height / 6);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'kamikaze') {
    const hot = e.state === 'rush';
    ctx.fillStyle = f ? '#fff' : hot ? '#f80' : '#c60';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(0, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();
    if (hot) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(frame * 0.2) * 0.2;
      ctx.fillStyle = '#ff4';
      ctx.beginPath();
      ctx.arc(0, 0, e.width * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (e.type === 'healer') {
    ctx.fillStyle = f ? '#fff' : '#282';
    ctx.beginPath();
    ctx.arc(0, 0, e.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = f ? '#afa' : '#4f8';
    ctx.fillRect(-3, -e.height / 4, 6, e.height / 2);
    ctx.fillRect(-e.width / 4, -3, e.width / 2, 6);
  } else if (e.type === 'mini') {
    ctx.fillStyle = f ? '#fff' : '#b6f';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'tank') {
    ctx.fillStyle = f ? '#fff' : '#862';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f ? '#fda' : '#a83';
    ctx.fillRect(-6, -e.height / 4, 12, e.height / 2);
  } else if (e.type === 'fast') {
    ctx.fillStyle = f ? '#fff' : '#4c4';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(0, -e.height / 4);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    const gr = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gr.addColorStop(0, f ? '#fff' : '#c44');
    gr.addColorStop(1, f ? '#faa' : '#822');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f ? '#fff8' : '#f668';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
