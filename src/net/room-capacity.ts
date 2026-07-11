/** Max concurrent WebSocket clients allowed in a co-op PartyKit room. */
export const COOP_MAX_CONNECTIONS = 2;

/**
 * Whether a joining connection should be rejected as room_full.
 *
 * PartyKit includes the connecting socket in `room.getConnections()` during
 * `onConnect`, so a naive `count > max` works today — but counting *other*
 * connections with `>= max` is correct whether or not the joiner is already
 * listed (avoids off-by-one regressions across PartyKit versions).
 */
export function shouldRejectRoomJoin(
  connectionIds: readonly string[],
  joiningId: string,
  maxConnections = COOP_MAX_CONNECTIONS,
): boolean {
  const others = connectionIds.filter((id) => id !== joiningId).length;
  return others >= maxConnections;
}
