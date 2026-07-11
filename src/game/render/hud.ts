import type { GameData } from '../types';
import { CANVAS_W, CANVAS_H } from '../core/constants';
import { getWaveLabel, getDailyModifierLabel } from '../modes';
import { getChapter } from '../chapters';
import { drawSkillIndicator } from '../skills';
import { drawWeaponLabel } from '../weapons';

export function drawHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  const p = g.player;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px "Segoe UI",Arial,sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(g.score.toLocaleString(), 10, 30);
  ctx.font = '14px "Segoe UI",Arial,sans-serif';
  ctx.fillStyle = '#aac';
  ctx.fillText(getWaveLabel(g), 10, 50);
  const chapter = getChapter(g.chapterId);
  ctx.font = '11px "Segoe UI",Arial,sans-serif';
  ctx.fillStyle = chapter.hudColor;
  ctx.fillText(chapter.name, 10, 64);
  if (g.gameMode === 'daily' && g.dailyModifier) {
    ctx.fillStyle = '#da8';
    ctx.fillText(getDailyModifierLabel(g.dailyModifier), 10, 78);
  }
  const barX = CANVAS_W - 10;
  const barY = 14;
  const segW = 14;
  const segH = 8;
  const segGap = 3;
  const totalW = p.maxHp * segW + (p.maxHp - 1) * segGap;

  for (let i = 0; i < p.maxHp; i++) {
    const sx = barX - totalW + i * (segW + segGap);
    const filled = i < p.hp;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(sx, barY, segW, segH, 2);
    ctx.fill();

    if (filled) {
      const hpR = p.hp / p.maxHp;
      const col = hpR > 0.6 ? '#44ffaa' : hpR > 0.34 ? '#ffaa44' : '#ff4455';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(sx, barY, segW, segH, 2);
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(sx + 1, barY, segW - 2, segH / 2, [2, 2, 0, 0]);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = filled ? '#ffffff30' : '#ffffff10';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(sx, barY, segW, segH, 2);
    ctx.stroke();
  }
  ctx.textAlign = 'right';
  ctx.font = '9px "Segoe UI",Arial,sans-serif';
  ctx.fillStyle = '#889';
  ctx.fillText('HP', barX - totalW - 5, barY + segH - 1);
  const statusY = barY + segH + 10;
  ctx.textAlign = 'right';
  if (p.powerLevel > 0) {
    ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillStyle = '#4df';
    ctx.fillText(
      'PWR ' + '▮'.repeat(p.powerLevel) + '▯'.repeat(3 - p.powerLevel),
      CANVAS_W - 10,
      statusY,
    );
  }
  if (p.shieldActive) {
    ctx.fillStyle = '#48f';
    ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillText('SHIELD', CANVAS_W - 10, statusY + (p.powerLevel > 0 ? 14 : 0));
  }
  if (p.grazeCount > 0) {
    ctx.textAlign = 'left';
    ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillStyle = '#8ac';
    ctx.globalAlpha = 0.6;
    ctx.fillText(`GRAZE ×${p.grazeCount}`, 10, CANVAS_H - 12);
    ctx.globalAlpha = 1;
  }

  drawSkillIndicator(ctx, p, CANVAS_W / 2, CANVAS_H - 36);
  drawWeaponLabel(ctx, p.weaponId, 10, CANVAS_H - 36);
  let footerY = CANVAS_H - 12;
  if (g.autoFire) {
    ctx.textAlign = 'right';
    ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillStyle = '#4f8';
    ctx.globalAlpha = 0.85;
    ctx.fillText('AUTO', CANVAS_W - 10, footerY);
    ctx.globalAlpha = 1;
    footerY -= 14;
  }
  if (g.gameMode === 'practice' && g.practiceInvincible) {
    ctx.textAlign = 'right';
    ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.fillStyle = '#fd4';
    ctx.globalAlpha = 0.85;
    ctx.fillText('INV', CANVAS_W - 10, footerY);
    ctx.globalAlpha = 1;
  }
}
