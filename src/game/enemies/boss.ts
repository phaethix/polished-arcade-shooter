import type { BossPatternId, ChapterId } from '../types';

const CHAPTER_BOSS_PATTERN: Record<ChapterId, BossPatternId> = {
  space: 'fan',
  asteroid: 'rain',
  carrier: 'broadside',
  wormhole: 'ring',
};

/** Maps the active chapter to its boss attack pattern. */
export function bossPatternForChapter(chapterId: ChapterId): BossPatternId {
  return CHAPTER_BOSS_PATTERN[chapterId];
}

/** Evenly spaced angles on a full circle (radians). */
export function ringAngles(count: number): number[] {
  const angles: number[] = [];
  for (let i = 0; i < count; i++) {
    angles.push((i / count) * Math.PI * 2);
  }
  return angles;
}

export interface BossAccentColors {
  hullTop: string;
  hullBottom: string;
  eye: string;
  glow: string;
}

/** Hull / eye accents for boss rendering by pattern. */
export function bossAccentColors(pattern: BossPatternId): BossAccentColors {
  switch (pattern) {
    case 'rain':
      return { hullTop: '#cc8822', hullBottom: '#664411', eye: '#fa4', glow: '#ff8800' };
    case 'broadside':
      return { hullTop: '#4488cc', hullBottom: '#224466', eye: '#8cf', glow: '#44aaff' };
    case 'ring':
      return { hullTop: '#9944cc', hullBottom: '#442266', eye: '#c8f', glow: '#aa44ff' };
    case 'fan':
    default:
      return { hullTop: '#cc2244', hullBottom: '#611', eye: '#f46', glow: '#ff2244' };
  }
}

/** Slightly slower fire for denser patterns. */
export function bossShootInterval(pattern: BossPatternId): number {
  switch (pattern) {
    case 'rain':
      return 28;
    case 'broadside':
      return 30;
    case 'ring':
      return 40;
    case 'fan':
    default:
      return 25;
  }
}
