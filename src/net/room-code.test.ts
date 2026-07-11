import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './room-code';

describe('room-code', () => {
  it('generates 6-char codes from the ambiguous-safe alphabet only', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(code).not.toMatch(/[IO01]/);
  });

  it('normalizes lowercase input', () => {
    expect(normalizeRoomCode('ab23cd')).toBe('AB23CD');
  });

  it('accepts codes the generator can produce', () => {
    expect(isValidRoomCode('AB23CD')).toBe(true);
    expect(isValidRoomCode('ab23cd')).toBe(true);
  });

  it('rejects length errors and ambiguous generator-excluded characters', () => {
    expect(isValidRoomCode('')).toBe(false);
    expect(isValidRoomCode('SHORT')).toBe(false);
    expect(isValidRoomCode('TOOLONG1')).toBe(false);
    expect(isValidRoomCode('AI01OX')).toBe(false);
    expect(isValidRoomCode('AB12CD')).toBe(false); // '1' is never generated
    expect(isValidRoomCode('AB0LCD')).toBe(false); // '0' is never generated
  });
});
