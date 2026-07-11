import type { GameData, Player } from '../types';
import { CANVAS_H, GRAZE_RADIUS } from '../core/constants';
import { boxesOverlap } from '../core/collision';
import { addParticles, addRing } from '../effects';
import { isPlayerVulnerable } from '../skills';
import { consumePierce } from '../weapons';
import { isFrontalShieldBlock, isKamikazeBlastHit } from '../enemies';
import { handleHazardCollisions } from '../hazards';
import { explodeKamikaze, hurtPlayer, onEnemyKilled, playerHitFromEnemy } from '../combat';
import { activePlayers } from '../coop';
import { queueAchievement } from '../run-progress';
import * as sfx from '../audio';

function updateGrazeFor(g: GameData, p: Player): void {
  if (!isPlayerVulnerable(p)) return;
  for (const b of g.bullets) {
    if (b.isPlayer || b.grazed) continue;
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < GRAZE_RADIUS && dist > p.width * 0.25) {
      b.grazed = true;
      g.score += 10;
      p.grazeTimer = 0.3;
      p.grazeCount++;
      if (p.grazeCount >= 50) {
        queueAchievement(g, 'graze_king');
      }
      sfx.playGraze();
      addParticles(g, p.x + dx * 0.5, p.y + dy * 0.5, 3, '#aaeeff', 1.5, 'spark', [1, 2]);
    }
  }
}

/** Resolves enemy bullets against one ship. Returns true when the run just ended. */
function resolveEnemyBulletsFor(g: GameData, p: Player): boolean {
  if (!isPlayerVulnerable(p)) return false;
  for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
    const b = g.bullets[bi];
    if (b.isPlayer) continue;
    if (!boxesOverlap(b.x, b.y, b.width, b.height, p.x, p.y, p.width * 0.4, p.height * 0.4)) {
      continue;
    }
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
      hurtPlayer(g, p);
      if (g.state === 'gameover') return true;
    }
  }
  return false;
}

/** Resolves direct enemy contact against one ship. Returns true when the run just ended. */
function resolveEnemyContactFor(g: GameData, p: Player): boolean {
  if (!isPlayerVulnerable(p)) return false;
  for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
    const e = g.enemies[ei];
    if (!boxesOverlap(p.x, p.y, p.width * 0.4, p.height * 0.4, e.x, e.y, e.width, e.height)) {
      continue;
    }

    if (e.type === 'kamikaze') {
      explodeKamikaze(g, e);
      if (isKamikazeBlastHit(e, p.x, p.y) && playerHitFromEnemy(g, p)) {
        return true;
      }
      onEnemyKilled(g, e, e.x, e.y);
      g.enemies.splice(ei, 1);
      continue;
    }

    e.hp -= 2;
    e.flashTimer = 0.1;
    if (playerHitFromEnemy(g, p)) {
      return true;
    }
    break;
  }
  return false;
}

/** Resolves combat collisions. Returns true when the run just ended and the tick should stop. */
export function updateCollisions(g: GameData): boolean {
  const players = activePlayers(g);

  for (const p of players) {
    updateGrazeFor(g, p);
  }

  for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
    const b = g.bullets[bi];
    if (!b.isPlayer) continue;
    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const e = g.enemies[ei];
      if (!boxesOverlap(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) continue;
      if (isFrontalShieldBlock(e, b)) continue;
      e.hp -= b.damage;
      g.shotsHit++;
      g.damageDealt += b.damage;
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

  for (const p of players) {
    if (resolveEnemyBulletsFor(g, p)) return true;
  }

  for (const p of players) {
    if (resolveEnemyContactFor(g, p)) return true;
  }

  for (const p of players) {
    const hazardHit = handleHazardCollisions(g, p, isPlayerVulnerable, (target) =>
      hurtPlayer(g, target),
    );
    if (hazardHit.playerDied) return true;
  }

  return false;
}

export function cullOffscreenEnemies(g: GameData): void {
  g.enemies = g.enemies.filter((e) => e.y < CANVAS_H + 60);
}
