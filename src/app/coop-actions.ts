import { beginCoopRun, type CoopStartPayload } from '../game/engine';
import { applyCoopError, applyLobbyMessage, resetCoopLobby } from '../game/coop';
import type { GameData } from '../game/types';
import { CoopSession } from '../net/coop-session';
import type { NetMessage } from '../net/protocol';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '../net/room-code';

function localLoadout(g: GameData) {
  return { aircraftId: g.selectedAircraft, weaponId: g.selectedWeapon };
}

function handleCoopMessage(g: GameData, msg: NetMessage): void {
  switch (msg.type) {
    case 'lobby':
      applyLobbyMessage(g, msg);
      break;
    case 'start':
      beginCoopRun(g, msg);
      break;
    case 'error':
      applyCoopError(g, msg.message);
      break;
    default:
      break;
  }
}

function handleCoopClose(g: GameData): void {
  if (g.coopLobbyStatus === 'error') return;
  applyCoopError(g, 'disconnected');
}

/** Host flow: generate a room code, connect, and announce as host. */
export function hostCoopEndless(g: GameData, session: CoopSession): void {
  resetCoopLobby(g);
  g.coopRole = 'host';
  g.coopRoomCode = generateRoomCode();
  g.coopLobbyStatus = 'connecting';
  session.connect(g.coopRoomCode, {
    onMessage: (msg) => handleCoopMessage(g, msg),
    onClose: () => handleCoopClose(g),
  });
  session.sendHello('host', localLoadout(g));
}

/** Join flow: prompt for a room code, validate, connect, and announce as guest. */
export function joinCoopEndless(g: GameData, session: CoopSession): void {
  const raw = window.prompt('Room code');
  if (raw === null) return;
  if (!isValidRoomCode(raw)) {
    applyCoopError(g, 'invalid_code');
    return;
  }
  resetCoopLobby(g);
  g.coopRole = 'guest';
  g.coopRoomCode = normalizeRoomCode(raw);
  g.coopLobbyStatus = 'connecting';
  session.connect(g.coopRoomCode, {
    onMessage: (msg) => handleCoopMessage(g, msg),
    onClose: () => handleCoopClose(g),
  });
  session.sendHello('guest', localLoadout(g));
}

/** Host-only: sends the `start` payload to the room and boots the local run. Returns success. */
export function startCoopEndlessRun(g: GameData, session: CoopSession): boolean {
  if (g.coopRole !== 'host' || !g.coopLobbyCanStart) return false;
  const payload: CoopStartPayload = {
    difficulty: g.difficulty,
    seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
    hostLoadout: localLoadout(g),
    guestLoadout: g.coopGuestLoadout ?? localLoadout(g),
  };
  session.send({ type: 'start', ...payload });
  beginCoopRun(g, payload);
  return true;
}

/** Leaves the coop session (e.g. cycling the menu mode away from Co-op Endless). */
export function leaveCoopEndless(g: GameData, session: CoopSession): void {
  session.disconnect();
  resetCoopLobby(g);
}
