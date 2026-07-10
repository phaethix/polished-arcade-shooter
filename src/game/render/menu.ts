import type { GameData } from '../types';
import { CANVAS_W, CANVAS_H } from '../core/constants';
import { loadHighScores } from '../storage/highscores';
import { AIRCRAFT } from '../aircraft';
import { getWeapon } from '../weapons';
import { MODE_INFO, getDailyModifierLabel, getDailySeed, pickDailyModifier } from '../modes';
import { isAircraftUnlocked, isWeaponUnlocked, canAffordUnlock, loadCoins } from '../progress';

export function drawMenu(ctx: CanvasRenderingContext2D, g: GameData) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';

  ctx.save();
  ctx.shadowColor = '#0af';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SKY BLASTER', CANVAS_W / 2, 130);
  ctx.restore();

  ctx.fillStyle = '#6bf';
  ctx.font = '14px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SPACE SHOOTER', CANVAS_W / 2, 156);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fd4';
  ctx.font = 'bold 14px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`¢ ${loadCoins().toLocaleString()}`, CANVAS_W - 12, 28);
  ctx.textAlign = 'center';

  const mode = MODE_INFO[g.gameMode];
  ctx.fillStyle = '#fd4';
  ctx.font = 'bold 13px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SELECT MODE', CANVAS_W / 2, 182);
  ctx.fillStyle = '#8df';
  ctx.font = 'bold 20px "Segoe UI",Arial,sans-serif';
  ctx.fillText(`▲  ${mode.name.toUpperCase()}  ▼`, CANVAS_W / 2, 206);
  ctx.fillStyle = '#889';
  ctx.font = '11px "Segoe UI",Arial,sans-serif';
  ctx.fillText(mode.tagline, CANVAS_W / 2, 222);
  if (g.gameMode === 'daily') {
    ctx.fillStyle = '#da8';
    ctx.fillText(
      `Today: ${getDailyModifierLabel(pickDailyModifier(getDailySeed()))}`,
      CANVAS_W / 2,
      236,
    );
  }

  const craft = AIRCRAFT[g.selectedAircraft];
  const weapon = getWeapon(g.selectedWeapon);
  const craftUnlocked = isAircraftUnlocked(g.selectedAircraft);
  const weaponUnlocked = isWeaponUnlocked(g.selectedWeapon);
  ctx.fillStyle = '#fd4';
  ctx.font = 'bold 13px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SELECT AIRCRAFT', CANVAS_W / 2, 262);
  ctx.fillStyle = craftUnlocked ? craft.hullTop : '#888';
  ctx.font = 'bold 20px "Segoe UI",Arial,sans-serif';
  ctx.fillText(
    `◀  ${craft.name.toUpperCase()}${craftUnlocked ? '' : ' 🔒'}  ▶`,
    CANVAS_W / 2,
    286,
  );
  ctx.fillStyle = '#aac';
  ctx.font = '11px "Segoe UI",Arial,sans-serif';
  ctx.fillText(craft.tagline, CANVAS_W / 2, 302);
  if (!craftUnlocked) {
    ctx.fillStyle = canAffordUnlock(craft.coinCost) ? '#8f8' : '#f88';
    ctx.font = '10px "Segoe UI",Arial,sans-serif';
    ctx.fillText(`${craft.coinCost} coins — press U to unlock`, CANVAS_W / 2, 316);
  } else {
    ctx.fillStyle = '#889';
    ctx.font = '10px "Segoe UI",Arial,sans-serif';
    ctx.fillText(
      `SPD ${craft.speed}  ·  HP ${craft.startHp}/${craft.maxHp}  ·  ${craft.skillName}`,
      CANVAS_W / 2,
      316,
    );
  }

  ctx.fillStyle = '#fd4';
  ctx.font = 'bold 13px "Segoe UI",Arial,sans-serif';
  ctx.fillText('SELECT WEAPON', CANVAS_W / 2, 340);
  ctx.fillStyle = weaponUnlocked ? weapon.hudColor : '#888';
  ctx.font = 'bold 18px "Segoe UI",Arial,sans-serif';
  ctx.fillText(
    `◀  ${weapon.name.toUpperCase()}${weaponUnlocked ? '' : ' 🔒'}  ▶`,
    CANVAS_W / 2,
    362,
  );
  if (!weaponUnlocked) {
    ctx.fillStyle = canAffordUnlock(weapon.coinCost) ? '#8f8' : '#f88';
    ctx.font = '10px "Segoe UI",Arial,sans-serif';
    ctx.fillText(`${weapon.coinCost} coins — press U to unlock`, CANVAS_W / 2, 376);
  } else {
    ctx.fillStyle = '#889';
    ctx.font = '10px "Segoe UI",Arial,sans-serif';
    ctx.fillText(weapon.tagline, CANVAS_W / 2, 376);
  }

  const ready = isAircraftUnlocked(g.selectedAircraft) && isWeaponUnlocked(g.selectedWeapon);
  ctx.globalAlpha = ready ? 0.5 + Math.sin(Date.now() * 0.004) * 0.5 : 0.7;
  ctx.fillStyle = ready ? '#fff' : '#f88';
  ctx.font = `${ready ? '20' : '16'}px "Segoe UI",Arial,sans-serif`;
  ctx.fillText(ready ? 'TAP or PRESS SPACE' : 'UNLOCK SELECTION TO START', CANVAS_W / 2, 402);
  ctx.globalAlpha = 1;

  const lines: [string, string][] = [
    ['↑ / ↓', 'Choose mode'],
    ['← / →', 'Choose aircraft'],
    ['[ / ]', 'Choose weapon'],
    ['U', 'Unlock selection'],
    ['SPACE / Z', 'Shoot / Start'],
    ['X / B', 'Bomb'],
  ];
  const controlsTop = 424;
  const controlsStep = 15;
  lines.forEach(([k, v], i) => {
    const y = controlsTop + i * controlsStep;
    ctx.fillStyle = '#aac';
    ctx.font = '11px "Segoe UI",Arial,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(k, CANVAS_W / 2 - 8, y);
    ctx.fillStyle = '#88a';
    ctx.textAlign = 'left';
    ctx.fillText(v, CANVAS_W / 2 + 8, y);
  });

  const sc = loadHighScores();
  if (sc.length) {
    const scoresTop = controlsTop + lines.length * controlsStep + 18;
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, scoresTop - 10);
    ctx.lineTo(CANVAS_W - 40, scoresTop - 10);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fd4';
    ctx.font = 'bold 13px "Segoe UI",Arial,sans-serif';
    ctx.fillText('HIGH SCORES', CANVAS_W / 2, scoresTop);
    ctx.font = '10px "Segoe UI",monospace';
    sc.slice(0, 3).forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#fd4' : '#aac';
      ctx.fillText(
        `${i + 1}. ${String(s.score).padStart(8)}  W${s.wave}  ${s.date}`,
        CANVAS_W / 2,
        scoresTop + 16 + i * 15,
      );
    });
  }
}
