import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './room-code';

describe('room-code', () => {
  it('generates 6-char uppercase alphanumeric codes', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('normalizes lowercase input', () => {
    expect(normalizeRoomCode('ab12cd')).toBe('AB12CD');
  });

  it('rejects invalid codes', () => {
    expect(isValidRoomCode('')).toBe(false);
    expect(isValidRoomCode('SHORT')).toBe(false);
    expect(isValidRoomCode('TOOLONG1')).toBe(false);
    expect(isValidRoomCode('AB12CD')).toBe(true);
  });
});
