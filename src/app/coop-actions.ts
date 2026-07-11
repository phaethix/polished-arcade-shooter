import { beginCoopRun, togglePause, type CoopStartPayload } from '../game/engine';
import { endCoopRunForDisconnect } from '../game/combat';
import { applyCoopError, applyLobbyMessage, isCoopMode, resetCoopLobby } from '../game/coop';
import type { GameData } from '../game/types';
import type { InputState } from './input';
import { CoopSession } from '../net/coop-session';
import type { NetMessage } from '../net/protocol';
import { applySnapshot, buildSnapshot, type GameSnapshot } from '../net/snapshot';
import { generateRoomCode, isRoomCodeChar, isValidRoomCode, normalizeRoomCode } from '../net/room-code';

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
      // Always apply lobby after ending so canStart/presence are not left stale
      // (otherwise host rematch could spawn a ghost P2 with no live guest).
      if (isCoopRunActive(g)) {
        if (g.coopRole === 'guest' && !msg.hostPresent) {
          endCoopRunFromPeerLeft(g, session, 'host_left');
          applyLobbyMessage(g, msg);
          return;
        }
        if (g.coopRole === 'host' && !msg.guestPresent) {
          endCoopRunFromPeerLeft(g, session, 'guest_left');
          applyLobbyMessage(g, msg);
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

/** Opens on-canvas room-code entry (no browser prompt). Drops any prior socket. */
export function beginJoinCoopCodeEntry(g: GameData, session?: CoopSession): void {
  session?.disconnect();
  resetCoopLobby(g);
  g.coopRole = 'guest';
  g.coopCodeDraft = '';
  g.coopLobbyStatus = 'entering_code';
}

/** Alias used by menu H/J and touch — starts typing the room code on screen. */
export function joinCoopEndless(g: GameData, session: CoopSession): void {
  beginJoinCoopCodeEntry(g, session);
}

/** Appends one character to the join draft while `entering_code`. */
export function appendCoopCodeDraft(g: GameData, raw: string): void {
  if (g.coopLobbyStatus !== 'entering_code') return;
  if (!isRoomCodeChar(raw)) return;
  if (g.coopCodeDraft.length >= 6) return;
  g.coopCodeDraft += raw.toUpperCase();
}

/** Removes the last draft character while `entering_code`. */
export function backspaceCoopCodeDraft(g: GameData): void {
  if (g.coopLobbyStatus !== 'entering_code') return;
  g.coopCodeDraft = g.coopCodeDraft.slice(0, -1);
}

/** Cancels on-canvas join entry and returns to the idle lobby. */
export function cancelJoinCoopCodeEntry(g: GameData): void {
  if (g.coopLobbyStatus !== 'entering_code') return;
  resetCoopLobby(g);
}

/**
 * Guest join: validate the on-screen draft, connect, and announce as guest.
 * Returns whether the connect attempt started.
 */
export function submitJoinCoopCode(g: GameData, session: CoopSession): boolean {
  if (g.coopLobbyStatus !== 'entering_code') return false;
  if (!isValidRoomCode(g.coopCodeDraft)) {
    applyCoopError(g, 'invalid_code');
    return false;
  }
  const code = normalizeRoomCode(g.coopCodeDraft);
  g.coopRole = 'guest';
  g.coopRoomCode = code;
  g.coopCodeDraft = '';
  g.coopLobbyStatus = 'connecting';
  session.connect(code, {
    onMessage: (msg) => handleCoopMessage(g, msg, session),
    onClose: () => handleCoopClose(g),
  });
  session.sendHello('guest', localLoadout(g));
  return true;
}

/** Host-only: sends the `start` payload to the room and boots the local run. Returns success. */
export function startCoopEndlessRun(g: GameData, session: CoopSession): boolean {
  // Require a live guest presence, not only a stale canStart flag from a prior lobby.
  if (g.coopRole !== 'host' || !g.coopLobbyCanStart || !g.coopGuestPresent) return false;
  if (!g.coopGuestLoadout) return false;
  const payload: CoopStartPayload = {
    difficulty: g.difficulty,
    seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
    hostLoadout: localLoadout(g),
    guestLoadout: g.coopGuestLoadout,
  };
  session.send({ type: 'start', ...payload });
  beginCoopRun(g, payload);
  return true;
}

/**
 * Re-announces the local aircraft/weapon while connected in the lobby so the peer's
 * `start` payload / menu copy stay current after mid-lobby loadout changes.
 */
export function syncCoopLobbyLoadout(g: GameData, session: CoopSession): void {
  if (!isCoopMode(g) || g.state !== 'menu' || !g.coopRole) return;
  if (
    g.coopLobbyStatus === 'idle' ||
    g.coopLobbyStatus === 'entering_code' ||
    g.coopLobbyStatus === 'error'
  ) {
    return;
  }
  session.sendHello(g.coopRole, localLoadout(g));
}

/**
 * Coop game-over continue: host rematches in the same room; guest returns to the lobby
 * and waits for the next `start`. Solo / non-gameover callers get false.
 */
export function restartCoopFromGameOver(g: GameData, session: CoopSession): boolean {
  if (!isCoopMode(g) || g.state !== 'gameover') return false;
  if (g.coopRole === 'host') {
    return startCoopEndlessRun(g, session);
  }
  g.player2 = null;
  g.state = 'menu';
  if (g.coopLobbyCanStart) {
    g.coopLobbyStatus = 'ready';
  } else if (g.coopRole === 'guest') {
    g.coopLobbyStatus = 'waiting_for_host';
  }
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
 * Pointer drag is converted to touchDx/touchDy here because guests do not run the local sim.
 */
export function sendCoopGuestInput(g: GameData, session: CoopSession, input: InputState): void {
  if (g.coopRole !== 'guest') return;

  let touchDx = 0;
  let touchDy = 0;
  if (input.touchActive && input.touchX != null && input.touchY != null) {
    if (input.prevTouchX != null && input.prevTouchY != null) {
      touchDx = (input.touchX - input.prevTouchX) * 1.5;
      touchDy = (input.touchY - input.prevTouchY) * 1.5;
    }
    input.prevTouchX = input.touchX;
    input.prevTouchY = input.touchY;
  } else {
    input.prevTouchX = input.prevTouchY = null;
  }

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
    touchDx,
    touchDy,
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
  guestInput.touchDx = msg.touchDx ?? 0;
  guestInput.touchDy = msg.touchDy ?? 0;
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
