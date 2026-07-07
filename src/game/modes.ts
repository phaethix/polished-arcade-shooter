import type { ChapterId, DailyModifier, EnemyType, GameData, GameMode } from './types';
import { applyChapterToGame, CHAPTER_ORDER, getChapter, getChapterForWave } from './chapters';

export type { DailyModifier };

export const MODE_ORDER: GameMode[] = ['story', 'endless', 'boss_rush', 'daily'];

export const MODE_INFO: Record<GameMode, { name: string; tagline: string }> = {
  story: { name: 'Story Mode', tagline: '4 chapters · 20 stages' },
  endless: { name: 'Endless', tagline: 'Survive infinite waves' },
  boss_rush: { name: 'Boss Rush', tagline: 'Back-to-back boss fights' },
  daily: { name: 'Daily Challenge', tagline: 'Seeded run with a twist' },
};

const DAILY_MODIFIERS: DailyModifier[] = [
  'double_speed',
  'no_powerups',
  'single_hp',
  'kamikaze_only',
];

const STORY_BOSSES: Record<number, string> = {
  5: 'Space Commander',
  10: 'Mining Rig',
  15: 'Carrier Core',
  20: 'Void Entity',
};

const STORY_MAX_STAGE = 20;

export function nextGameMode(mode: GameMode, direction: -1 | 1): GameMode {
  const idx = MODE_ORDER.indexOf(mode);
  const next = (idx + direction + MODE_ORDER.length) % MODE_ORDER.length;
  return MODE_ORDER[next];
}

export function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function pickDailyModifier(seed: number): DailyModifier {
  return DAILY_MODIFIERS[seed % DAILY_MODIFIERS.length];
}

export function getDailyModifierLabel(mod: DailyModifier): string {
  switch (mod) {
    case 'double_speed': return '2× enemy speed';
    case 'no_powerups': return 'No power-ups';
    case 'single_hp': return 'Single HP';
    case 'kamikaze_only': return 'Kamikaze swarm';
  }
}

export function initModeState(g: GameData): void {
  g.modeVictory = false;
  if (g.gameMode === 'daily') {
    g.dailySeed = getDailySeed();
    g.dailyModifier = pickDailyModifier(g.dailySeed);
  } else {
    g.dailySeed = 0;
    g.dailyModifier = null;
  }
}

export function applyDailyPlayerMods(g: GameData): void {
  if (g.gameMode === 'daily' && g.dailyModifier === 'single_hp') {
    g.player.maxHp = 1;
    g.player.hp = 1;
  }
}

export function getChapterForMode(g: GameData): ChapterId {
  if (g.gameMode === 'boss_rush') {
    return CHAPTER_ORDER[(g.wave - 1) % CHAPTER_ORDER.length];
  }
  return getChapterForWave(g.wave);
}

/** Returns true when the chapter changed. */
export function syncChapterForMode(g: GameData): boolean {
  const next = getChapterForMode(g);
  if (next === g.chapterId) return false;
  applyChapterToGame(g, next);
  return true;
}

export function isBossWave(g: GameData): boolean {
  switch (g.gameMode) {
    case 'boss_rush':
      return true;
    case 'story':
      return g.wave % 5 === 0;
    case 'endless':
    case 'daily':
      return g.wave % 5 === 0 && g.wave >= 5;
  }
}

export function getEnemiesPerWave(g: GameData): number {
  if (isBossWave(g)) return 1;
  switch (g.gameMode) {
    case 'story':
      return 4 + g.wave;
    case 'boss_rush':
      return 1;
    case 'endless':
    case 'daily':
      return 5 + g.wave * 2;
  }
}

export function isStoryComplete(g: GameData): boolean {
  return g.gameMode === 'story' && g.wave >= STORY_MAX_STAGE;
}

export function getWaveLabel(g: GameData): string {
  if (g.gameMode === 'story') return `STAGE ${g.wave}`;
  if (g.gameMode === 'boss_rush') return `BOSS ${g.wave}`;
  return `WAVE ${g.wave}`;
}

export interface WaveAnnounce {
  main: string;
  sub?: string;
  boss: boolean;
  bossColor?: string;
}

export function getWaveAnnounce(g: GameData): WaveAnnounce {
  const boss = isBossWave(g);
  if (g.gameMode === 'story') {
    const bossName = STORY_BOSSES[g.wave];
    if (boss && bossName) {
      return { main: `⚠ ${bossName.toUpperCase()} ⚠`, sub: `STAGE ${g.wave}`, boss: true };
    }
    const chapter = getChapter(getChapterForMode(g));
    return { main: `STAGE ${g.wave}`, sub: chapter.name.toUpperCase(), boss: false };
  }
  if (g.gameMode === 'boss_rush') {
    return { main: `⚠ BOSS ${g.wave} ⚠`, boss: true };
  }
  if (boss) {
    return { main: `⚠ BOSS WAVE ${g.wave} ⚠`, boss: true };
  }
  const chapter = getChapter(getChapterForMode(g));
  return {
    main: `WAVE ${g.wave}`,
    sub: g.wave > 1 ? chapter.name.toUpperCase() : undefined,
    boss: false,
  };
}

export function powerUpsEnabled(g: GameData): boolean {
  return !(g.gameMode === 'daily' && g.dailyModifier === 'no_powerups');
}

export function getEnemySpeedMult(g: GameData): number {
  if (g.gameMode === 'daily' && g.dailyModifier === 'double_speed') return 2;
  return 1;
}

export function getSpawnPoolOverride(g: GameData): EnemyType[] | null {
  if (g.gameMode === 'daily' && g.dailyModifier === 'kamikaze_only') {
    return ['kamikaze', 'kamikaze', 'kamikaze', 'kamikaze', 'fast'];
  }
  return null;
}

export function getBossHp(g: GameData): number {
  if (g.gameMode === 'boss_rush') return 18 + g.wave * 10;
  return 20 + g.wave * 5;
}
