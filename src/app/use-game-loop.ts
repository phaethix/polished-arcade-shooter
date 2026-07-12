import { useEffect, type RefObject } from 'react';
import { update, updateBackground, render } from '../game/engine';
import { FIXED_TIMESTEP_S, MAX_FRAME_DELTA_S } from '../game/core/constants';
import type { GameData } from '../game/types';
import type { InputState } from './input';
import { pollGamepadInput, type GamepadButtonPrev } from './gamepad';
import { isCoopMode } from '../game/coop';
import type { CoopSession } from '../net/coop-session';
import { notifyCoopTeamWipe, sendCoopGuestInput, sendCoopHostSnapshot } from './coop-actions';
import { predictGuestKeyboard } from '../game/systems/player-controller';

/** Host snapshot broadcast rate: every N animation frames (~60fps / 2 ≈ 30Hz). */
const COOP_SNAPSHOT_INTERVAL_FRAMES = 2;
/** Guest input send rate: matches the host snapshot cadence (~30Hz). */
const COOP_INPUT_INTERVAL_FRAMES = 2;
/**
 * Drift (px) past which the guest snaps its ship to the host's authoritative
 * position. Plain movement only ever lags the host by the round-trip, which
 * stays well under this; only real desyncs (run start, extreme latency spikes)
 * trip it. A per-frame lerp toward the authoritative position is deliberately
 * avoided — it would cancel the prediction and re-introduce input lag.
 */
const COOP_PREDICT_MAX_DRIFT_PX = 128;

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
    let inputFrameCounter = 0;
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
        // Guests predict their own ship locally so it stays responsive between
        // host snapshots. Prediction runs every frame; the authoritative position
        // only hard-corrects gross desyncs (run start, extreme latency), never a
        // per-frame pull — that would cancel the prediction and re-add input lag.
        if (isGuest && game.state === 'playing') {
          predictGuestKeyboard(game.player, input);
          if (game.coopSelfTarget) {
            const dx = game.coopSelfTarget.x - game.player.x;
            const dy = game.coopSelfTarget.y - game.player.y;
            if (dx * dx + dy * dy > COOP_PREDICT_MAX_DRIFT_PX * COOP_PREDICT_MAX_DRIFT_PX) {
              game.player.x = game.coopSelfTarget.x;
              game.player.y = game.coopSelfTarget.y;
              game.player.tilt = game.coopSelfTarget.tilt;
            }
          }
        }
        accumulator -= FIXED_TIMESTEP_S;
      }

      if (wasPlaying && game.state === 'gameover') {
        notifyCoopTeamWipe(game, session);
      }

      if (isCoopMode(game) && (game.state === 'playing' || game.state === 'paused')) {
        if (game.coopRole === 'host') {
          snapshotFrameCounter++;
          if (snapshotFrameCounter >= COOP_SNAPSHOT_INTERVAL_FRAMES) {
            snapshotFrameCounter = 0;
            sendCoopHostSnapshot(game, session);
          }
        } else if (isGuest) {
          inputFrameCounter++;
          // Bomb / skill / pause are one-frame edges — send immediately so the 20Hz
          // throttle cannot drop them between polls.
          const urgent = input.bomb || input.skill || input.pause;
          if (urgent || inputFrameCounter >= COOP_INPUT_INTERVAL_FRAMES) {
            inputFrameCounter = 0;
            sendCoopGuestInput(game, session, input);
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
