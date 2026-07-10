import type {
  AchievementId,
  AircraftId,
  WeaponId,
  GameData,
  Player,
  Enemy,
  PowerUp,
} from './types';
import type { InputState } from '../app/input';
import { createInputState } from '../app/input';
import {
  CANVAS_W,
  CANVAS_H,
  PLAYER_W,
  PLAYER_H,
  COMBO_WINDOW_S,
  GRAZE_RADIUS,
  MAX_PARTICLES,
} from './core/constants';
import { boxesOverlap } from './core/collision';
import { shake, addParticles, addRing, addScorePopup } from './effects';
import { saveHighScore } from './storage/highscores';
import { getAircraft, nextAircraft } from './aircraft';
import { fireWeapon, getWeapon, nextWeapon, updateBulletTravel, consumePierce } from './weapons';
import { isPlayerVulnerable, tickSkills, tryActivateSkill, updateHomingBullets } from './skills';
import {
  spawnEnemy,
  updateEnemies,
  drawEnemy,
  spawnSplitterChildren,
  isFrontalShieldBlock,
  blocksCenterShot,
  isKamikazeBlastHit,
  kamikazeExplosionRadius,
} from './enemies';
import { applyChapterToGame, drawChapterBackground } from './chapters';
import {
  applyDailyPlayerMods,
  getEnemiesPerWave,
  getPlayerHpBonus,
  getSpawnIntervalMult,
  initModeState,
  isStoryComplete,
  nextDifficulty,
  nextGameMode,
  powerUpsEnabled,
  syncChapterForMode,
} from './modes';
import {
  addCoins,
  coinRewardForEnemy,
  DAILY_COMPLETE_COINS,
  DAILY_COMPLETE_WAVE,
  isAircraftUnlocked,
  isWeaponUnlocked,
  recordEnemyKill,
  STORY_STAGE_CLEAR_COINS,
  tryUnlockAircraft,
  tryUnlockWeapon,
  unlockAchievement,
} from './progress';
import { drawHazards, handleHazardCollisions, initChapterHazards, updateHazards } from './hazards';
import { drawMenu } from './render/menu';
import { drawHUD } from './render/hud';
import { drawGameOver } from './render/gameover';
import { drawAchievementToast } from './render/achievement-toast';
import { drawLaserBeam, drawPlayer, drawBullet, drawPowerUp } from './render/world';
import {
  drawParticles,
  drawFlashOverlay,
  drawDangerVignette,
  drawGrazeIndicator,
  drawComboBanner,
  drawWaveAnnounce,
  drawPausedOverlay,
  drawSlowMotionOverlay,
} from './render/overlays';
import * as sfx from './audio';

export type { InputState };
export { createInputState };
export { CANVAS_W, CANVAS_H };

function mkPlayer(aircraftId: AircraftId = 'falcon', weaponId: WeaponId = 'standard'): Player {
  const craft = getAircraft(aircraftId);
  return {
    x: CANVAS_W / 2,
    y: CANVAS_H - 80,
    width: PLAYER_W,
    height: PLAYER_H,
    speed: craft.speed,
    shootTimer: 0,
    shootInterval: 8,
    hp: craft.startHp,
    maxHp: craft.maxHp,
    invincibleTimer: 0,
    powerLevel: 0,
    shieldActive: false,
    shieldTimer: 0,
    tilt: 0,
    grazeTimer: 0,
    grazeCount: 0,
    aircraftId: craft.id,
    skillCooldown: 0,
    skillActiveTimer: 0,
    skillShieldActive: false,
    skillShieldTimer: 0,
    skillAbsorbedHits: 0,
    damageBoost: 0,
    dashVx: 0,
    dashVy: 0,
    weaponId,
    laserRamp: 0,
  };
}

/** Creates the initial title-screen game state. */
export function createGameData(): GameData {
  const g: GameData = {
    player: mkPlayer('falcon'),
    bullets: [],
    enemies: [],
    particles: [],
    powerUps: [],
    score: 0,
    wave: 0,
    waveTimer: 0,
    waveDelay: 90,
    enemiesSpawned: 0,
    enemiesPerWave: 0,
    state: 'menu',
    screenShake: { intensity: 0, duration: 0, timer: 0 },
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    flashAlpha: 0,
    flashColor: '#fff',
    waveAnnounceTimer: 0,
    dangerAlpha: 0,
    slowMotion: 1,
    slowMotionTimer: 0,
    frameCount: 0,
    stars: [],
    nebulae: [],
    chapterId: 'space',
    hazards: [],
    hazardSpawnTimer: 0,
    selectedAircraft: 'falcon',
    selectedWeapon: 'standard',
    specialSpawns: { sniper: false, healer: false },
    gameMode: 'endless',
    difficulty: 'normal',
    dailySeed: 0,
    dailyModifier: null,
    modeVictory: false,
    waveDamageTaken: false,
    dailyBonusAwarded: false,
    runCoinsEarned: 0,
    achievementToast: null,
  };
  ensureValidMenuSelection(g);
  applyChapterToGame(g, 'space');
  return g;
}

function ensureValidMenuSelection(g: GameData) {
  if (!isAircraftUnlocked(g.selectedAircraft)) g.selectedAircraft = 'falcon';
  if (!isWeaponUnlocked(g.selectedWeapon)) g.selectedWeapon = 'standard';
  g.player = mkPlayer(g.selectedAircraft, g.selectedWeapon);
}

/** Returns whether the selected loadout is unlocked and the run can start. */
export function canStartGame(g: GameData): boolean {
  return isAircraftUnlocked(g.selectedAircraft) && isWeaponUnlocked(g.selectedWeapon);
}

/** Toggles between playing and paused when invoked from the shell. */
export function togglePause(g: GameData): void {
  if (g.state === 'playing') {
    g.state = 'paused';
  } else if (g.state === 'paused') {
    g.state = 'playing';
  }
}

export function resumeFromPause(g: GameData): void {
  if (g.state === 'paused') {
    g.state = 'playing';
  }
}

export function tryUnlockSelectedAircraft(g: GameData): boolean {
  if (tryUnlockAircraft(g.selectedAircraft)) {
    g.player = mkPlayer(g.selectedAircraft, g.selectedWeapon);
    return true;
  }
  return false;
}

export function tryUnlockSelectedWeapon(g: GameData): boolean {
  return tryUnlockWeapon(g.selectedWeapon);
}

function queueAchievement(g: GameData, id: AchievementId) {
  const unlocked = unlockAchievement(id);
  if (unlocked) {
    g.achievementToast = { id, timer: 3.5 };
    sfx.playPowerUp();
  }
}

function awardRunCoins(g: GameData, amount: number, x?: number, y?: number) {
  if (amount <= 0) return;
  addCoins(amount);
  g.runCoinsEarned += amount;
  if (x != null && y != null) addScorePopup(g, x, y, `+${amount}¢`, '#fd4');
}

function onWaveCleared(g: GameData) {
  if (!g.waveDamageTaken) queueAchievement(g, 'untouchable');
  if (g.gameMode === 'story') awardRunCoins(g, STORY_STAGE_CLEAR_COINS);
  if (g.gameMode === 'daily' && g.wave >= DAILY_COMPLETE_WAVE && !g.dailyBonusAwarded) {
    awardRunCoins(g, DAILY_COMPLETE_COINS);
    g.dailyBonusAwarded = true;
  }
  if (g.wave >= 10) queueAchievement(g, 'survivor');
}

function tickAchievementToast(g: GameData, dt: number) {
  if (!g.achievementToast) return;
  g.achievementToast.timer -= dt;
  if (g.achievementToast.timer <= 0) g.achievementToast = null;
}

export function cycleAircraftSelection(g: GameData, direction: -1 | 1): void {
  g.selectedAircraft = nextAircraft(g.selectedAircraft, direction);
  g.player = mkPlayer(g.selectedAircraft, g.selectedWeapon);
}

export function cycleWeaponSelection(g: GameData, direction: -1 | 1): void {
  g.selectedWeapon = nextWeapon(g.selectedWeapon, direction);
  g.player.weaponId = g.selectedWeapon;
}

export function cycleGameModeSelection(g: GameData, direction: -1 | 1): void {
  g.gameMode = nextGameMode(g.gameMode, direction);
}

export function cycleDifficultySelection(g: GameData, direction: -1 | 1): void {
  g.difficulty = nextDifficulty(g.difficulty, direction);
}

export function resetGame(g: GameData): void {
  if (!canStartGame(g)) return;
  const aircraft = g.selectedAircraft;
  const weapon = g.selectedWeapon;
  initModeState(g);
  Object.assign(g, {
    player: mkPlayer(aircraft, weapon),
    bullets: [],
    enemies: [],
    particles: [],
    powerUps: [],
    score: 0,
    wave: 1,
    waveTimer: 25,
    waveDelay: 90,
    enemiesSpawned: 0,
    enemiesPerWave: 5,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    flashAlpha: 0,
    flashColor: '#fff',
    waveAnnounceTimer: 90,
    dangerAlpha: 0,
    slowMotion: 1,
    slowMotionTimer: 0,
    frameCount: 0,
    screenShake: { intensity: 0, duration: 0, timer: 0 },
    specialSpawns: { sniper: false, healer: false },
    hazardSpawnTimer: 0,
    waveDamageTaken: false,
    dailyBonusAwarded: false,
    runCoinsEarned: 0,
    achievementToast: null,
    state: 'playing' as const,
  });
  applyDailyPlayerMods(g);
  const hpBonus = getPlayerHpBonus(g);
  if (hpBonus > 0) {
    g.player.hp += hpBonus;
    g.player.maxHp += hpBonus;
  }
  syncChapterForMode(g);
  g.enemiesPerWave = getEnemiesPerWave(g);
  initChapterHazards(g);
}

function playerShoot(g: GameData) {
  fireWeapon(g);
  const color = getWeapon(g.player.weaponId).bulletColor;
  addParticles(g, g.player.x, g.player.y - g.player.height / 2, 3, color, 2, 'spark', [1, 3]);
}

function tryPowerUp(g: GameData, x: number, y: number) {
  if (!powerUpsEnabled(g)) return;
  if (Math.random() > 0.18) return; // 18% power-up drop chance
  const types: PowerUp['type'][] = ['spread', 'speed', 'shield', 'bomb', 'heal'];
  const wts = [0.28, 0.2, 0.17, 0.15, 0.2];
  let r = Math.random();
  let t: PowerUp['type'] = 'spread';
  for (let i = 0; i < types.length; i++) {
    r -= wts[i];
    if (r <= 0) {
      t = types[i];
      break;
    }
  }
  g.powerUps.push({ x, y, width: 20, height: 20, type: t, vy: 1.5 });
}

function tryWeaponDrop(g: GameData, x: number, y: number) {
  if (!powerUpsEnabled(g)) return;
  if (Math.random() > 0.07) return; // 7% weapon drop chance
  const alts: WeaponId[] = ['armor_piercing', 'shotgun', 'laser', 'homing'];
  const weaponId = alts[Math.floor(Math.random() * alts.length)];
  g.powerUps.push({ x, y, width: 22, height: 22, type: 'weapon', weaponId, vy: 1.4 });
}

function explodeKamikaze(g: GameData, e: Enemy): void {
  for (const c of ['#f80', '#fa0', '#f40', '#fff']) {
    addParticles(g, e.x, e.y, 5, c, 4, 'explosion', [2, 5]);
  }
  addRing(g, e.x, e.y, '#ff884488', kamikazeExplosionRadius());
  shake(g, 6, 10);
  sfx.playExplosion();
  e.hp = 0;
}

function playerHitFromEnemy(g: GameData): boolean {
  const p = g.player;
  if (p.skillShieldActive) {
    p.skillAbsorbedHits++;
    p.damageBoost = p.skillAbsorbedHits;
    addParticles(g, p.x, p.y, 10, '#fd4', 3, 'spark');
    sfx.playHit();
    return false;
  }
  if (p.shieldActive) {
    p.shieldActive = false;
    p.shieldTimer = 0;
    addParticles(g, p.x, p.y, 15, '#4af', 3, 'spark');
    sfx.playHit();
    return false;
  }
  hurtPlayer(g);
  return p.hp <= 0;
}

function onEnemyKilled(g: GameData, e: Enemy, x: number, y: number) {
  const boss = e.type === 'boss';
  const cols = boss ? ['#f40', '#fa0', '#f60', '#fff', '#f20'] : ['#f60', '#fa0', '#f30', '#fff'];
  for (const c of cols)
    addParticles(
      g,
      x,
      y,
      Math.floor((boss ? 50 : 20) / cols.length),
      c,
      boss ? 6 : 4,
      'explosion',
      boss ? [3, 8] : [2, 6],
    );
  addParticles(g, x, y, boss ? 15 : 6, '#ff8800', boss ? 4 : 2.5, 'ember', [1, 3]);
  addRing(g, x, y, boss ? '#ff6644' : '#ff994488', boss ? 60 : 35);
  g.combo++;
  g.comboTimer = COMBO_WINDOW_S;
  if (g.combo > g.maxCombo) g.maxCombo = g.combo;
  if (g.combo > 2) sfx.playCombo();
  const pts = Math.floor(e.scoreValue * (1 + Math.floor(g.combo / 5) * 0.5));
  g.score += pts;
  addScorePopup(g, x, y - 10, `+${pts}`, g.combo >= 5 ? '#ffdd00' : '#fff');
  shake(g, boss ? 12 : 4, boss ? 15 : 6);
  if (boss) {
    sfx.playBigExplosion();
    g.flashAlpha = 0.4;
    g.flashColor = '#fff';
    g.slowMotion = 0.3;
    g.slowMotionTimer = 0.6;
  } else sfx.playExplosion();
  if (e.type === 'splitter') spawnSplitterChildren(g, x, y);
  tryPowerUp(g, x, y);
  tryWeaponDrop(g, x, y);

  const coinReward = coinRewardForEnemy(e.type);
  awardRunCoins(g, coinReward, x, y - 22);
  const stats = recordEnemyKill(boss);
  if (stats.enemyKills === 1) queueAchievement(g, 'first_blood');
  if (stats.bossKills >= 10) queueAchievement(g, 'boss_slayer');
  if (g.combo >= 20) queueAchievement(g, 'combo_master');
}

function updateLaserFire(g: GameData, shooting: boolean, dt: number) {
  const p = g.player;
  if (p.weaponId !== 'laser') {
    p.laserRamp = Math.max(0, p.laserRamp - dt * 4);
    return;
  }
  if (!shooting) {
    p.laserRamp = Math.max(0, p.laserRamp - dt * 4);
    return;
  }
  p.laserRamp = Math.min(3, p.laserRamp + dt * 2.5);
  const dps = 0.35 + p.laserRamp * 0.45;
  const damage = dps * dt * 60;
  const beamW = 10 + p.powerLevel * 2;

  for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
    const e = g.enemies[ei];
    if (Math.abs(e.x - p.x) > (e.width + beamW) / 2) continue;
    if (e.y >= p.y - p.height / 2 || e.y < 0) continue;
    if (blocksCenterShot(e, p.x)) continue;
    e.hp -= damage;
    e.flashTimer = 0.05;
    if (e.hp <= 0) {
      onEnemyKilled(g, e, e.x, e.y);
      g.enemies.splice(ei, 1);
    }
  }
  if (Math.random() > 0.5) {
    addParticles(
      g,
      p.x + (Math.random() - 0.5) * beamW,
      p.y - p.height / 2 - Math.random() * 80,
      1,
      '#f8f',
      1,
      'spark',
      [1, 2],
    );
  }
}

function activateBomb(g: GameData) {
  g.bullets = g.bullets.filter((b) => b.isPlayer);
  for (const e of g.enemies) {
    e.hp -= 3;
    e.flashTimer = 0.15;
    addParticles(g, e.x, e.y, 8, '#fff', 4, 'spark');
  }
  g.flashAlpha = 0.6;
  g.flashColor = '#fff';
  shake(g, 8, 20);
  sfx.playBigExplosion();
  addParticles(g, g.player.x, g.player.y, 40, '#fff', 6, 'explosion', [3, 8]);
  addRing(g, g.player.x, g.player.y, '#88ddff', 120);
}

function hurtPlayer(g: GameData) {
  const p = g.player;
  g.waveDamageTaken = true;
  p.hp--;
  p.invincibleTimer = 2; // 2 seconds of i-frames after hit
  shake(g, 10, 12);
  g.flashAlpha = 0.25;
  g.flashColor = '#ff2200';
  addParticles(g, p.x, p.y, 25, '#f44', 4, 'explosion', [2, 6]);
  addParticles(g, p.x, p.y, 10, '#ff8800', 3, 'ember', [1, 3]);
  sfx.playExplosion();
  if (p.hp <= 0) killPlayer(g);
}

function killPlayer(g: GameData) {
  const p = g.player;
  g.state = 'gameover';
  addParticles(g, p.x, p.y, 60, '#f60', 6, 'explosion', [3, 8]);
  addParticles(g, p.x, p.y, 30, '#fff', 5, 'spark', [2, 5]);
  addParticles(g, p.x, p.y, 20, '#ff8800', 4, 'ember', [2, 4]);
  addRing(g, p.x, p.y, '#ff4444', 80);
  shake(g, 15, 30);
  g.flashAlpha = 0.8;
  g.flashColor = '#fff';
  sfx.playGameOver();
  saveHighScore(g.score, g.wave);
}

/** Advances one fixed-timestep simulation tick while the run is active. */
export function update(g: GameData, input: InputState, dt: number): void {
  if (g.state !== 'playing') return;
  g.frameCount++;
  tickAchievementToast(g, dt);
  const p = g.player;

  // Slow-motion
  if (g.slowMotionTimer > 0) {
    g.slowMotionTimer -= dt;
    g.slowMotion = 0.3;
    if (g.slowMotionTimer <= 0) g.slowMotion = 1;
  }
  const tm = g.slowMotion; // time multiplier

  let mx = 0,
    my = 0;
  if (input.left) mx--;
  if (input.right) mx++;
  if (input.up) my--;
  if (input.down) my++;
  if (mx || my) {
    const l = Math.sqrt(mx * mx + my * my);
    p.x += (mx / l) * p.speed;
    p.y += (my / l) * p.speed;
  }

  // Touch delta
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

  // Banking tilt
  const targetTilt =
    mx * 0.6 +
    (input.touchActive && input.touchX != null && input.prevTouchX != null
      ? Math.max(-1, Math.min(1, (input.touchX - input.prevTouchX) * 0.15))
      : 0);
  p.tilt += (targetTilt - p.tilt) * 0.15;

  // Shooting
  const shooting = input.shoot || input.touchActive;
  if (p.weaponId === 'laser') {
    updateLaserFire(g, shooting, dt);
  } else if (shooting) {
    p.shootTimer--;
    if (p.shootTimer <= 0) {
      playerShoot(g);
      p.shootTimer = p.shootInterval;
    }
  } else p.shootTimer = Math.min(p.shootTimer, 3);

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

  // Timers
  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.shieldTimer > 0) {
    p.shieldTimer -= dt;
    if (p.shieldTimer <= 0) p.shieldActive = false;
  }
  if (p.grazeTimer > 0) p.grazeTimer -= dt;

  // Engine trail
  if (Math.random() > 0.3)
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

  if (g.waveAnnounceTimer > 0) g.waveAnnounceTimer--;
  g.waveTimer--;
  if (g.enemiesSpawned >= g.enemiesPerWave && g.enemies.length === 0) {
    if (g.waveTimer <= 0) {
      if (isStoryComplete(g)) {
        onWaveCleared(g);
        g.modeVictory = true;
        g.state = 'gameover';
        saveHighScore(g.score, g.wave);
        sfx.playBigExplosion();
        return;
      }
      onWaveCleared(g);
      g.wave++;
      g.enemiesSpawned = 0;
      g.waveDamageTaken = false;
      g.specialSpawns = { sniper: false, healer: false };
      const chapterChanged = syncChapterForMode(g);
      if (chapterChanged) initChapterHazards(g);
      g.enemiesPerWave = getEnemiesPerWave(g);
      g.waveTimer = g.waveDelay;
      g.waveAnnounceTimer = 90;
    }
  } else if (g.enemiesSpawned < g.enemiesPerWave && g.waveTimer <= 0) {
    spawnEnemy(g);
    g.waveTimer = Math.max(15, (50 - g.wave * 3) * getSpawnIntervalMult(g));
  }

  updateEnemies(g, dt, tm);
  updateHazards(g, dt, tm);

  for (const b of g.bullets) {
    const m = b.isPlayer ? 1 : tm; // player bullets always full speed
    b.x += b.vx * m;
    b.y += b.vy * m;
    if (b.isPlayer && Math.random() > 0.65 && g.particles.length < MAX_PARTICLES)
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
  updateHomingBullets(g, dt);
  updateBulletTravel(g);
  g.bullets = g.bullets.filter(
    (b) => b.x > -20 && b.x < CANVAS_W + 20 && b.y > -20 && b.y < CANVAS_H + 20,
  );

  if (isPlayerVulnerable(p)) {
    for (const b of g.bullets) {
      if (b.isPlayer || b.grazed) continue;
      const dx = b.x - p.x,
        dy = b.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GRAZE_RADIUS && dist > p.width * 0.25) {
        b.grazed = true;
        g.score += 10;
        p.grazeTimer = 0.3;
        p.grazeCount++;
        if (p.grazeCount >= 50) queueAchievement(g, 'graze_king');
        sfx.playGraze();
        addParticles(g, p.x + dx * 0.5, p.y + dy * 0.5, 3, '#aaeeff', 1.5, 'spark', [1, 2]);
      }
    }
  }

  for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
    const b = g.bullets[bi];
    if (!b.isPlayer) continue;
    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const e = g.enemies[ei];
      if (!boxesOverlap(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) continue;
      if (isFrontalShieldBlock(e, b)) continue;
      e.hp -= b.damage;
      e.flashTimer = 0.08;
      sfx.playHit();
      addParticles(g, b.x, b.y, 4, b.color, 2, 'spark', [1, 3]);
      if (e.hp <= 0) {
        onEnemyKilled(g, e, e.x, e.y);
        g.enemies.splice(ei, 1);
      }
      if ((b.pierceRemaining ?? 0) > 0) {
        consumePierce(b);
        continue;
      }
      g.bullets.splice(bi, 1);
      break;
    }
  }

  if (isPlayerVulnerable(p)) {
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      if (b.isPlayer) continue;
      if (!boxesOverlap(b.x, b.y, b.width, b.height, p.x, p.y, p.width * 0.4, p.height * 0.4))
        continue;
      g.bullets.splice(bi, 1);
      if (p.skillShieldActive) {
        p.skillAbsorbedHits++;
        p.damageBoost = p.skillAbsorbedHits;
        addParticles(g, p.x, p.y, 12, '#fd4', 3, 'spark', [2, 4]);
        addRing(g, p.x, p.y, '#ffcc44', 25);
        sfx.playHit();
      } else if (p.shieldActive) {
        p.shieldActive = false;
        p.shieldTimer = 0;
        addParticles(g, p.x, p.y, 20, '#4af', 4, 'spark', [2, 5]);
        addRing(g, p.x, p.y, '#44aaff', 30);
        sfx.playHit();
      } else {
        hurtPlayer(g);
        if (p.hp <= 0) return;
      }
    }
  }

  if (isPlayerVulnerable(p)) {
    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const e = g.enemies[ei];
      if (!boxesOverlap(p.x, p.y, p.width * 0.4, p.height * 0.4, e.x, e.y, e.width, e.height))
        continue;

      if (e.type === 'kamikaze') {
        explodeKamikaze(g, e);
        if (isKamikazeBlastHit(e, p.x, p.y) && playerHitFromEnemy(g)) return;
        onEnemyKilled(g, e, e.x, e.y);
        g.enemies.splice(ei, 1);
        continue;
      }

      e.hp -= 2;
      e.flashTimer = 0.1;
      if (playerHitFromEnemy(g)) return;
      break;
    }
  }

  const hazardHit = handleHazardCollisions(g, isPlayerVulnerable, () => hurtPlayer(g));
  if (hazardHit.playerDied) return;

  for (let i = g.powerUps.length - 1; i >= 0; i--) {
    const pw = g.powerUps[i];
    pw.y += pw.vy;
    if (pw.y > CANVAS_H + 30) {
      g.powerUps.splice(i, 1);
      continue;
    }
    if (!boxesOverlap(p.x, p.y, p.width, p.height, pw.x, pw.y, pw.width * 2, pw.height * 2))
      continue;
    if (!powerUpsEnabled(g)) {
      g.powerUps.splice(i, 1);
      continue;
    }
    addParticles(g, pw.x, pw.y, 15, '#4f4', 3, 'spark', [2, 4]);
    switch (pw.type) {
      case 'spread':
        p.powerLevel = Math.min(3, p.powerLevel + 1);
        sfx.playPowerUp();
        addScorePopup(g, pw.x, pw.y, 'POWER UP', '#f80');
        break;
      case 'speed':
        p.shootInterval = Math.max(3, p.shootInterval - 1);
        sfx.playPowerUp();
        addScorePopup(g, pw.x, pw.y, 'FIRE RATE', '#0f8');
        break;
      case 'shield':
        p.shieldActive = true;
        p.shieldTimer = 10;
        sfx.playPowerUp();
        addScorePopup(g, pw.x, pw.y, 'SHIELD', '#48f');
        break;
      case 'bomb':
        activateBomb(g);
        break;
      case 'heal':
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          sfx.playHeal();
          addParticles(g, p.x, p.y, 20, '#44ff88', 3, 'spark', [2, 4]);
          addParticles(g, p.x, p.y, 10, '#88ffaa', 2, 'explosion', [1, 3]);
          addRing(g, p.x, p.y, '#44ff88', 30);
          g.flashAlpha = 0.15;
          g.flashColor = '#44ff88';
          addScorePopup(g, pw.x, pw.y, '+1 HP', '#4f8');
        } else {
          // At full HP, convert to score bonus
          g.score += 500;
          sfx.playPowerUp();
          addScorePopup(g, pw.x, pw.y, '+500', '#fd4');
        }
        break;
      case 'weapon':
        if (pw.weaponId) {
          p.weaponId = pw.weaponId;
          sfx.playPowerUp();
          addScorePopup(
            g,
            pw.x,
            pw.y,
            getWeapon(pw.weaponId).shortName,
            getWeapon(pw.weaponId).hudColor,
          );
        }
        break;
    }
    g.powerUps.splice(i, 1);
  }

  g.enemies = g.enemies.filter((e) => e.y < CANVAS_H + 60);

  // Combo decay
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) g.combo = 0;
  }

  // Danger vignette — pulse when low HP
  const hpRatio = p.hp / p.maxHp;
  if (hpRatio <= 0.34) {
    // low HP threshold — trigger danger vignette
    g.dangerAlpha = 0.15 + Math.sin(g.frameCount * 0.08) * 0.1;
  } else {
    g.dangerAlpha *= 0.9;
  }

  // Shake / flash decay
  if (g.screenShake.timer > 0) g.screenShake.timer--;
  if (g.flashAlpha > 0) {
    g.flashAlpha -= 0.04;
    if (g.flashAlpha < 0) g.flashAlpha = 0;
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
    if (pt.life <= 0) g.particles.splice(i, 1);
  }

  // Stars & nebulae
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

/** Updates ambient visuals while the game is not playing. */
export function updateBackground(g: GameData, dt: number) {
  tickAchievementToast(g, dt);
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
    if (pt.life <= 0) g.particles.splice(i, 1);
  }
  if (g.screenShake.timer > 0) g.screenShake.timer--;
  if (g.flashAlpha > 0) {
    g.flashAlpha -= 0.04;
    if (g.flashAlpha < 0) g.flashAlpha = 0;
  }
  g.dangerAlpha *= 0.92;
}

/** Draws the current frame to the canvas, including letterboxing. */
export function render(ctx: CanvasRenderingContext2D, g: GameData, cw: number, ch: number): void {
  const scale = Math.min(cw / CANVAS_W, ch / CANVAS_H);
  const ox = (cw - CANVAS_W * scale) / 2;
  const oy = (ch - CANVAS_H * scale) / 2;

  ctx.save();
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  if (g.screenShake.timer > 0) {
    const a = g.screenShake.intensity * (g.screenShake.timer / (g.screenShake.duration || 1));
    ctx.translate((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_W, CANVAS_H);
  ctx.clip();

  drawChapterBackground(ctx, g);

  if (g.state === 'menu') {
    drawMenu(ctx, g);
    drawAchievementToast(ctx, g);
    ctx.restore();
    ctx.restore();
    return;
  }

  drawHazards(ctx, g);

  for (const pw of g.powerUps) drawPowerUp(ctx, pw);
  for (const b of g.bullets) if (!b.isPlayer) drawBullet(ctx, b);
  for (const b of g.bullets) if (b.isPlayer) drawBullet(ctx, b);
  for (const e of g.enemies) drawEnemy(ctx, g, e, g.frameCount);

  if (g.state !== 'gameover') {
    if (g.player.weaponId === 'laser' && g.player.laserRamp > 0) drawLaserBeam(ctx, g);
    drawPlayer(ctx, g);
  }

  drawParticles(ctx, g);
  drawFlashOverlay(ctx, g);
  drawDangerVignette(ctx, g);
  drawGrazeIndicator(ctx, g);
  if (g.state === 'playing' || g.state === 'paused') {
    drawHUD(ctx, g);
    drawComboBanner(ctx, g);
    drawWaveAnnounce(ctx, g);
  }
  if (g.state === 'paused') drawPausedOverlay(ctx, g);
  if (g.state === 'gameover') drawGameOver(ctx, g);
  drawAchievementToast(ctx, g);

  drawSlowMotionOverlay(ctx, g);

  ctx.restore();
  ctx.restore();
}
