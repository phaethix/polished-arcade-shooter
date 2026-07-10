import type { ChapterId, GameData, Nebula } from './types';
import { CANVAS_W, CANVAS_H } from './core/constants';

export interface ChapterDefinition {
  id: ChapterId;
  name: string;
  tagline: string;
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  nebulaColors: string[];
  starBright: string;
  starDim: string;
  hazardType: 'none' | 'asteroid' | 'turret' | 'teleporter';
  hudColor: string;
}

export const CHAPTER_ORDER: ChapterId[] = ['space', 'asteroid', 'carrier', 'wormhole'];

export const CHAPTERS: Record<ChapterId, ChapterDefinition> = {
  space: {
    id: 'space',
    name: 'Deep Space',
    tagline: 'Standard patrol zone',
    bgTop: '#060614',
    bgMid: '#0a0e22',
    bgBottom: '#060614',
    nebulaColors: ['#1a0030', '#001830', '#0a1828', '#180a28', '#002018'],
    starBright: '#ccddff',
    starDim: '#ffffff',
    hazardType: 'none',
    hudColor: '#8cf',
  },
  asteroid: {
    id: 'asteroid',
    name: 'Asteroid Belt',
    tagline: 'Dodge falling debris',
    bgTop: '#100c08',
    bgMid: '#1a140c',
    bgBottom: '#0c0806',
    nebulaColors: ['#281808', '#201410', '#301c0c', '#181008', '#24180a'],
    starBright: '#ddbbaa',
    starDim: '#aa9988',
    hazardType: 'asteroid',
    hudColor: '#da8',
  },
  carrier: {
    id: 'carrier',
    name: 'Enemy Carrier',
    tagline: 'Beware fixed turrets',
    bgTop: '#080a10',
    bgMid: '#10141c',
    bgBottom: '#06080c',
    nebulaColors: ['#180808', '#101018', '#201010', '#0c1018', '#180c0c'],
    starBright: '#ffaa99',
    starDim: '#cc8877',
    hazardType: 'turret',
    hudColor: '#f88',
  },
  wormhole: {
    id: 'wormhole',
    name: 'Wormhole',
    tagline: 'Unstable teleport pads',
    bgTop: '#100818',
    bgMid: '#1a0830',
    bgBottom: '#080410',
    nebulaColors: ['#300840', '#200830', '#401060', '#180828', '#280450'],
    starBright: '#ddaaff',
    starDim: '#bb88ff',
    hazardType: 'teleporter',
    hudColor: '#c8f',
  },
};

export function getChapter(id: ChapterId): ChapterDefinition {
  return CHAPTERS[id];
}

/** Endless mode: rotate chapter every 5 waves (1–5 space, 6–10 asteroid, …). */
export function getChapterForWave(wave: number): ChapterId {
  const idx = Math.floor(Math.max(0, wave - 1) / 5) % CHAPTER_ORDER.length;
  return CHAPTER_ORDER[idx];
}

export function buildStars(_chapter: ChapterDefinition): GameData['stars'] {
  const stars: GameData['stars'] = [];
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 0.3 + Math.random() * 2.2,
      brightness: 0.2 + Math.random() * 0.8,
    });
  }
  return stars;
}

export function buildNebulae(chapter: ChapterDefinition): Nebula[] {
  const nebulae: Nebula[] = [];
  const cols = chapter.nebulaColors;
  for (let i = 0; i < 6; i++) {
    nebulae.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      radius: 60 + Math.random() * 100,
      color: cols[Math.floor(Math.random() * cols.length)],
      speed: 0.15 + Math.random() * 0.3,
      alpha: 0.15 + Math.random() * 0.2,
    });
  }
  return nebulae;
}

export function applyChapterToGame(g: GameData, chapterId: ChapterId): void {
  const chapter = getChapter(chapterId);
  g.chapterId = chapterId;
  g.stars = buildStars(chapter);
  g.nebulae = buildNebulae(chapter);
}

export function syncChapterForWave(g: GameData): void {
  const next = getChapterForWave(g.wave);
  if (next === g.chapterId) return;
  applyChapterToGame(g, next);
}

export function drawChapterBackground(ctx: CanvasRenderingContext2D, g: GameData): void {
  const chapter = getChapter(g.chapterId);
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, chapter.bgTop);
  bg.addColorStop(0.5, chapter.bgMid);
  bg.addColorStop(1, chapter.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (const n of g.nebulae) {
    const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
    gr.addColorStop(0, n.color);
    gr.addColorStop(1, 'transparent');
    ctx.globalAlpha = n.alpha;
    ctx.fillStyle = gr;
    ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
  }
  ctx.globalAlpha = 1;

  for (const s of g.stars) {
    ctx.globalAlpha = s.brightness;
    ctx.fillStyle = s.speed > 1.8 ? chapter.starBright : chapter.starDim;
    const sz = s.speed > 1.5 ? 2 : 1;
    ctx.fillRect(s.x, s.y, sz, sz);
    if (s.speed > 1.8) {
      ctx.globalAlpha = s.brightness * 0.3;
      ctx.fillRect(s.x, s.y - s.speed * 1.5, 1, s.speed * 1.5);
    }
  }
  ctx.globalAlpha = 1;
}
