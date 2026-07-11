import type { CoopLoadout, GameData, Player } from './types';

/** True when the current mode is the 2-player co-op endless mode. */
export function isCoopMode(g: GameData): boolean {
  return g.gameMode === 'coop_endless';
}

/** Ships currently in play: both ships in co-op with a joined guest, else solo. */
export function activePlayers(g: GameData): Player[] {
  return g.player2 ? [g.player, g.player2] : [g.player];
}

/** True when the run should end: either ship down in co-op, or the lone ship down in solo. */
export function shouldTeamWipe(g: GameData): boolean {
  if (!isCoopMode(g) || !g.player2) return g.player.hp <= 0;
  return g.player.hp <= 0 || g.player2.hp <= 0;
}

/** Room-relayed lobby state, shaped like the `lobby` net message. */
export interface CoopLobbySnapshot {
  hostPresent: boolean;
  guestPresent: boolean;
  canStart: boolean;
  hostLoadout?: CoopLoadout;
  guestLoadout?: CoopLoadout;
}

/** Applies a `lobby` message onto menu-facing GameData fields. */
export function applyLobbyMessage(g: GameData, msg: CoopLobbySnapshot): void {
  g.coopHostPresent = msg.hostPresent;
  g.coopGuestPresent = msg.guestPresent;
  g.coopLobbyCanStart = msg.canStart;
  g.coopHostLoadout = msg.hostLoadout ?? null;
  g.coopGuestLoadout = msg.guestLoadout ?? null;
  g.coopError = null;
  if (msg.canStart) {
    g.coopLobbyStatus = 'ready';
  } else {
    g.coopLobbyStatus = g.coopRole === 'guest' ? 'waiting_for_host' : 'waiting_for_guest';
  }
}

/** Applies an `error` message (e.g. `room_full`, `role_taken`, `game_started`). */
export function applyCoopError(g: GameData, message: string): void {
  g.coopError = message;
  g.coopLobbyStatus = 'error';
}

const COOP_ERROR_LABELS: Record<string, string> = {
  room_full: 'Room is full',
  role_taken: 'Role already taken in this room',
  game_started: 'That room already started',
  invalid_code: 'Enter a valid 6-character code',
  disconnected: 'Disconnected from room',
};

/** Human-readable text for a coop `error` message code. */
export function describeCoopError(code: string): string {
  return COOP_ERROR_LABELS[code] ?? code;
}

export interface CoopLobbyCopy {
  value: string;
  detail: string;
}

/** Menu-facing copy for the current coop lobby phase. */
export function describeCoopLobby(g: GameData): CoopLobbyCopy {
  if (g.coopLobbyStatus === 'error' && g.coopError) {
    return { value: describeCoopError(g.coopError).toUpperCase(), detail: 'H to host · J to join' };
  }
  switch (g.coopLobbyStatus) {
    case 'connecting':
      return { value: 'CONNECTING…', detail: '' };
    case 'waiting_for_guest':
      return {
        value: `CODE ${g.coopRoomCode} · WAITING FOR GUEST`,
        detail: 'Share the code — guest presses J to join',
      };
    case 'waiting_for_host':
      return {
        value: `CODE ${g.coopRoomCode} · WAITING FOR HOST`,
        detail: 'Host presses SPACE when ready',
      };
    case 'ready':
      return g.coopRole === 'host'
        ? { value: `CODE ${g.coopRoomCode} · READY`, detail: 'PRESS SPACE TO START' }
        : { value: `CODE ${g.coopRoomCode} · READY`, detail: 'Waiting for host to start' };
    case 'idle':
    default:
      return { value: 'H: HOST ROOM · J: JOIN ROOM', detail: 'Co-op needs a friend and a room code' };
  }
}

/** Clears session/lobby fields back to their pre-connect defaults. */
export function resetCoopLobby(g: GameData): void {
  g.coopRole = null;
  g.coopRoomCode = '';
  g.coopHostPresent = false;
  g.coopGuestPresent = false;
  g.coopLobbyCanStart = false;
  g.coopHostLoadout = null;
  g.coopGuestLoadout = null;
  g.coopError = null;
  g.coopLobbyStatus = 'idle';
}
