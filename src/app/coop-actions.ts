import { beginCoopRun, togglePause, type CoopStartPayload } from '../game/engine';
import { endCoopRunForDisconnect } from '../game/combat';
import { applyCoopError, applyLobbyMessage, isCoopMode, resetCoopLobby } from '../game/coop';
import type { GameData } from '../game/types';
import type { InputState } from './input';
import { CoopSession } from '../net/coop-session';
import type { NetMessage } from '../net/protocol';
import { applySnapshot, buildSnapshot, type GameSnapshot } from '../net/snapshot';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '../net/room-code';

function localLoadout(g: GameData) {
  return { aircraftId: g.selectedAircraft, weaponId: g.selectedWeapon };
}

/** True while a coop run is on screen (playing or paused), as opposed to menu/gameover. */
function isCoopRunActive(g: GameData): boolean {
  return isCoopMode(g) && (g.state === 'playing' || g.state === 'paused');
}

/** Ends the local run and, if we're the host, tells the room why. No-op outside an active run. */
function endCoopRunFromPeerLeft(
  g: GameData,
  session: CoopSession,
  reason: 'host_left' | 'guest_left',
): void {
  if (!isCoopRunActive(g)) return;
  endCoopRunForDisconnect(g);
  if (g.coopRole === 'host') {
    session.send({ type: 'gameover', reason });
  }
}

/** Exported for unit tests; also used internally to wire `CoopSession` handlers below. */
export function handleCoopMessage(g: GameData, msg: NetMessage, session: CoopSession): void {
  switch (msg.type) {
    case 'lobby':
      // Presence flags flipping to false mid-run mean the peer's socket closed; the
      // room only relays lobby-shape presence, not a dedicated "peer left" message.
      if (isCoopRunActive(g)) {
        if (g.coopRole === 'guest' && !msg.hostPresent) {
          endCoopRunFromPeerLeft(g, session, 'host_left');
          return;
        }
        if (g.coopRole === 'host' && !msg.guestPresent) {
          endCoopRunFromPeerLeft(g, session, 'guest_left');
          return;
        }
      }
      applyLobbyMessage(g, msg);
      break;
    case 'start':
      beginCoopRun(g, msg);
      break;
    case 'input':
      applyCoopGuestInput(g, msg);
      break;
    case 'snapshot':
      applyCoopSnapshot(g, msg.payload);
      break;
    case 'gameover':
      if (isCoopRunActive(g)) g.state = 'gameover';
      break;
    case 'error':
      applyCoopError(g, msg.message);
      break;
    default:
      break;
  }
}

/** Exported for unit tests; also used internally to wire `CoopSession` handlers below. */
export function handleCoopClose(g: GameData): void {
  if (isCoopRunActive(g)) {
    endCoopRunForDisconnect(g);
    return;
  }
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
    onMessage: (msg) => handleCoopMessage(g, msg, session),
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
    onMessage: (msg) => handleCoopMessage(g, msg, session),
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

/**
 * Guest-only: relays the local `InputState` to the host as an `input` message and
 * consumes the rising-edge bomb/skill/pause flags so each press is sent exactly once.
 */
export function sendCoopGuestInput(g: GameData, session: CoopSession, input: InputState): void {
  if (g.coopRole !== 'guest') return;
  session.send({
    type: 'input',
    left: input.left || input.padLeft,
    right: input.right || input.padRight,
    up: input.up || input.padUp,
    down: input.down || input.padDown,
    shoot: input.shoot || input.padShoot || input.touchActive,
    bomb: input.bomb,
    skill: input.skill,
    pause: input.pause,
  });
  input.bomb = false;
  input.skill = false;
  input.pause = false;
}

/**
 * Host-only: applies a guest `input` message onto `g.coopGuestInput` (consumed by
 * `updatePlayerFromInput`'s guest-ship branch) and applies pause requests immediately.
 */
function applyCoopGuestInput(g: GameData, msg: Extract<NetMessage, { type: 'input' }>): void {
  if (g.coopRole !== 'host') return;
  const guestInput = g.coopGuestInput;
  guestInput.left = msg.left;
  guestInput.right = msg.right;
  guestInput.up = msg.up;
  guestInput.down = msg.down;
  guestInput.shoot = msg.shoot;
  if (msg.bomb) guestInput.bomb = true;
  if (msg.skill) guestInput.skill = true;
  if (msg.pause) togglePause(g);
}

/** Host-only: serializes and sends the current frame's authoritative state to the guest. */
export function sendCoopHostSnapshot(g: GameData, session: CoopSession): void {
  if (g.coopRole !== 'host') return;
  session.send({ type: 'snapshot', payload: buildSnapshot(g) });
}

/** Guest-only: applies a host snapshot payload onto the local render-only state. */
function applyCoopSnapshot(g: GameData, payload: unknown): void {
  if (g.coopRole !== 'guest') return;
  applySnapshot(g, payload as GameSnapshot);
}

/** Host-only: tells the guest the run just ended from a team wipe. No-op for solo/guest. */
export function notifyCoopTeamWipe(g: GameData, session: CoopSession): void {
  if (isCoopMode(g) && g.coopRole === 'host') {
    session.send({ type: 'gameover', reason: 'team_wipe' });
  }
}
