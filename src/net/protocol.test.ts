import { describe, it, expect } from 'vitest';
import { parseNetMessage, type NetMessage } from './protocol';

describe('protocol', () => {
  it('parses a valid input message', () => {
    const raw = JSON.stringify({
      type: 'input',
      left: true,
      right: false,
      up: false,
      down: false,
      shoot: true,
      bomb: false,
      skill: false,
      pause: false,
    });
    const msg = parseNetMessage(raw);
    expect(msg?.type).toBe('input');
    if (msg?.type === 'input') expect(msg.shoot).toBe(true);
  });

  it('returns null for garbage', () => {
    expect(parseNetMessage('{')).toBeNull();
    expect(parseNetMessage(JSON.stringify({ type: 'nope' }))).toBeNull();
  });
});
