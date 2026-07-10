import type { Enemy, GameData } from '../types';
import { HEAL_RADIUS, SNIPER_AIM_FRAMES } from '../enemies/ai';

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  g: GameData,
  e: Enemy,
  frame: number,
): void {
  ctx.save();
  ctx.translate(e.x, e.y);
  const f = e.flashTimer > 0;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.globalCompositeOperation = 'lighter';
  const eg = ctx.createRadialGradient(0, -e.height / 3, 0, 0, -e.height / 3, e.width * 0.4);
  const glow =
    e.type === 'boss'
      ? '#ff2244'
      : e.type === 'healer'
        ? '#4f8'
        : e.type === 'kamikaze'
          ? '#fa4'
          : e.type === 'sniper'
            ? '#f6a'
            : '#ff8844';
  eg.addColorStop(0, glow);
  eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg;
  ctx.fillRect(-e.width, -e.height, e.width * 2, e.height * 0.8);
  ctx.restore();

  if (e.type === 'healer') {
    const pulse = 0.25 + Math.sin(frame * 0.06) * 0.1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#4f8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, HEAL_RADIUS * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (e.type === 'sniper' && e.state === 'aim' && (e.aimTimer ?? 0) > 0) {
    const p = g.player;
    const alpha = 0.35 + (1 - (e.aimTimer ?? 0) / SNIPER_AIM_FRAMES) * 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f44';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(p.x - e.x, p.y - e.y);
    ctx.stroke();
    ctx.restore();
  }

  if (e.type === 'boss') {
    const gr = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gr.addColorStop(0, f ? '#fff' : '#cc2244');
    gr.addColorStop(1, f ? '#f88' : '#611');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(0, -e.height / 3);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();
    const eyeR = 6 + Math.sin(frame * 0.08) * 2;
    ctx.fillStyle = '#f46';
    ctx.beginPath();
    ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05) * 0.1;
    ctx.strokeStyle = '#ff4466';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  } else if (e.type === 'splitter') {
    ctx.fillStyle = f ? '#fff' : '#94f';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = f ? '#eef' : '#c6f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -e.height / 3);
    ctx.lineTo(0, e.height / 3);
    ctx.stroke();
  } else if (e.type === 'sniper') {
    ctx.fillStyle = f ? '#fff' : '#624';
    ctx.fillRect(-e.width / 2, -e.height / 2, e.width, e.height);
    ctx.fillStyle = f ? '#faa' : '#f84';
    ctx.fillRect(-4, -e.height / 2 - 6, 8, 10);
  } else if (e.type === 'shielded') {
    ctx.fillStyle = f ? '#fff' : '#468';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f ? '#bdf' : '#8cf';
    ctx.beginPath();
    ctx.moveTo(-e.width / 2, e.height / 4);
    ctx.lineTo(0, e.height / 2 + 4);
    ctx.lineTo(e.width / 2, e.height / 4);
    ctx.lineTo(e.width / 3, e.height / 6);
    ctx.lineTo(0, e.height / 3);
    ctx.lineTo(-e.width / 3, e.height / 6);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'kamikaze') {
    const hot = e.state === 'rush';
    ctx.fillStyle = f ? '#fff' : hot ? '#f80' : '#c60';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(0, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();
    if (hot) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(frame * 0.2) * 0.2;
      ctx.fillStyle = '#ff4';
      ctx.beginPath();
      ctx.arc(0, 0, e.width * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (e.type === 'healer') {
    ctx.fillStyle = f ? '#fff' : '#282';
    ctx.beginPath();
    ctx.arc(0, 0, e.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = f ? '#afa' : '#4f8';
    ctx.fillRect(-3, -e.height / 4, 6, e.height / 2);
    ctx.fillRect(-e.width / 4, -3, e.width / 2, 6);
  } else if (e.type === 'mini') {
    ctx.fillStyle = f ? '#fff' : '#b6f';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'tank') {
    ctx.fillStyle = f ? '#fff' : '#862';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f ? '#fda' : '#a83';
    ctx.fillRect(-6, -e.height / 4, 12, e.height / 2);
  } else if (e.type === 'fast') {
    ctx.fillStyle = f ? '#fff' : '#4c4';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(0, -e.height / 4);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    const gr = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gr.addColorStop(0, f ? '#fff' : '#c44');
    gr.addColorStop(1, f ? '#faa' : '#822');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = f ? '#fff8' : '#f668';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
