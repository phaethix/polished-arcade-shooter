import { describe, it, expect } from 'vitest';
import { shouldRelayFromRole } from './room-relay';

describe('shouldRelayFromRole', () => {
  it('only hosts may relay start, snapshot, and gameover', () => {
    expect(shouldRelayFromRole('start', 'host')).toBe(true);
    expect(shouldRelayFromRole('snapshot', 'host')).toBe(true);
    expect(shouldRelayFromRole('gameover', 'host')).toBe(true);
    expect(shouldRelayFromRole('start', 'guest')).toBe(false);
    expect(shouldRelayFromRole('gameover', 'guest')).toBe(false);
    expect(shouldRelayFromRole('start', null)).toBe(false);
  });

  it('only guests may relay input', () => {
    expect(shouldRelayFromRole('input', 'guest')).toBe(true);
    expect(shouldRelayFromRole('input', 'host')).toBe(false);
  });
});
