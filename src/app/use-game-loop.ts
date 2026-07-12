import { useEffect, type RefObject } from 'react';
import { update, updateBackground, render } from '../game/engine';
import { FIXED_TIMESTEP_S, MAX_FRAME_DELTA_S } from '../game/core/constants';
import type { GameData } from '../game/types';
import type { InputState } from './input';
import { pollGamepadInput, type GamepadButtonPrev } from './gamepad';
import { isCoopMode } from '../game/coop';
import type { CoopSession } from '../net/coop-session';
import {
  notifyCoopTeamWipe,
  readGuestInputCommand,
  sendCoopGuestInput,
  sendCoopHostSnapshot,
} from './coop-actions';
import { stepGuestMovement } from '../game/systems/player-controller';

/** Host snapshot broadcast interval in fixed ticks; 1 = 60Hz, smooth for remotes. */
const COOP_SNAPSHOT_INTERVAL_TICKS = 1;
/** Cap on the guest's replay log so a stalled connection cannot grow it unbounded. */
const COOP_INPUT_LOG_CAP = 64;

export function useGameLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  gameRef: RefObject<GameData>,
  inputRef: RefObject<InputState>,
  rafRef: RefObject<number>,
  sessionRef: RefObject<CoopSession>,
): void {
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) {
      return;
    }
    const ctx = cvs.getContext('2d');
    if (!ctx) {
      return;
    }

    let last = performance.now();
    let accumulator = 0;
    let snapshotFrameCounter = 0;
    const gamepadPrev: GamepadButtonPrev = { bomb: false, skill: false, pause: false };

    const tick = (now: number) => {
      let elapsed = (now - last) / 1000;
      last = now;
      elapsed = Math.min(elapsed, MAX_FRAME_DELTA_S);
      accumulator += elapsed;

      const game = gameRef.current;
      const input = inputRef.current;
      const session = sessionRef.current;
      pollGamepadInput(game, input, gamepadPrev);

      // Guests never run the authoritative sim locally — they render whatever the
      // host's last snapshot says and only tick cosmetic ambience in the meantime.
      const isGuest = isCoopMode(game) && game.coopRole === 'guest';
      const wasPlaying = game.state === 'playing';

      while (accumulator >= FIXED_TIMESTEP_S) {
        if (game.state === 'playing' && !isGuest) {
          update(game, input, FIXED_TIMESTEP_S);
        } else {
          updateBackground(game, FIXED_TIMESTEP_S);
        }
        // Guests predict their own ship every tick so it tracks input 1:1. The
        // authoritative correction happens in applySnapshot (reconciliation): on
        // each host snapshot the ship snaps to the host position then replays the
        // unacknowledged inputs — smooth and correct, never a per-frame pull or a
        // threshold snap that would oscillate under lag.
        if (isGuest && game.state === 'playing') {
          const cmd = readGuestInputCommand(input);
          game.coopGuestTick++;
          game.coopInputLog.push({ tick: game.coopGuestTick, ...cmd });
          if (game.coopInputLog.length > COOP_INPUT_LOG_CAP) game.coopInputLog.shift();
          stepGuestMovement(game.player, cmd);
          if (session) sendCoopGuestInput(game, session, cmd, input, game.coopGuestTick);
        }
        accumulator -= FIXED_TIMESTEP_S;
      }

      if (wasPlaying && game.state === 'gameover') {
        notifyCoopTeamWipe(game, session);
      }

      if (isCoopMode(game) && (game.state === 'playing' || game.state === 'paused')) {
        if (game.coopRole === 'host') {
          snapshotFrameCounter++;
          if (snapshotFrameCounter >= COOP_SNAPSHOT_INTERVAL_TICKS) {
            snapshotFrameCounter = 0;
            sendCoopHostSnapshot(game, session);
          }
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const w = cvs.clientWidth;
      const h = cvs.clientHeight;
      if (cvs.width !== w * dpr || cvs.height !== h * dpr) {
        cvs.width = w * dpr;
        cvs.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(ctx, game, w, h);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}
