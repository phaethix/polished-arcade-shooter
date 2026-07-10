import { describe, it, expect } from 'vitest';
import { formatAccuracy } from './run-stats';

describe('formatAccuracy', () => {
  it('returns em dash when no shots fired', () => {
    expect(formatAccuracy(0, 0)).toBe('—');
  });

  it('rounds percent from hits over fired', () => {
    expect(formatAccuracy(3, 10)).toBe('30%');
  });
});
