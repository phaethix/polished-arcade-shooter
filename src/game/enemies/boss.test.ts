import { describe, it, expect } from 'vitest';
import { bossPatternForChapter, ringAngles, bossAccentColors, bossShootInterval } from './boss';
import { CHAPTER_ORDER } from '../chapters';

describe('bossPatternForChapter', () => {
  it('maps each chapter to the designed pattern', () => {
    expect(bossPatternForChapter('space')).toBe('fan');
    expect(bossPatternForChapter('asteroid')).toBe('rain');
    expect(bossPatternForChapter('carrier')).toBe('broadside');
    expect(bossPatternForChapter('wormhole')).toBe('ring');
  });

  it('covers every chapter in CHAPTER_ORDER', () => {
    for (const id of CHAPTER_ORDER) {
      expect(bossPatternForChapter(id)).toBeTruthy();
    }
  });
});

describe('ringAngles', () => {
  it('returns the requested count of evenly spaced angles', () => {
    const angles = ringAngles(8);
    expect(angles).toHaveLength(8);
    expect(angles[0]).toBe(0);
    expect(angles[4]).toBeCloseTo(Math.PI);
    expect(angles[7]).toBeCloseTo((7 / 8) * Math.PI * 2);
  });
});

describe('bossAccentColors', () => {
  it('returns distinct accents per pattern', () => {
    const fan = bossAccentColors('fan');
    const rain = bossAccentColors('rain');
    const broadside = bossAccentColors('broadside');
    const ring = bossAccentColors('ring');
    expect(new Set([fan.hullTop, rain.hullTop, broadside.hullTop, ring.hullTop]).size).toBe(4);
  });
});

describe('bossShootInterval', () => {
  it('slows denser patterns relative to fan', () => {
    expect(bossShootInterval('fan')).toBe(25);
    expect(bossShootInterval('ring')).toBeGreaterThan(bossShootInterval('fan'));
  });
});
