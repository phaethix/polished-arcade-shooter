import type { GameData } from './types';
import type { InputState } from '../app/input';
import { createInputState } from '../app/input';
import { CANVAS_W, CANVAS_H } from './core/constants';
import { createRng } from './core/rng';
import { nextAircraft } from './aircraft';
import { nextWeapon } from './weapons';
import { updateEnemies } from './enemies';
import { applyChapterToGame, drawChapterBackground } from './chapters';
import {
  applyDailyPlayerMods,
  clampPracticeStartWave,
  getEnemiesPerWave,
  getPlayerHpBonus,
  initModeState,
  nextDifficulty,
  nextGameMode,
  nextPracticeStartWave,
  syncChapterForMode,
} from './modes';
import {
  isAircraftUnlocked,
  isWeaponUnlocked,
  tryUnlockAircraft,
  tryUnlockWeapon,
} from './progress';
import { drawHazards, initChapterHazards, updateHazards } from './hazards';
import { drawMenu } from './render/menu';
import { drawHUD } from './render/hud';
import { drawGameOver } from './render/gameover';
import { drawAchievementToast } from './render/achievement-toast';
import { drawLaserBeam, drawPlayer, drawBullet, drawPowerUp } from './render/world';
import { drawEnemy } from './render/enemies';
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
import { createPlayer } from './player-factory';
import { tickAchievementToast } from './run-progress';
import { tickSlowMotion, updatePlayerFromInput } from './systems/player-controller';
import { updateWaves } from './systems/wave-spawner';
import { updateBullets } from './systems/bullet-system';
import { updateCollisions, cullOffscreenEnemies } from './systems/collision-system';
import { updatePowerUps } from './systems/power-up-system';
import { updateAmbientEffects, updateBackgroundAmbient } from './systems/ambient-system';

export type { InputState };
export { createInputState };
export { CANVAS_W, CANVAS_H };

/** Creates the initial title-screen game state. */
export function createGameData(): GameData {
  const g: GameData = {
    player: createPlayer('falcon'),
    player2: null,
    coopRole: null,
    coopRoomCode: '',
    coopGuestInput: createInputState(),
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
    rng: createRng(0),
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    enemiesKilled: 0,
    autoFire: true,
    practiceInvincible: false,
    practiceStartWave: 1,
  };
  ensureValidMenuSelection(g);
  applyChapterToGame(g, 'space');
  return g;
}

function ensureValidMenuSelection(g: GameData) {
  if (!isAircraftUnlocked(g.selectedAircraft)) g.selectedAircraft = 'falcon';
  if (!isWeaponUnlocked(g.selectedWeapon)) g.selectedWeapon = 'standard';
  g.player = createPlayer(g.selectedAircraft, g.selectedWeapon);
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
    g.player = createPlayer(g.selectedAircraft, g.selectedWeapon);
    return true;
  }
  return false;
}

export function tryUnlockSelectedWeapon(g: GameData): boolean {
  return tryUnlockWeapon(g.selectedWeapon);
}

export function cycleAircraftSelection(g: GameData, direction: -1 | 1): void {
  g.selectedAircraft = nextAircraft(g.selectedAircraft, direction);
  g.player = createPlayer(g.selectedAircraft, g.selectedWeapon);
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

export function cyclePracticeStartWave(g: GameData, direction: -1 | 1): void {
  if (g.gameMode !== 'practice') return;
  g.practiceStartWave = nextPracticeStartWave(g.practiceStartWave, direction);
}

export function resetGame(g: GameData): void {
  if (!canStartGame(g)) return;
  const aircraft = g.selectedAircraft;
  const weapon = g.selectedWeapon;
  initModeState(g);
  Object.assign(g, {
    player: createPlayer(aircraft, weapon),
    coopGuestInput: createInputState(),
    bullets: [],
    enemies: [],
    particles: [],
    powerUps: [],
    score: 0,
    wave: g.gameMode === 'practice' ? clampPracticeStartWave(g.practiceStartWave) : 1,
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
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    enemiesKilled: 0,
    state: 'playing' as const,
  });
  g.rng =
    g.gameMode === 'daily'
      ? createRng(g.dailySeed)
      : createRng((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
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

/** Advances one fixed-timestep simulation tick while the run is active. */
export function update(g: GameData, input: InputState, dt: number): void {
  if (g.state !== 'playing') return;
  g.frameCount++;
  tickAchievementToast(g, dt);

  const tm = tickSlowMotion(g, dt);
  updatePlayerFromInput(g, input, dt);

  if (updateWaves(g)) return;

  updateEnemies(g, dt, tm);
  updateHazards(g, dt, tm);
  updateBullets(g, dt, tm);

  if (updateCollisions(g)) return;

  updatePowerUps(g);
  cullOffscreenEnemies(g);
  updateAmbientEffects(g, dt, tm);
}

/** Updates ambient visuals while the game is not playing. */
export function updateBackground(g: GameData, dt: number) {
  tickAchievementToast(g, dt);
  updateBackgroundAmbient(g, dt);
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
