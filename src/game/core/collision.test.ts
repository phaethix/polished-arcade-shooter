import { describe, it, expect } from 'vitest';
import { boxesOverlap } from './collision';

describe('boxesOverlap', () => {
  it('returns true for fully overlapping boxes', () => {
    expect(boxesOverlap(50, 50, 20, 20, 50, 50, 20, 20)).toBe(true);
  });

  it('returns true for partially overlapping boxes', () => {
    expect(boxesOverlap(40, 40, 20, 20, 50, 50, 20, 20)).toBe(true);
  });

  it('returns true when one box is inside another', () => {
    expect(boxesOverlap(50, 50, 40, 40, 50, 50, 10, 10)).toBe(true);
  });

  it('returns false for separated boxes on x axis', () => {
    expect(boxesOverlap(0, 50, 20, 20, 100, 50, 20, 20)).toBe(false);
  });

  it('returns false for separated boxes on y axis', () => {
    expect(boxesOverlap(50, 0, 20, 20, 50, 100, 20, 20)).toBe(false);
  });

  it('returns false when edges exactly touch (strict less-than)', () => {
    // Distance equals half-widths sum → not strictly less
    expect(boxesOverlap(0, 0, 20, 20, 20, 0, 20, 20)).toBe(false);
  });

  it('returns true for boxes overlapping only on one axis corner', () => {
    // Overlap by 1px on both axes
    expect(boxesOverlap(0, 0, 20, 20, 19, 19, 20, 20)).toBe(true);
  });
});
