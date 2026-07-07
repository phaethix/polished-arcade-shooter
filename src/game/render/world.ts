import type { GameData, Bullet, PowerUp } from '../types';
import { getAircraft } from '../aircraft';
import { getWeapon } from '../weapons';

export function drawLaserBeam(ctx: CanvasRenderingContext2D, g: GameData) {
  const p = g.player;
  const beamW = 10 + p.powerLevel * 2;
  const top = Math.max(0, p.y - p.height / 2 - 280);
  const gr = ctx.createLinearGradient(p.x, p.y - p.height / 2, p.x, top);
  gr.addColorStop(0, '#fff');
  gr.addColorStop(0.2, '#f8f');
  gr.addColorStop(1, '#f0f0');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 + p.laserRamp * 0.15;
  ctx.fillStyle = gr;
  ctx.fillRect(p.x - beamW / 2, top, beamW, p.y - p.height / 2 - top);
  ctx.strokeStyle = '#fff';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - p.height / 2);
  ctx.lineTo(p.x, top);
  ctx.stroke();
  ctx.restore();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, g: GameData) {
  const p = g.player;
  const craft = getAircraft(p.aircraftId);
  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 10) % 2 === 0) return;
  if (p.skillActiveTimer > 0 && Math.floor(p.skillActiveTimer * 20) % 2 === 0) return;

  ctx.save(); ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt * 0.18); // banking

  // HP-based hull glow ring
  const hpR = p.hp / p.maxHp;
  const hpCol = hpR > 0.6 ? '#44ffaa' : hpR > 0.34 ? '#ffaa44' : '#ff4444';
  ctx.save();
  ctx.globalAlpha = 0.15 + (1 - hpR) * 0.2;
  ctx.shadowColor = hpCol; ctx.shadowBlur = 12;
  ctx.strokeStyle = hpCol; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 2, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Shield (power-up)
  if (p.shieldActive) {
    ctx.strokeStyle = '#4af'; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    // Inner glow
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#4af';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Skill shield (fortress energy shield)
  if (p.skillShieldActive) {
    ctx.strokeStyle = '#fd4'; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55 + Math.sin(Date.now() * 0.012) * 0.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = Math.cos(a) * 26;
      const py = Math.sin(a) * 26;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Engine flame (animated)
  const flicker = 0.8 + Math.random() * 0.4;
  const flameH = 10 + Math.sin(Date.now() * 0.02) * 3;
  const gr2 = ctx.createLinearGradient(0, p.height / 3, 0, p.height / 2 + flameH * flicker);
  gr2.addColorStop(0, craft.cockpitColor); gr2.addColorStop(0.4, craft.engineColor); gr2.addColorStop(1, 'transparent');
  ctx.fillStyle = gr2;
  ctx.beginPath();
  ctx.moveTo(-5, p.height / 3);
  ctx.lineTo(0, p.height / 2 + flameH * flicker);
  ctx.lineTo(5, p.height / 3);
  ctx.fill();
  // Outer flame
  const gr3 = ctx.createLinearGradient(0, p.height / 3, 0, p.height / 2 + flameH * flicker * 0.7);
  gr3.addColorStop(0, craft.engineColor + '44'); gr3.addColorStop(1, 'transparent');
  ctx.fillStyle = gr3;
  ctx.beginPath();
  ctx.moveTo(-8, p.height / 3);
  ctx.lineTo(0, p.height / 2 + flameH * flicker * 0.7);
  ctx.lineTo(8, p.height / 3);
  ctx.fill();

  // Ship body
  const gr = ctx.createLinearGradient(0, -p.height / 2, 0, p.height / 2);
  gr.addColorStop(0, craft.hullTop); gr.addColorStop(0.4, craft.hullMid); gr.addColorStop(1, craft.hullBottom);
  ctx.fillStyle = gr; ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(p.width / 2, p.height / 3);
  ctx.lineTo(p.width / 2 + 4, p.height / 2);
  ctx.lineTo(p.width / 4, p.height / 4);
  ctx.lineTo(0, p.height / 3);
  ctx.lineTo(-p.width / 4, p.height / 4);
  ctx.lineTo(-p.width / 2 - 4, p.height / 2);
  ctx.lineTo(-p.width / 2, p.height / 3);
  ctx.closePath(); ctx.fill();

  // Outline highlight
  ctx.strokeStyle = craft.hullTop + '33'; ctx.lineWidth = 1; ctx.stroke();

  // Cockpit
  ctx.fillStyle = craft.cockpitColor; ctx.beginPath();
  ctx.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Cockpit glow
  ctx.save(); ctx.globalAlpha = 0.3; ctx.shadowColor = craft.cockpitColor; ctx.shadowBlur = 8;
  ctx.fillStyle = craft.cockpitColor; ctx.beginPath();
  ctx.ellipse(0, -4, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Wing stripes
  ctx.strokeStyle = '#66ccff44'; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.lineTo(-p.width / 2 + 2, p.height / 3 - 2);
  ctx.moveTo(4, 0); ctx.lineTo(p.width / 2 - 2, p.height / 3 - 2);
  ctx.stroke();

  ctx.restore();
}

export function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.isPlayer) {
    const gr = ctx.createLinearGradient(0, -b.height / 2, 0, b.height / 2);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, b.color); gr.addColorStop(1, '#036');
    ctx.fillStyle = gr; ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
    // Glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35; ctx.fillStyle = b.color;
    ctx.fillRect(-b.width * 1.2, -b.height / 2, b.width * 2.4, b.height);
    ctx.restore();
  } else {
    // Enemy bullet with glow
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3;
    ctx.fillStyle = b.color; ctx.beginPath();
    ctx.arc(0, 0, b.width / 2 + 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = b.color; ctx.beginPath();
    ctx.arc(0, 0, b.width / 2 + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.arc(0, 0, b.width / 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawPowerUp(ctx: CanvasRenderingContext2D, pw: PowerUp) {
  ctx.save(); ctx.translate(pw.x, pw.y);
  const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.15;
  ctx.scale(pulse, pulse);
  const col: Record<string, string> = { spread: '#f80', speed: '#0f8', shield: '#48f', bomb: '#f44', heal: '#4f8', weapon: '#fd4' };
  const ico: Record<string, string> = { spread: 'S', speed: 'F', shield: '◇', bomb: 'B', heal: '+', weapon: 'W' };
  const c = pw.type === 'weapon' && pw.weaponId ? getWeapon(pw.weaponId).hudColor : (col[pw.type] ?? '#fff');
  // Outer glow
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.15;
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // BG circle
  ctx.fillStyle = c; ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
  // Icon
  ctx.fillStyle = '#fff';
  if (pw.type === 'heal') {
    // Draw a cross
    ctx.fillRect(-6, -2, 12, 4);
    ctx.fillRect(-2, -6, 4, 12);
  } else if (pw.type === 'weapon' && pw.weaponId) {
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(getWeapon(pw.weaponId).shortName, 0, 1);
  } else {
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ico[pw.type] ?? '?', 0, 1);
  }
  ctx.restore();
}
