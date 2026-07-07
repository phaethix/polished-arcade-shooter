import type { HighScore } from '../types';

const HS_KEY = 'sky_blaster_hs_v2';

export function loadHighScores(): HighScore[] {
  try { const r = localStorage.getItem(HS_KEY); if (r) return JSON.parse(r); } catch {/* */}
  return [];
}

export function saveHighScore(score: number, wave: number): HighScore[] {
  const s = loadHighScores();
  s.push({ score, wave, date: new Date().toLocaleDateString() });
  s.sort((a, b) => b.score - a.score);
  const top = s.slice(0, 10);
  try { localStorage.setItem(HS_KEY, JSON.stringify(top)); } catch {/* */}
  return top;
}
