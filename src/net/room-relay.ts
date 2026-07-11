import type { NetMessage } from './protocol';

export type CoopConnRole = 'host' | 'guest' | null;

/**
 * Whether the room should forward this message from a connection with the given role.
 * Host owns start / snapshot / gameover; guest owns input. Hello is handled separately.
 */
export function shouldRelayFromRole(
  type: NetMessage['type'],
  role: CoopConnRole | undefined,
): boolean {
  if (type === 'start' || type === 'snapshot' || type === 'gameover') {
    return role === 'host';
  }
  if (type === 'input') {
    return role === 'guest';
  }
  return false;
}
