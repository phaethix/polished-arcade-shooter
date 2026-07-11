import { describe, it, expect } from 'vitest';
import { COOP_MAX_CONNECTIONS, shouldRejectRoomJoin } from './room-capacity';

describe('shouldRejectRoomJoin', () => {
  it('allows the first and second player when the joiner is already listed', () => {
    expect(shouldRejectRoomJoin(['a'], 'a')).toBe(false);
    expect(shouldRejectRoomJoin(['a', 'b'], 'b')).toBe(false);
  });

  it('rejects a third player when the joiner is already listed (PartyKit semantics)', () => {
    expect(shouldRejectRoomJoin(['a', 'b', 'c'], 'c')).toBe(true);
  });

  it('allows the first and second player when the joiner is not yet listed', () => {
    expect(shouldRejectRoomJoin([], 'a')).toBe(false);
    expect(shouldRejectRoomJoin(['a'], 'b')).toBe(false);
  });

  it('rejects a third player when the joiner is not yet listed', () => {
    expect(shouldRejectRoomJoin(['a', 'b'], 'c')).toBe(true);
  });

  it('uses the co-op max of 2 by default', () => {
    expect(COOP_MAX_CONNECTIONS).toBe(2);
  });
});
