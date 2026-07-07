import type { GameData } from '../types';
import { CANVAS_W, CANVAS_H } from '../core/constants';
import { loadHighScores } from '../storage/highscores';

export function drawGameOver(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';

  if (g.modeVictory) {
    ctx.save(); ctx.shadowColor = '#4f8'; ctx.shadowBlur = 25;
    ctx.fillStyle = '#4f8'; ctx.font = 'bold 40px "Segoe UI",Arial,sans-serif';
    ctx.fillText('MISSION COMPLETE', CANVAS_W / 2, 195); ctx.restore();
    ctx.fillStyle = '#aac'; ctx.font = '14px "Segoe UI",Arial,sans-serif';
    ctx.fillText('All four chapters cleared', CANVAS_W / 2, 230);
  } else {
    ctx.save(); ctx.shadowColor = '#f44'; ctx.shadowBlur = 25;
    ctx.fillStyle = '#f44'; ctx.font = 'bold 44px "Segoe UI",Arial,sans-serif';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 195); ctx.restore();
  }

  ctx.fillStyle = '#fff'; ctx.font = '24px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`Score: ${g.score.toLocaleString()}`, CANVAS_W / 2, g.modeVictory ? 270 : 255);

  ctx.fillStyle = '#aac'; ctx.font = '14px "Segoe UI",Arial,sans-serif';
  const progressLabel = g.gameMode === 'story' ? `Stage ${g.wave}` : `Wave ${g.wave}`;
  ctx.fillText(
    `${progressLabel}  ·  Combo ${g.maxCombo}x  ·  Graze ${g.player.grazeCount}`,
    CANVAS_W / 2,
    g.modeVictory ? 300 : 285,
  );

  let y = g.modeVictory ? 328 : 313;

  if (g.runCoinsEarned > 0) {
    ctx.fillStyle = '#fd4'; ctx.font = 'bold 15px "Segoe UI",Arial,sans-serif';
    ctx.fillText(`+${g.runCoinsEarned} coins earned`, CANVAS_W / 2, y);
    y += 24;
  }

  const sc = loadHighScores();
  const isNewHighScore = sc.length > 0 && sc[0].score === g.score && !g.modeVictory;
  if (isNewHighScore) {
    ctx.fillStyle = '#fd4'; ctx.font = 'bold 18px "Segoe UI",Arial,sans-serif';
    ctx.fillText('★ NEW HIGH SCORE! ★', CANVAS_W / 2, y);
    y += 28;
  }

  const highScoresTop = Math.max(y + 14, 370);
  ctx.fillStyle = '#fd4'; ctx.font = 'bold 15px "Segoe UI",Arial,sans-serif';
  ctx.fillText('HIGH SCORES', CANVAS_W / 2, highScoresTop);
  ctx.font = '12px "Segoe UI",monospace';
  sc.slice(0, 5).forEach((s, i) => {
    ctx.fillStyle = s.score === g.score ? '#fd4' : '#aac';
    ctx.fillText(
      `${i + 1}. ${String(s.score).padStart(8)}  W${s.wave}  ${s.date}`,
      CANVAS_W / 2,
      highScoresTop + 22 + i * 20,
    );
  });

  ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
  ctx.fillStyle = '#fff'; ctx.font = '20px "Segoe UI",Arial,sans-serif';
  ctx.fillText('TAP or PRESS SPACE to restart', CANVAS_W / 2, 540);
  ctx.globalAlpha = 1;
}
