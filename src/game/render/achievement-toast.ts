import type { GameData } from '../types';
import { CANVAS_W } from '../core/constants';
import { ACHIEVEMENTS } from '../progress';

export function drawAchievementToast(ctx: CanvasRenderingContext2D, g: GameData) {
  if (!g.achievementToast) return;
  const def = ACHIEVEMENTS[g.achievementToast.id];
  const fadeIn = Math.min(1, (3.5 - g.achievementToast.timer) / 0.4);
  const fadeOut = Math.min(1, g.achievementToast.timer / 0.5);
  const a = Math.min(fadeIn, fadeOut);
  const boxW = 300;
  const boxH = 50;
  const x = (CANVAS_W - boxW) / 2;
  const y = 78;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(8,12,24,0.85)';
  ctx.strokeStyle = '#fd4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fd4';
  ctx.font = 'bold 11px "Segoe UI",Arial,sans-serif';
  ctx.fillText('ACHIEVEMENT UNLOCKED', CANVAS_W / 2, y + 16);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px "Segoe UI",Arial,sans-serif';
  ctx.fillText(def.name, CANVAS_W / 2, y + 36);
  ctx.restore();
}
