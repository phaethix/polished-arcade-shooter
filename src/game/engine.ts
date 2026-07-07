import type {
  AircraftId, GameData, Player, Enemy, Bullet, Particle, PowerUp, HighScore, Nebula
} from './types';
import { AIRCRAFT, getAircraft, nextAircraft } from './aircraft';
import * as sfx from './audio';

// ─── Constants ───────────────────────────────────────────────
const W = 400;
const H = 700;
const PW = 32;
const PH = 36;
const BSPD = 12;
const MAX_P = 600;
const COMBO_T = 1.5;
const GRAZE_R = 22;   // graze radius

// ─── High scores ─────────────────────────────────────────────
const HS_KEY = 'sky_blaster_hs_v2';
export function loadHighScores(): HighScore[] {
  try { const r = localStorage.getItem(HS_KEY); if (r) return JSON.parse(r); } catch {/* */}
  return [];
}
export function saveHighScore(score: number, wave: number): HighScore[] {
  const s = loadHighScores();
  s.push({ score, wave, date: new Date().toLocaleDateString() });
  s.sort((a, b) => b.score - a.score);
  const top = s.slice(0, 10);
  try { localStorage.setItem(HS_KEY, JSON.stringify(top)); } catch {/* */}
  return top;
}

// ─── Factories ───────────────────────────────────────────────
function mkPlayer(aircraftId: AircraftId = 'falcon'): Player {
  const craft = getAircraft(aircraftId);
  return {
    x: W / 2, y: H - 80, width: PW, height: PH,
    speed: craft.speed, shootTimer: 0, shootInterval: 8,
    hp: craft.startHp, maxHp: craft.maxHp, invincibleTimer: 0,
    powerLevel: 0, shieldActive: false, shieldTimer: 0,
    tilt: 0, grazeTimer: 0, grazeCount: 0,
    aircraftId: craft.id,
    skillCooldown: 0, skillActiveTimer: 0,
  };
}

function mkStars() {
  const a: GameData['stars'] = [];
  for (let i = 0; i < 100; i++)
    a.push({ x: Math.random() * W, y: Math.random() * H,
             speed: 0.3 + Math.random() * 2.2,
             brightness: 0.2 + Math.random() * 0.8 });
  return a;
}

function mkNebulae(): Nebula[] {
  const cols = ['#1a0030','#001830','#0a1828','#180a28','#002018'];
  const a: Nebula[] = [];
  for (let i = 0; i < 6; i++)
    a.push({ x: Math.random() * W, y: Math.random() * H,
             radius: 60 + Math.random() * 100,
             color: cols[Math.floor(Math.random() * cols.length)],
             speed: 0.15 + Math.random() * 0.3,
             alpha: 0.15 + Math.random() * 0.2 });
  return a;
}

export function createGameData(): GameData {
  return {
    player: mkPlayer('falcon'),
    bullets: [], enemies: [], particles: [], powerUps: [],
    score: 0, wave: 0,
    waveTimer: 0, waveDelay: 90,
    enemiesSpawned: 0, enemiesPerWave: 0,
    state: 'menu',
    screenShake: { intensity: 0, duration: 0, timer: 0 },
    combo: 0, comboTimer: 0, maxCombo: 0,
    flashAlpha: 0, flashColor: '#fff',
    waveAnnounceTimer: 0,
    dangerAlpha: 0,
    slowMotion: 1, slowMotionTimer: 0,
    frameCount: 0,
    stars: mkStars(),
    nebulae: mkNebulae(),
    selectedAircraft: 'falcon',
    gameMode: 'endless',
  };
}

export function cycleAircraftSelection(g: GameData, direction: -1 | 1) {
  g.selectedAircraft = nextAircraft(g.selectedAircraft, direction);
  g.player = mkPlayer(g.selectedAircraft);
}

export function resetGame(g: GameData) {
  const aircraft = g.selectedAircraft;
  Object.assign(g, {
    player: mkPlayer(aircraft),
    bullets: [], enemies: [], particles: [], powerUps: [],
    score: 0, wave: 1,
    waveTimer: 25, waveDelay: 90,
    enemiesSpawned: 0, enemiesPerWave: 5,
    combo: 0, comboTimer: 0, maxCombo: 0,
    flashAlpha: 0, flashColor: '#fff',
    waveAnnounceTimer: 90,
    dangerAlpha: 0,
    slowMotion: 1, slowMotionTimer: 0,
    frameCount: 0,
    screenShake: { intensity: 0, duration: 0, timer: 0 },
    state: 'playing' as const,
  });
}

// ─── Input ───────────────────────────────────────────────────
export interface InputState {
  left: boolean; right: boolean; up: boolean; down: boolean;
  shoot: boolean; bomb: boolean;
  touchX: number | null; touchY: number | null;
  touchActive: boolean;
  prevTouchX: number | null; prevTouchY: number | null;
}
export function createInputState(): InputState {
  return { left: false, right: false, up: false, down: false,
           shoot: false, bomb: false,
           touchX: null, touchY: null, touchActive: false,
           prevTouchX: null, prevTouchY: null };
}

// ─── Helpers ─────────────────────────────────────────────────
function shake(g: GameData, i: number, d: number) {
  const cur = g.screenShake.intensity * (g.screenShake.timer / (g.screenShake.duration || 1));
  if (i > cur) g.screenShake = { intensity: i, duration: d, timer: d };
}

function addP(
  g: GameData, x: number, y: number, n: number,
  color: string, spd = 3, type: Particle['type'] = 'explosion',
  sz: [number, number] = [2, 5],
) {
  for (let i = 0; i < n && g.particles.length < MAX_P; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (0.5 + Math.random()) * spd;
    const l = 0.35 + Math.random() * 0.55;
    g.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: l, maxLife: l,
      size: sz[0] + Math.random() * (sz[1] - sz[0]),
      color, type,
    });
  }
}

// Shockwave ring
function addRing(g: GameData, x: number, y: number, color: string, maxR: number) {
  if (g.particles.length >= MAX_P) return;
  g.particles.push({
    x, y, vx: 0, vy: 0,
    life: 0.4, maxLife: 0.4,
    size: 2, color, type: 'ring',
    startSize: maxR,
  });
}

// Score popup
function addScore(g: GameData, x: number, y: number, text: string, color = '#fff') {
  if (g.particles.length >= MAX_P) return;
  g.particles.push({
    x, y, vx: (Math.random() - 0.5) * 0.5, vy: -1.5,
    life: 0.8, maxLife: 0.8,
    size: 12, color, type: 'score', text,
  });
}

function hit(ax: number, ay: number, aw: number, ah: number,
             bx: number, by: number, bw: number, bh: number) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

// ─── Spawners ────────────────────────────────────────────────
function spawnEnemy(g: GameData) {
  const w = g.wave;
  if (w % 5 === 0 && w >= 5 && g.enemiesSpawned === 0) {
    g.enemies.push({
      x: W / 2, y: -60, width: 64, height: 56,
      hp: 20 + w * 5, maxHp: 20 + w * 5,
      speed: 0.5, type: 'boss',
      shootTimer: 40, shootInterval: 25,
      movePattern: 'sine', movePhase: 0,
      scoreValue: 2000, flashTimer: 0 });
    g.enemiesSpawned++; return;
  }
  const pool: Enemy['type'][] = ['basic'];
  if (w >= 2) pool.push('fast');
  if (w >= 3) pool.push('tank');
  const t = pool[Math.floor(Math.random() * pool.length)];
  const pats: Enemy['movePattern'][] = ['straight','sine','zigzag'];
  const pat = pats[Math.floor(Math.random() * pats.length)];
  const base = { shootTimer: 60 + Math.random() * 60, movePattern: pat,
                 movePhase: Math.random() * Math.PI * 2, flashTimer: 0 } as const;
  let e: Enemy;
  switch (t) {
    case 'fast':
      e = { ...base, x: 30 + Math.random() * (W - 60), y: -30,
            width: 24, height: 24, hp: 1, maxHp: 1,
            speed: 3 + Math.random(), type: 'fast',
            shootInterval: 80, scoreValue: 150 }; break;
    case 'tank': {
      const hp = 5 + Math.floor(w / 2);
      e = { ...base, x: 40 + Math.random() * (W - 80), y: -40,
            width: 40, height: 40, hp, maxHp: hp,
            speed: 0.8 + Math.random() * 0.5, type: 'tank',
            movePattern: 'straight', shootInterval: 50, scoreValue: 300 }; break; }
    default: {
      const hp = 1 + Math.floor(w / 3);
      e = { ...base, x: 20 + Math.random() * (W - 40), y: -30,
            width: 28, height: 28, hp, maxHp: hp,
            speed: 1.2 + Math.random() * 0.8 + w * 0.05, type: 'basic',
            shootInterval: Math.max(50, 90 - w * 3), scoreValue: 100 }; }
  }
  g.enemies.push(e); g.enemiesSpawned++;
}

function playerShoot(g: GameData) {
  const p = g.player; const l = p.powerLevel;
  const bulletColor = getAircraft(p.aircraftId).bulletColor;
  sfx.playShoot();
  g.bullets.push({ x: p.x, y: p.y - p.height / 2 - 5, vx: 0, vy: -BSPD,
    width: 4, height: 14, damage: 1, isPlayer: true, color: bulletColor });
  if (l >= 1) for (const d of [-10, 10])
    g.bullets.push({ x: p.x + d, y: p.y - p.height / 2, vx: 0, vy: -BSPD,
      width: 3, height: 12, damage: 1, isPlayer: true, color: bulletColor });
  if (l >= 2) for (const d of [-1, 1])
    g.bullets.push({ x: p.x + d * 8, y: p.y - p.height / 2, vx: d * 2, vy: -BSPD,
      width: 3, height: 10, damage: 1, isPlayer: true, color: bulletColor });
  if (l >= 3) for (const d of [-1, 1])
    g.bullets.push({ x: p.x + d * 5, y: p.y - p.height / 2, vx: d * 3.5, vy: -BSPD * 0.9,
      width: 3, height: 10, damage: 1, isPlayer: true, color: bulletColor });
  addP(g, p.x, p.y - p.height / 2, 3, bulletColor, 2, 'spark', [1, 3]);
}

function enemyShoot(g: GameData, e: Enemy) {
  const dx = g.player.x - e.x, dy = g.player.y - e.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const s = 3 + g.wave * 0.1;
  sfx.playEnemyShoot();
  if (e.type === 'boss') {
    for (let i = -2; i <= 2; i++) {
      const a = Math.atan2(dy, dx) + i * 0.25;
      g.bullets.push({ x: e.x, y: e.y + e.height / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        width: 6, height: 6, damage: 1, isPlayer: false, color: '#f46' });
    }
  } else {
    g.bullets.push({ x: e.x, y: e.y + e.height / 2, vx: (dx / d) * s, vy: (dy / d) * s,
      width: 5, height: 5, damage: 1, isPlayer: false, color: '#f64' });
  }
}

function tryPowerUp(g: GameData, x: number, y: number) {
  if (Math.random() > 0.18) return;
  const types: PowerUp['type'][] = ['spread','speed','shield','bomb','heal'];
  const wts = [0.28, 0.20, 0.17, 0.15, 0.20];
  let r = Math.random(); let t: PowerUp['type'] = 'spread';
  for (let i = 0; i < types.length; i++) { r -= wts[i]; if (r <= 0) { t = types[i]; break; } }
  g.powerUps.push({ x, y, width: 20, height: 20, type: t, vy: 1.5 });
}

function activateBomb(g: GameData) {
  g.bullets = g.bullets.filter(b => b.isPlayer);
  for (const e of g.enemies) { e.hp -= 3; e.flashTimer = 0.15; addP(g, e.x, e.y, 8, '#fff', 4, 'spark'); }
  g.flashAlpha = 0.6; g.flashColor = '#fff';
  shake(g, 8, 20);
  sfx.playBigExplosion();
  addP(g, g.player.x, g.player.y, 40, '#fff', 6, 'explosion', [3, 8]);
  addRing(g, g.player.x, g.player.y, '#88ddff', 120);
}

function hurtPlayer(g: GameData) {
  const p = g.player;
  p.hp--; p.invincibleTimer = 2;
  shake(g, 10, 12);
  g.flashAlpha = 0.25; g.flashColor = '#ff2200';
  addP(g, p.x, p.y, 25, '#f44', 4, 'explosion', [2, 6]);
  addP(g, p.x, p.y, 10, '#ff8800', 3, 'ember', [1, 3]);
  sfx.playExplosion();
  if (p.hp <= 0) killPlayer(g);
}

function killPlayer(g: GameData) {
  const p = g.player;
  g.state = 'gameover';
  addP(g, p.x, p.y, 60, '#f60', 6, 'explosion', [3, 8]);
  addP(g, p.x, p.y, 30, '#fff', 5, 'spark', [2, 5]);
  addP(g, p.x, p.y, 20, '#ff8800', 4, 'ember', [2, 4]);
  addRing(g, p.x, p.y, '#ff4444', 80);
  shake(g, 15, 30);
  g.flashAlpha = 0.8; g.flashColor = '#fff';
  sfx.playGameOver();
  saveHighScore(g.score, g.wave);
}

// ═══════════════════════ MAIN UPDATE ═════════════════════════
export function update(g: GameData, input: InputState, dt: number) {
  if (g.state !== 'playing') return;
  g.frameCount++;
  const p = g.player;

  // Slow-motion
  if (g.slowMotionTimer > 0) {
    g.slowMotionTimer -= dt;
    g.slowMotion = 0.3;
    if (g.slowMotionTimer <= 0) g.slowMotion = 1;
  }
  const tm = g.slowMotion; // time multiplier

  // ── Player movement (keyboard always full speed) ──
  let mx = 0, my = 0;
  if (input.left) mx--; if (input.right) mx++;
  if (input.up) my--; if (input.down) my++;
  if (mx || my) { const l = Math.sqrt(mx * mx + my * my); p.x += (mx / l) * p.speed; p.y += (my / l) * p.speed; }

  // Touch delta
  if (input.touchActive && input.touchX != null && input.touchY != null) {
    if (input.prevTouchX != null && input.prevTouchY != null) {
      p.x += (input.touchX - input.prevTouchX) * 1.5;
      p.y += (input.touchY - input.prevTouchY) * 1.5;
    }
    input.prevTouchX = input.touchX; input.prevTouchY = input.touchY;
  } else { input.prevTouchX = input.prevTouchY = null; }

  p.x = Math.max(p.width / 2, Math.min(W - p.width / 2, p.x));
  p.y = Math.max(p.height / 2, Math.min(H - p.height / 2, p.y));

  // Banking tilt
  const targetTilt = mx * 0.6 + (input.touchActive && input.touchX != null && input.prevTouchX != null
    ? Math.max(-1, Math.min(1, (input.touchX - input.prevTouchX) * 0.15)) : 0);
  p.tilt += (targetTilt - p.tilt) * 0.15;

  // Shooting
  if (input.shoot || input.touchActive) {
    p.shootTimer--; if (p.shootTimer <= 0) { playerShoot(g); p.shootTimer = p.shootInterval; }
  } else p.shootTimer = Math.min(p.shootTimer, 3);

  if (input.bomb) { input.bomb = false; activateBomb(g); }

  // Timers
  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.shieldTimer > 0) { p.shieldTimer -= dt; if (p.shieldTimer <= 0) p.shieldActive = false; }
  if (p.grazeTimer > 0) p.grazeTimer -= dt;

  // Engine trail
  if (Math.random() > 0.3)
    addP(g, p.x + (Math.random() - 0.5) * 8, p.y + p.height / 2 + 2, 1,
         Math.random() > 0.5 ? '#0af' : '#06f', 1.5, 'trail', [2, 4]);

  // ── Waves ──
  if (g.waveAnnounceTimer > 0) g.waveAnnounceTimer--;
  g.waveTimer--;
  if (g.enemiesSpawned >= g.enemiesPerWave && g.enemies.length === 0) {
    if (g.waveTimer <= 0) {
      g.wave++; g.enemiesSpawned = 0;
      g.enemiesPerWave = (g.wave % 5 === 0 && g.wave >= 5) ? 1 : 5 + g.wave * 2;
      g.waveTimer = g.waveDelay; g.waveAnnounceTimer = 90;
    }
  } else if (g.enemiesSpawned < g.enemiesPerWave && g.waveTimer <= 0) {
    spawnEnemy(g); g.waveTimer = Math.max(15, 50 - g.wave * 3);
  }

  // ── Enemies ──
  for (const e of g.enemies) {
    e.movePhase += 0.03 * tm;
    e.y += e.speed * tm;
    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.movePattern === 'sine') e.x += Math.sin(e.movePhase) * 2 * tm;
    else if (e.movePattern === 'zigzag') e.x += (Math.sin(e.movePhase * 2) > 0 ? 1.5 : -1.5) * tm;
    if (e.type === 'boss' && e.y > 100) { e.y = 100; e.speed = 0; e.movePattern = 'sine'; }
    e.x = Math.max(e.width / 2, Math.min(W - e.width / 2, e.x));
    e.shootTimer -= tm;
    if (e.shootTimer <= 0 && e.y > 0) { enemyShoot(g, e); e.shootTimer = e.shootInterval; }
  }

  // ── Bullets ──
  for (const b of g.bullets) {
    const m = b.isPlayer ? 1 : tm; // player bullets always full speed
    b.x += b.vx * m; b.y += b.vy * m;
    if (b.isPlayer && Math.random() > 0.65)
      g.particles.push({ x: b.x, y: b.y + 4, vx: (Math.random() - 0.5) * 0.5, vy: Math.random(),
        life: 0.12, maxLife: 0.12, size: 2, color: '#0ff8', type: 'trail' });
  }
  g.bullets = g.bullets.filter(b => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

  // ── Graze system (near-miss bonus) ──
  if (p.invincibleTimer <= 0) {
    for (const b of g.bullets) {
      if (b.isPlayer || b.grazed) continue;
      const dx = b.x - p.x, dy = b.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GRAZE_R && dist > p.width * 0.25) {
        b.grazed = true;
        g.score += 10;
        p.grazeTimer = 0.3;
        p.grazeCount++;
        sfx.playGraze();
        addP(g, p.x + dx * 0.5, p.y + dy * 0.5, 3, '#aaeeff', 1.5, 'spark', [1, 2]);
      }
    }
  }

  // ── Collision: player bullets → enemies ──
  for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
    const b = g.bullets[bi]; if (!b.isPlayer) continue;
    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const e = g.enemies[ei];
      if (!hit(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) continue;
      e.hp -= b.damage; e.flashTimer = 0.08;
      g.bullets.splice(bi, 1);
      sfx.playHit();
      addP(g, b.x, b.y, 4, '#0ff', 2, 'spark', [1, 3]);
      if (e.hp <= 0) {
        const boss = e.type === 'boss';
        const cols = boss ? ['#f40','#fa0','#f60','#fff','#f20'] : ['#f60','#fa0','#f30','#fff'];
        for (const c of cols)
          addP(g, e.x, e.y, Math.floor((boss ? 50 : 20) / cols.length), c, boss ? 6 : 4, 'explosion', boss ? [3, 8] : [2, 6]);
        // Embers linger longer
        addP(g, e.x, e.y, boss ? 15 : 6, '#ff8800', boss ? 4 : 2.5, 'ember', [1, 3]);
        // Shockwave ring
        addRing(g, e.x, e.y, boss ? '#ff6644' : '#ff994488', boss ? 60 : 35);
        // Combo
        g.combo++; g.comboTimer = COMBO_T;
        if (g.combo > g.maxCombo) g.maxCombo = g.combo;
        if (g.combo > 2) sfx.playCombo();
        const pts = Math.floor(e.scoreValue * (1 + Math.floor(g.combo / 5) * 0.5));
        g.score += pts;
        addScore(g, e.x, e.y - 10, `+${pts}`, g.combo >= 5 ? '#ffdd00' : '#fff');
        shake(g, boss ? 12 : 4, boss ? 15 : 6);
        if (boss) {
          sfx.playBigExplosion(); g.flashAlpha = 0.4; g.flashColor = '#fff';
          g.slowMotion = 0.3; g.slowMotionTimer = 0.6;
        } else sfx.playExplosion();
        tryPowerUp(g, e.x, e.y);
        g.enemies.splice(ei, 1);
      }
      break;
    }
  }

  // ── Collision: enemy bullets → player ──
  if (p.invincibleTimer <= 0) {
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi]; if (b.isPlayer) continue;
      if (!hit(b.x, b.y, b.width, b.height, p.x, p.y, p.width * 0.4, p.height * 0.4)) continue;
      g.bullets.splice(bi, 1);
      if (p.shieldActive) {
        p.shieldActive = false; p.shieldTimer = 0;
        addP(g, p.x, p.y, 20, '#4af', 4, 'spark', [2, 5]);
        addRing(g, p.x, p.y, '#44aaff', 30);
        sfx.playHit();
      } else { hurtPlayer(g); if (p.hp <= 0) return; }
    }
  }

  // ── Collision: enemy body → player ──
  if (p.invincibleTimer <= 0) {
    for (const e of g.enemies) {
      if (!hit(p.x, p.y, p.width * 0.4, p.height * 0.4, e.x, e.y, e.width, e.height)) continue;
      e.hp -= 2; e.flashTimer = 0.1;
      if (p.shieldActive) {
        p.shieldActive = false; p.shieldTimer = 0;
        addP(g, p.x, p.y, 15, '#4af', 3, 'spark'); sfx.playHit();
      } else { hurtPlayer(g); if (p.hp <= 0) return; }
      break;
    }
  }

  // ── Power-ups ──
  for (let i = g.powerUps.length - 1; i >= 0; i--) {
    const pw = g.powerUps[i]; pw.y += pw.vy;
    if (pw.y > H + 30) { g.powerUps.splice(i, 1); continue; }
    if (!hit(p.x, p.y, p.width, p.height, pw.x, pw.y, pw.width * 2, pw.height * 2)) continue;
    addP(g, pw.x, pw.y, 15, '#4f4', 3, 'spark', [2, 4]);
    switch (pw.type) {
      case 'spread': p.powerLevel = Math.min(3, p.powerLevel + 1); sfx.playPowerUp();
        addScore(g, pw.x, pw.y, 'POWER UP', '#f80'); break;
      case 'speed': p.shootInterval = Math.max(3, p.shootInterval - 1); sfx.playPowerUp();
        addScore(g, pw.x, pw.y, 'FIRE RATE', '#0f8'); break;
      case 'shield': p.shieldActive = true; p.shieldTimer = 10; sfx.playPowerUp();
        addScore(g, pw.x, pw.y, 'SHIELD', '#48f'); break;
      case 'bomb': activateBomb(g); break;
      case 'heal':
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          sfx.playHeal();
          addP(g, p.x, p.y, 20, '#44ff88', 3, 'spark', [2, 4]);
          addP(g, p.x, p.y, 10, '#88ffaa', 2, 'explosion', [1, 3]);
          addRing(g, p.x, p.y, '#44ff88', 30);
          g.flashAlpha = 0.15; g.flashColor = '#44ff88';
          addScore(g, pw.x, pw.y, '+1 HP', '#4f8');
        } else {
          // At full HP, convert to score bonus
          g.score += 500;
          sfx.playPowerUp();
          addScore(g, pw.x, pw.y, '+500', '#fd4');
        }
        break;
    }
    g.powerUps.splice(i, 1);
  }

  g.enemies = g.enemies.filter(e => e.y < H + 60);

  // Combo decay
  if (g.comboTimer > 0) { g.comboTimer -= dt; if (g.comboTimer <= 0) g.combo = 0; }

  // Danger vignette — pulse when low HP
  const hpRatio = p.hp / p.maxHp;
  if (hpRatio <= 0.34) {
    g.dangerAlpha = 0.15 + Math.sin(g.frameCount * 0.08) * 0.1;
  } else {
    g.dangerAlpha *= 0.9;
  }

  // Shake / flash decay
  if (g.screenShake.timer > 0) g.screenShake.timer--;
  if (g.flashAlpha > 0) { g.flashAlpha -= 0.04; if (g.flashAlpha < 0) g.flashAlpha = 0; }

  // ── Particles ──
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const pt = g.particles[i];
    pt.x += pt.vx * tm; pt.y += pt.vy * tm;
    pt.life -= dt * (pt.type === 'score' ? 1 : tm);
    if (pt.type === 'trail') { pt.vy += 0.1; pt.vx *= 0.94; pt.vy *= 0.94; }
    else if (pt.type === 'ember') { pt.vy += 0.04; pt.vx *= 0.98; pt.vy *= 0.98; }
    else { pt.vx *= 0.96; pt.vy *= 0.96; }
    if (pt.life <= 0) g.particles.splice(i, 1);
  }

  // Stars & nebulae
  for (const s of g.stars) { s.y += s.speed * tm; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } }
  for (const n of g.nebulae) { n.y += n.speed * tm; if (n.y - n.radius > H) { n.y = -n.radius; n.x = Math.random() * W; } }
}

// Called in non-playing states
export function updateBackground(g: GameData, dt: number) {
  for (const s of g.stars) { s.y += s.speed; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } }
  for (const n of g.nebulae) { n.y += n.speed; if (n.y - n.radius > H) { n.y = -n.radius; n.x = Math.random() * W; } }
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const pt = g.particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.life -= dt; pt.vx *= 0.96; pt.vy *= 0.96;
    if (pt.life <= 0) g.particles.splice(i, 1);
  }
  if (g.screenShake.timer > 0) g.screenShake.timer--;
  if (g.flashAlpha > 0) { g.flashAlpha -= 0.04; if (g.flashAlpha < 0) g.flashAlpha = 0; }
  g.dangerAlpha *= 0.92;
}

// ═════════════════════════ RENDER ════════════════════════════

export function render(ctx: CanvasRenderingContext2D, g: GameData, cw: number, ch: number) {
  const scale = Math.min(cw / W, ch / H);
  const ox = (cw - W * scale) / 2, oy = (ch - H * scale) / 2;

  ctx.save();
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  ctx.translate(ox, oy); ctx.scale(scale, scale);

  if (g.screenShake.timer > 0) {
    const a = g.screenShake.intensity * (g.screenShake.timer / g.screenShake.duration);
    ctx.translate((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2);
  }

  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

  // BG
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#060614'); bg.addColorStop(0.5, '#0a0e22'); bg.addColorStop(1, '#060614');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Nebulae
  for (const n of g.nebulae) {
    const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
    gr.addColorStop(0, n.color); gr.addColorStop(1, 'transparent');
    ctx.globalAlpha = n.alpha; ctx.fillStyle = gr;
    ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
  }
  ctx.globalAlpha = 1;

  // Stars
  for (const s of g.stars) {
    ctx.globalAlpha = s.brightness;
    ctx.fillStyle = s.speed > 1.8 ? '#ccddff' : '#fff';
    const sz = s.speed > 1.5 ? 2 : 1;
    ctx.fillRect(s.x, s.y, sz, sz);
    // Speed streaks for fast stars
    if (s.speed > 1.8) {
      ctx.globalAlpha = s.brightness * 0.3;
      ctx.fillRect(s.x, s.y - s.speed * 1.5, 1, s.speed * 1.5);
    }
  }
  ctx.globalAlpha = 1;

  if (g.state === 'menu') { drawMenu(ctx, g); ctx.restore(); ctx.restore(); return; }

  // Power-ups
  for (const pw of g.powerUps) drawPowerUp(ctx, pw);

  // Bullets (enemy first so player bullets render on top)
  for (const b of g.bullets) if (!b.isPlayer) drawBullet(ctx, b);
  for (const b of g.bullets) if (b.isPlayer) drawBullet(ctx, b);

  // Enemies
  for (const e of g.enemies) drawEnemy(ctx, e, g.frameCount);

  // Player
  if (g.state !== 'gameover') drawPlayer(ctx, g);

  // Particles (layered: rings first, then explosions, then sparks/scores on top)
  ctx.save();
  // Additive blending for glow effects
  ctx.globalCompositeOperation = 'lighter';
  for (const pt of g.particles) {
    if (pt.type === 'score') continue;
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    if (pt.type === 'ring') {
      const progress = 1 - a;
      const r = (pt.startSize ?? 30) * progress;
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = Math.max(0.5, 3 * a);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.stroke();
    } else if (pt.type === 'spark') {
      ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(Math.atan2(pt.vy, pt.vx));
      ctx.fillRect(-pt.size, -pt.size / 3, pt.size * 2, pt.size * 0.6);
      ctx.restore();
    } else if (pt.type === 'ember') {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(0.3, pt.size * a * 0.7), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size * a), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Score popups (normal blending)
  for (const pt of g.particles) {
    if (pt.type !== 'score') continue;
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.font = `bold ${pt.size}px "Segoe UI",Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(pt.text ?? '', pt.x, pt.y);
  }
  ctx.globalAlpha = 1;

  // Flash overlay
  if (g.flashAlpha > 0) {
    ctx.globalAlpha = g.flashAlpha; ctx.fillStyle = g.flashColor;
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }

  // Danger vignette
  if (g.dangerAlpha > 0.01) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, '#ff000044');
    ctx.globalAlpha = g.dangerAlpha;
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // Graze indicator
  if (g.player.grazeTimer > 0) {
    ctx.globalAlpha = g.player.grazeTimer / 0.3 * 0.4;
    ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(g.player.x, g.player.y, GRAZE_R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx, g);

  // Combo
  if (g.combo >= 3) {
    ctx.globalAlpha = Math.min(1, g.comboTimer);
    ctx.fillStyle = '#fd0';
    ctx.font = 'bold 28px "Segoe UI",Arial,sans-serif'; ctx.textAlign = 'center';
    const bx = Math.sin(Date.now() * 0.01) * 3;
    ctx.fillText(`${g.combo}x COMBO!`, W / 2, 120 + bx);
    ctx.globalAlpha = 1;
  }

  // Wave
  if (g.waveAnnounceTimer > 0 && g.wave > 0) {
    const t = g.waveAnnounceTimer;
    let a = 1;
    if (t > 70) a = (90 - t) / 20; else if (t < 20) a = t / 20;
    a = Math.max(0, Math.min(1, a));
    const boss = g.wave % 5 === 0 && g.wave >= 5;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(W / 2, H / 2 - 30);
    ctx.scale(1 + (1 - a) * 0.3, 1 + (1 - a) * 0.3);
    ctx.font = 'bold 32px "Segoe UI",Arial,sans-serif'; ctx.textAlign = 'center';
    if (boss) { ctx.fillStyle = '#f44'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 20; }
    else ctx.fillStyle = '#fff';
    ctx.fillText(boss ? `⚠ BOSS WAVE ${g.wave} ⚠` : `WAVE ${g.wave}`, 0, 0);
    ctx.restore();
  }

  if (g.state === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px "Segoe UI",Arial,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 20);
    ctx.font = '18px "Segoe UI",Arial,sans-serif'; ctx.fillStyle = '#aac';
    ctx.fillText('Press ESC or tap to resume', W / 2, H / 2 + 20);
  }

  if (g.state === 'gameover') drawGameOver(ctx, g);

  // Slow-mo overlay
  if (g.slowMotion < 1) {
    ctx.globalAlpha = 0.08; ctx.fillStyle = '#88aaff';
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }

  ctx.restore(); ctx.restore();
}

// ─── Draw helpers ────────────────────────────────────────────

function drawPlayer(ctx: CanvasRenderingContext2D, g: GameData) {
  const p = g.player;
  const craft = getAircraft(p.aircraftId);
  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) return;

  ctx.save(); ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt * 0.18); // banking

  // HP-based hull glow ring
  const hpR = p.hp / p.maxHp;
  const hpCol = hpR > 0.6 ? '#44ffaa' : hpR > 0.34 ? '#ffaa44' : '#ff4444';
  ctx.save();
  ctx.globalAlpha = 0.15 + (1 - hpR) * 0.2;
  ctx.shadowColor = hpCol; ctx.shadowBlur = 12;
  ctx.strokeStyle = hpCol; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 2, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Shield
  if (p.shieldActive) {
    ctx.strokeStyle = '#4af'; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    // Inner glow
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#4af';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Engine flame (animated)
  const flicker = 0.8 + Math.random() * 0.4;
  const flameH = 10 + Math.sin(Date.now() * 0.02) * 3;
  const gr2 = ctx.createLinearGradient(0, p.height / 3, 0, p.height / 2 + flameH * flicker);
  gr2.addColorStop(0, craft.cockpitColor); gr2.addColorStop(0.4, craft.engineColor); gr2.addColorStop(1, 'transparent');
  ctx.fillStyle = gr2;
  ctx.beginPath();
  ctx.moveTo(-5, p.height / 3);
  ctx.lineTo(0, p.height / 2 + flameH * flicker);
  ctx.lineTo(5, p.height / 3);
  ctx.fill();
  // Outer flame
  const gr3 = ctx.createLinearGradient(0, p.height / 3, 0, p.height / 2 + flameH * flicker * 0.7);
  gr3.addColorStop(0, craft.engineColor + '44'); gr3.addColorStop(1, 'transparent');
  ctx.fillStyle = gr3;
  ctx.beginPath();
  ctx.moveTo(-8, p.height / 3);
  ctx.lineTo(0, p.height / 2 + flameH * flicker * 0.7);
  ctx.lineTo(8, p.height / 3);
  ctx.fill();

  // Ship body
  const gr = ctx.createLinearGradient(0, -p.height / 2, 0, p.height / 2);
  gr.addColorStop(0, craft.hullTop); gr.addColorStop(0.4, craft.hullMid); gr.addColorStop(1, craft.hullBottom);
  ctx.fillStyle = gr; ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(p.width / 2, p.height / 3);
  ctx.lineTo(p.width / 2 + 4, p.height / 2);
  ctx.lineTo(p.width / 4, p.height / 4);
  ctx.lineTo(0, p.height / 3);
  ctx.lineTo(-p.width / 4, p.height / 4);
  ctx.lineTo(-p.width / 2 - 4, p.height / 2);
  ctx.lineTo(-p.width / 2, p.height / 3);
  ctx.closePath(); ctx.fill();

  // Outline highlight
  ctx.strokeStyle = craft.hullTop + '33'; ctx.lineWidth = 1; ctx.stroke();

  // Cockpit
  ctx.fillStyle = craft.cockpitColor; ctx.beginPath();
  ctx.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Cockpit glow
  ctx.save(); ctx.globalAlpha = 0.3; ctx.shadowColor = craft.cockpitColor; ctx.shadowBlur = 8;
  ctx.fillStyle = craft.cockpitColor; ctx.beginPath();
  ctx.ellipse(0, -4, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Wing stripes
  ctx.strokeStyle = '#66ccff44'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.lineTo(-p.width / 2 + 2, p.height / 3 - 2);
  ctx.moveTo(4, 0); ctx.lineTo(p.width / 2 - 2, p.height / 3 - 2);
  ctx.stroke();

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  ctx.save(); ctx.translate(e.x, e.y);
  const f = e.flashTimer > 0;

  // Subtle engine glow under all enemies
  ctx.save(); ctx.globalAlpha = 0.2; ctx.globalCompositeOperation = 'lighter';
  const eg = ctx.createRadialGradient(0, -e.height / 3, 0, 0, -e.height / 3, e.width * 0.4);
  eg.addColorStop(0, e.type === 'boss' ? '#ff2244' : '#ff8844'); eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg; ctx.fillRect(-e.width, -e.height, e.width * 2, e.height * 0.8);
  ctx.restore();

  if (e.type === 'boss') {
    const gr = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gr.addColorStop(0, f ? '#fff' : '#cc2244'); gr.addColorStop(1, f ? '#f88' : '#611');
    ctx.fillStyle = gr; ctx.beginPath();
    ctx.moveTo(0, e.height / 2); ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 3, -e.height / 2); ctx.lineTo(0, -e.height / 3);
    ctx.lineTo(e.width / 3, -e.height / 2); ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath(); ctx.fill();
    // Eye
    const eyeR = 6 + Math.sin(frame * 0.08) * 2;
    ctx.fillStyle = '#f46'; ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.3; ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(0, 0, eyeR, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // Boss outline pulse
    ctx.save(); ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05) * 0.1;
    ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  } else if (e.type === 'tank') {
    ctx.fillStyle = f ? '#fff' : '#862'; ctx.beginPath();
    ctx.moveTo(0, e.height / 2); ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f ? '#fda' : '#a83'; ctx.fillRect(-6, -e.height / 4, 12, e.height / 2);
  } else if (e.type === 'fast') {
    ctx.fillStyle = f ? '#fff' : '#4c4'; ctx.beginPath();
    ctx.moveTo(0, e.height / 2); ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(0, -e.height / 4); ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath(); ctx.fill();
  } else {
    const gr = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gr.addColorStop(0, f ? '#fff' : '#c44'); gr.addColorStop(1, f ? '#faa' : '#822');
    ctx.fillStyle = gr; ctx.beginPath();
    ctx.moveTo(0, e.height / 2); ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f ? '#fff8' : '#f668'; ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.isPlayer) {
    const gr = ctx.createLinearGradient(0, -b.height / 2, 0, b.height / 2);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, b.color); gr.addColorStop(1, '#036');
    ctx.fillStyle = gr; ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
    // Glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35; ctx.fillStyle = b.color;
    ctx.fillRect(-b.width * 1.2, -b.height / 2, b.width * 2.4, b.height);
    ctx.restore();
  } else {
    // Enemy bullet with glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3;
    ctx.fillStyle = b.color; ctx.beginPath();
    ctx.arc(0, 0, b.width / 2 + 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = b.color; ctx.beginPath();
    ctx.arc(0, 0, b.width / 2 + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.arc(0, 0, b.width / 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pw: PowerUp) {
  ctx.save(); ctx.translate(pw.x, pw.y);
  const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.15;
  ctx.scale(pulse, pulse);
  const col: Record<string, string> = { spread: '#f80', speed: '#0f8', shield: '#48f', bomb: '#f44', heal: '#4f8' };
  const ico: Record<string, string> = { spread: 'S', speed: 'F', shield: '◇', bomb: 'B', heal: '+' };
  const c = col[pw.type] ?? '#fff';
  // Outer glow
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15;
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // BG circle
  ctx.fillStyle = c; ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
  // Icon
  ctx.fillStyle = '#fff';
  if (pw.type === 'heal') {
    // Draw a cross
    ctx.fillRect(-6, -2, 12, 4);
    ctx.fillRect(-2, -6, 4, 12);
  } else {
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ico[pw.type] ?? '?', 0, 1);
  }
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  const p = g.player;

  // Score
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Segoe UI",Arial,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(g.score.toLocaleString(), 10, 30);

  // Wave
  ctx.font = '14px "Segoe UI",Arial,sans-serif'; ctx.fillStyle = '#aac';
  ctx.fillText(`WAVE ${g.wave}`, 10, 50);

  // ── Player HP bar (top-right, segmented) ──
  const barX = W - 10;
  const barY = 14;
  const segW = 14;
  const segH = 8;
  const segGap = 3;
  const totalW = p.maxHp * segW + (p.maxHp - 1) * segGap;

  for (let i = 0; i < p.maxHp; i++) {
    const sx = barX - totalW + i * (segW + segGap);
    const filled = i < p.hp;

    // Background segment
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(sx, barY, segW, segH, 2);
    ctx.fill();

    if (filled) {
      // Color shifts with HP ratio
      const hpR = p.hp / p.maxHp;
      const col = hpR > 0.6 ? '#44ffaa' : hpR > 0.34 ? '#ffaa44' : '#ff4455';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(sx, barY, segW, segH, 2);
      ctx.fill();

      // Shine highlight on top half
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(sx + 1, barY, segW - 2, segH / 2, [2, 2, 0, 0]);
      ctx.fill();
      ctx.restore();
    }

    // Border
    ctx.strokeStyle = filled ? '#ffffff30' : '#ffffff10';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(sx, barY, segW, segH, 2);
    ctx.stroke();
  }

  // HP label
  ctx.textAlign = 'right';
  ctx.font = '9px "Segoe UI",Arial,sans-serif';
  ctx.fillStyle = '#889';
  ctx.fillText('HP', barX - totalW - 5, barY + segH - 1);

  // Power level
  const statusY = barY + segH + 10;
  ctx.textAlign = 'right';
  if (p.powerLevel > 0) {
    ctx.font = '11px "Segoe UI",Arial,sans-serif'; ctx.fillStyle = '#4df';
    ctx.fillText('PWR ' + '▮'.repeat(p.powerLevel) + '▯'.repeat(3 - p.powerLevel), W - 10, statusY);
  }
  if (p.shieldActive) {
    ctx.fillStyle = '#48f'; ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillText('SHIELD', W - 10, statusY + (p.powerLevel > 0 ? 14 : 0));
  }

  // Graze counter (bottom left, subtle)
  if (p.grazeCount > 0) {
    ctx.textAlign = 'left'; ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillStyle = '#8ac'; ctx.globalAlpha = 0.6;
    ctx.fillText(`GRAZE ×${p.grazeCount}`, 10, H - 12);
    ctx.globalAlpha = 1;
  }
}

function drawMenu(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  ctx.save(); ctx.shadowColor = '#0af'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 46px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SKY BLASTER', W / 2, 150); ctx.restore();

  ctx.fillStyle = '#6bf'; ctx.font = '15px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SPACE SHOOTER', W / 2, 180);

  const craft = AIRCRAFT[g.selectedAircraft];
  ctx.fillStyle = '#fd4'; ctx.font = 'bold 14px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SELECT AIRCRAFT', W / 2, 225);
  ctx.fillStyle = craft.hullTop; ctx.font = 'bold 22px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`◀  ${craft.name.toUpperCase()}  ▶`, W / 2, 255);
  ctx.fillStyle = '#aac'; ctx.font = '12px "Segoe UI",Arial,sans-serif';
  ctx.fillText(craft.tagline, W / 2, 275);
  ctx.fillStyle = '#889'; ctx.font = '11px "Segoe UI",Arial,sans-serif';
  ctx.fillText(
    `SPD ${craft.speed}  ·  HP ${craft.startHp}/${craft.maxHp}  ·  ${craft.skillName}`,
    W / 2, 293,
  );

  ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
  ctx.fillStyle = '#fff'; ctx.font = '22px "Segoe UI",Arial,sans-serif';
  ctx.fillText('TAP or PRESS SPACE', W / 2, 330);
  ctx.globalAlpha = 1;

  const lines: [string, string][] = [
    ['← / →', 'Choose aircraft'],
    ['Arrow / WASD', 'Move'],
    ['SPACE / Z', 'Shoot'],
    ['X / B', 'Bomb'],
    ['ESC / P', 'Pause'],
    ['Touch & Drag', 'Move + Auto-fire'],
  ];
  lines.forEach(([k, v], i) => {
    ctx.fillStyle = '#aac'; ctx.font = '12px "Segoe UI",Arial,sans-serif';
    ctx.textAlign = 'right'; ctx.fillText(k, W / 2 - 8, 385 + i * 20);
    ctx.fillStyle = '#88a'; ctx.textAlign = 'left'; ctx.fillText(v, W / 2 + 8, 385 + i * 20);
  });

  const sc = loadHighScores();
  if (sc.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fd4'; ctx.font = 'bold 15px "Segoe UI",Arial,sans-serif';
    ctx.fillText('HIGH SCORES', W / 2, 540);
    ctx.font = '12px "Segoe UI",monospace';
    sc.slice(0, 5).forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#fd4' : '#aac';
      ctx.fillText(`${i + 1}. ${String(s.score).padStart(8)}  W${s.wave}  ${s.date}`, W / 2, 562 + i * 20);
    });
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';

  ctx.save(); ctx.shadowColor = '#f44'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#f44'; ctx.font = 'bold 44px "Segoe UI",Arial,sans-serif';
  ctx.fillText('GAME OVER', W / 2, 195); ctx.restore();

  ctx.fillStyle = '#fff'; ctx.font = '24px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`Score: ${g.score.toLocaleString()}`, W / 2, 255);

  ctx.fillStyle = '#aac'; ctx.font = '14px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`Wave ${g.wave}  ·  Combo ${g.maxCombo}x  ·  Graze ${g.player.grazeCount}`, W / 2, 285);

  const sc = loadHighScores();
  if (sc.length && sc[0].score === g.score) {
    ctx.fillStyle = '#fd4'; ctx.font = 'bold 18px "Segoe UI",Arial,sans-serif';
    ctx.fillText('★ NEW HIGH SCORE! ★', W / 2, 325);
  }

  ctx.fillStyle = '#fd4'; ctx.font = 'bold 15px "Segoe UI",Arial,sans-serif';
  ctx.fillText('HIGH SCORES', W / 2, 370);
  ctx.font = '12px "Segoe UI",monospace';
  sc.slice(0, 5).forEach((s, i) => {
    ctx.fillStyle = s.score === g.score ? '#fd4' : '#aac';
    ctx.fillText(`${i + 1}. ${String(s.score).padStart(8)}  W${s.wave}  ${s.date}`, W / 2, 392 + i * 20);
  });

  ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
  ctx.fillStyle = '#fff'; ctx.font = '20px "Segoe UI",Arial,sans-serif';
  ctx.fillText('TAP or PRESS SPACE to restart', W / 2, 540);
  ctx.globalAlpha = 1;
}

export { W as CANVAS_W, H as CANVAS_H };
