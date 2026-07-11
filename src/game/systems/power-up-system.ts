import type { GameData, Player, PowerUp } from '../types';
import { CANVAS_H } from '../core/constants';
import { boxesOverlap } from '../core/collision';
import { addParticles, addRing, addScorePopup } from '../effects';
import { powerUpsEnabled } from '../modes';
import { getWeapon } from '../weapons';
import { activateBomb } from '../combat';
import { activePlayers } from '../coop';
import * as sfx from '../audio';

function applyPowerUp(g: GameData, p: Player, pw: PowerUp): void {
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
      activateBomb(g, p);
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
}

export function updatePowerUps(g: GameData): void {
  const players = activePlayers(g);

  for (let i = g.powerUps.length - 1; i >= 0; i--) {
    const pw = g.powerUps[i];
    pw.y += pw.vy;
    if (pw.y > CANVAS_H + 30) {
      g.powerUps.splice(i, 1);
      continue;
    }
    const collector = players.find((p) =>
      boxesOverlap(p.x, p.y, p.width, p.height, pw.x, pw.y, pw.width * 2, pw.height * 2),
    );
    if (!collector) continue;
    if (!powerUpsEnabled(g)) {
      g.powerUps.splice(i, 1);
      continue;
    }
    applyPowerUp(g, collector, pw);
    g.powerUps.splice(i, 1);
  }
}
