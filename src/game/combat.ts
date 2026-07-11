import type { Enemy, GameData, Player, PowerUp, WeaponId } from './types';
import { COMBO_WINDOW_S } from './core/constants';
import { shake, addParticles, addRing, addScorePopup } from './effects';
import { saveHighScore } from './storage/highscores';
import { fireWeapon, getWeapon } from './weapons';
import { spawnSplitterChildren, blocksCenterShot, kamikazeExplosionRadius } from './enemies';
import { powerUpsEnabled, isPracticeInvincible, isPracticeMode } from './modes';
import { coinRewardForEnemy, recordEnemyKill } from './progress';
import { awardRunCoins, queueAchievement } from './run-progress';
import { isCoopMode, shouldTeamWipe } from './coop';
import * as sfx from './audio';

export function playerShoot(g: GameData, p: Player = g.player): void {
  fireWeapon(g, p);
  const color = getWeapon(p.weaponId).bulletColor;
  addParticles(g, p.x, p.y - p.height / 2, 3, color, 2, 'spark', [1, 3]);
}

function tryPowerUp(g: GameData, x: number, y: number): void {
  if (!powerUpsEnabled(g)) {
    return;
  }
  if (g.rng.next() > 0.18) {
    return;
  }
  const types: PowerUp['type'][] = ['spread', 'speed', 'shield', 'bomb', 'heal'];
  const wts = [0.28, 0.2, 0.17, 0.15, 0.2];
  let r = g.rng.next();
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

function tryWeaponDrop(g: GameData, x: number, y: number): void {
  if (!powerUpsEnabled(g)) {
    return;
  }
  if (g.rng.next() > 0.07) {
    return;
  }
  const alts: WeaponId[] = ['armor_piercing', 'shotgun', 'laser', 'homing'];
  const weaponId = alts[Math.floor(g.rng.next() * alts.length)];
  g.powerUps.push({ x, y, width: 22, height: 22, type: 'weapon', weaponId, vy: 1.4 });
}

export function explodeKamikaze(g: GameData, e: Enemy): void {
  for (const c of ['#f80', '#fa0', '#f40', '#fff']) {
    addParticles(g, e.x, e.y, 5, c, 4, 'explosion', [2, 5]);
  }
  addRing(g, e.x, e.y, '#ff884488', kamikazeExplosionRadius());
  shake(g, 6, 10);
  sfx.playExplosion();
  e.hp = 0;
}

/** Resolves a melee-range enemy hit against one ship. Returns true when the run just ended. */
export function playerHitFromEnemy(g: GameData, target: Player = g.player): boolean {
  if (target.skillShieldActive) {
    target.skillAbsorbedHits++;
    target.damageBoost = target.skillAbsorbedHits;
    addParticles(g, target.x, target.y, 10, '#fd4', 3, 'spark');
    sfx.playHit();
    return false;
  }
  if (target.shieldActive) {
    target.shieldActive = false;
    target.shieldTimer = 0;
    addParticles(g, target.x, target.y, 15, '#4af', 3, 'spark');
    sfx.playHit();
    return false;
  }
  hurtPlayer(g, target);
  return g.state === 'gameover';
}

export function onEnemyKilled(g: GameData, e: Enemy, x: number, y: number): void {
  g.enemiesKilled++;
  const boss = e.type === 'boss';
  const cols = boss ? ['#f40', '#fa0', '#f60', '#fff', '#f20'] : ['#f60', '#fa0', '#f30', '#fff'];
  for (const c of cols) {
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
  }
  addParticles(g, x, y, boss ? 15 : 6, '#ff8800', boss ? 4 : 2.5, 'ember', [1, 3]);
  addRing(g, x, y, boss ? '#ff6644' : '#ff994488', boss ? 60 : 35);
  g.combo++;
  g.comboTimer = COMBO_WINDOW_S;
  if (g.combo > g.maxCombo) {
    g.maxCombo = g.combo;
  }
  if (g.combo > 2) {
    sfx.playCombo();
  }
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
  } else {
    sfx.playExplosion();
  }
  if (e.type === 'splitter') {
    spawnSplitterChildren(g, x, y);
  }
  tryPowerUp(g, x, y);
  tryWeaponDrop(g, x, y);

  const coinReward = coinRewardForEnemy(e.type);
  awardRunCoins(g, coinReward, x, y - 22);
  const stats = recordEnemyKill(boss);
  if (stats.enemyKills === 1) {
    queueAchievement(g, 'first_blood');
  }
  if (stats.bossKills >= 10) {
    queueAchievement(g, 'boss_slayer');
  }
  if (g.combo >= 20) {
    queueAchievement(g, 'combo_master');
  }
}

export function updateLaserFire(
  g: GameData,
  shooting: boolean,
  dt: number,
  p: Player = g.player,
): void {
  if (p.weaponId !== 'laser') {
    p.laserRamp = Math.max(0, p.laserRamp - dt * 4);
    return;
  }
  if (!shooting) {
    p.laserRamp = Math.max(0, p.laserRamp - dt * 4);
    return;
  }
  p.laserRamp = Math.min(3, p.laserRamp + dt * 2.5);
  g.shotsFired++;
  const dps = 0.35 + p.laserRamp * 0.45;
  const damage = dps * dt * 60;
  const beamW = 10 + p.powerLevel * 2;

  for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
    const e = g.enemies[ei];
    if (Math.abs(e.x - p.x) > (e.width + beamW) / 2) {
      continue;
    }
    if (e.y >= p.y - p.height / 2 || e.y < 0) {
      continue;
    }
    if (blocksCenterShot(e, p.x)) {
      continue;
    }
    e.hp -= damage;
    g.shotsHit++;
    g.damageDealt += damage;
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

export function activateBomb(g: GameData, p: Player = g.player): void {
  g.bullets = g.bullets.filter((b) => b.isPlayer);
  for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
    const e = g.enemies[ei];
    e.hp -= 3;
    g.damageDealt += 3;
    e.flashTimer = 0.15;
    addParticles(g, e.x, e.y, 8, '#fff', 4, 'spark');
    if (e.hp <= 0) {
      onEnemyKilled(g, e, e.x, e.y);
      g.enemies.splice(ei, 1);
    }
  }
  g.flashAlpha = 0.6;
  g.flashColor = '#fff';
  shake(g, 8, 20);
  sfx.playBigExplosion();
  addParticles(g, p.x, p.y, 40, '#fff', 6, 'explosion', [3, 8]);
  addRing(g, p.x, p.y, '#88ddff', 120);
}

/** Damages one ship. In co-op the run ends when `shouldTeamWipe` is true, not just this ship's hp. */
export function hurtPlayer(g: GameData, target: Player = g.player): void {
  if (isPracticeInvincible(g)) {
    return;
  }
  g.waveDamageTaken = true;
  target.hp--;
  target.invincibleTimer = 2;
  shake(g, 10, 12);
  g.flashAlpha = 0.25;
  g.flashColor = '#ff2200';
  addParticles(g, target.x, target.y, 25, '#f44', 4, 'explosion', [2, 6]);
  addParticles(g, target.x, target.y, 10, '#ff8800', 3, 'ember', [1, 3]);
  sfx.playExplosion();
  if (isCoopMode(g)) {
    if (shouldTeamWipe(g)) killPlayer(g, target);
  } else if (target.hp <= 0) {
    killPlayer(g, target);
  }
}

export function killPlayer(g: GameData, target: Player = g.player): void {
  g.state = 'gameover';
  addParticles(g, target.x, target.y, 60, '#f60', 6, 'explosion', [3, 8]);
  addParticles(g, target.x, target.y, 30, '#fff', 5, 'spark', [2, 5]);
  addParticles(g, target.x, target.y, 20, '#ff8800', 4, 'ember', [2, 4]);
  addRing(g, target.x, target.y, '#ff4444', 80);
  shake(g, 15, 30);
  g.flashAlpha = 0.8;
  g.flashColor = '#fff';
  sfx.playGameOver();
  if (!isPracticeMode(g) && !(isCoopMode(g) && g.coopRole !== 'host')) {
    saveHighScore(g.score, g.wave);
  }
}

/**
 * Ends an in-progress coop run because the peer disconnected mid-run (host or guest
 * left the room). Only the host persists the final score; the guest never does.
 */
export function endCoopRunForDisconnect(g: GameData): void {
  if (g.state !== 'playing' && g.state !== 'paused') return;
  g.state = 'gameover';
  sfx.playGameOver();
  if (!isPracticeMode(g) && g.coopRole === 'host') {
    saveHighScore(g.score, g.wave);
  }
}
