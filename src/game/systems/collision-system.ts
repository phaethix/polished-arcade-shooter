import type { GameData } from '../types';
import { CANVAS_H, GRAZE_RADIUS } from '../core/constants';
import { boxesOverlap } from '../core/collision';
import { addParticles, addRing } from '../effects';
import { isPlayerVulnerable } from '../skills';
import { consumePierce } from '../weapons';
import { isFrontalShieldBlock, isKamikazeBlastHit } from '../enemies';
import { handleHazardCollisions } from '../hazards';
import { explodeKamikaze, hurtPlayer, onEnemyKilled, playerHitFromEnemy } from '../combat';
import { queueAchievement } from '../run-progress';
import * as sfx from '../audio';

/** Resolves combat collisions. Returns true when the player died and the tick should end. */
export function updateCollisions(g: GameData): boolean {
  const p = g.player;

  if (isPlayerVulnerable(p)) {
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
        hurtPlayer(g);
        if (p.hp <= 0) return true;
      }
    }
  }

  if (isPlayerVulnerable(p)) {
    for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
      const e = g.enemies[ei];
      if (!boxesOverlap(p.x, p.y, p.width * 0.4, p.height * 0.4, e.x, e.y, e.width, e.height)) {
        continue;
      }

      if (e.type === 'kamikaze') {
        explodeKamikaze(g, e);
        if (isKamikazeBlastHit(e, p.x, p.y) && playerHitFromEnemy(g)) {
          return true;
        }
        onEnemyKilled(g, e, e.x, e.y);
        g.enemies.splice(ei, 1);
        continue;
      }

      e.hp -= 2;
      e.flashTimer = 0.1;
      if (playerHitFromEnemy(g)) {
        return true;
      }
      break;
    }
  }

  const hazardHit = handleHazardCollisions(g, isPlayerVulnerable, () => hurtPlayer(g));
  return hazardHit.playerDied;
}

export function cullOffscreenEnemies(g: GameData): void {
  g.enemies = g.enemies.filter((e) => e.y < CANVAS_H + 60);
}
