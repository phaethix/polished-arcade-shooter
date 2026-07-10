import { useEffect, type RefObject } from 'react';
import { update, updateBackground, render } from '../game/engine';
import { FIXED_TIMESTEP_S, MAX_FRAME_DELTA_S } from '../game/core/constants';
import type { GameData } from '../game/types';
import type { InputState } from './input';

export function useGameLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  gameRef: RefObject<GameData>,
  inputRef: RefObject<InputState>,
  rafRef: RefObject<number>,
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

    const tick = (now: number) => {
      let elapsed = (now - last) / 1000;
      last = now;
      elapsed = Math.min(elapsed, MAX_FRAME_DELTA_S);
      accumulator += elapsed;

      const game = gameRef.current;
      const input = inputRef.current;

      while (accumulator >= FIXED_TIMESTEP_S) {
        if (game.state === 'playing') {
          update(game, input, FIXED_TIMESTEP_S);
        } else {
          updateBackground(game, FIXED_TIMESTEP_S);
        }
        accumulator -= FIXED_TIMESTEP_S;
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
