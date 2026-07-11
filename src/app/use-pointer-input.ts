import { useEffect, type RefObject } from 'react';
import { resetGame, canStartGame, resumeFromPause } from '../game/engine';
import { isCoopMode } from '../game/coop';
import { isInSkillZone } from '../game/render/menu-layout';
import { resumeAudio, playMenuSelect } from '../game/audio';
import type { GameData } from '../game/types';
import type { InputState } from './input';
import type { CoopSession } from '../net/coop-session';
import { handleMenuTouchAction } from './menu-touch';

interface CanvasScaleInfo {
  scale: number;
  offsetX: number;
  offsetY: number;
  rect: DOMRect;
}

export function usePointerInput(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  gameRef: RefObject<GameData>,
  inputRef: RefObject<InputState>,
  sessionRef: RefObject<CoopSession>,
  getCanvasScale: () => CanvasScaleInfo | null,
): void {
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) {
      return;
    }

    const toGame = (cx: number, cy: number) => {
      const info = getCanvasScale();
      if (!info) {
        return null;
      }
      return {
        x: (cx - info.rect.left - info.offsetX) / info.scale,
        y: (cy - info.rect.top - info.offsetY) / info.scale,
      };
    };

    const startInput = (cx: number, cy: number) => {
      resumeAudio();
      const g = gameRef.current;
      const inp = inputRef.current;

      if (g.state === 'menu') {
        handleMenuTouchAction(g, sessionRef.current, cx, cy, toGame);
        return;
      }
      if (g.state === 'gameover') {
        // Coop gameover has no local restart: only the host can start a new room run,
        // and it must go through the lobby's `start` flow, not a bare local resetGame.
        if (!isCoopMode(g) && canStartGame(g)) {
          playMenuSelect();
          resetGame(g);
        }
        return;
      }
      if (g.state === 'paused') {
        if (isCoopMode(g) && g.coopRole === 'guest') {
          inp.pause = true;
        } else {
          resumeFromPause(g);
        }
        return;
      }

      const pt = toGame(cx, cy);
      if (g.state === 'playing' && pt && isInSkillZone(pt.x, pt.y)) {
        inp.skill = true;
        return;
      }

      if (pt) {
        inp.touchX = pt.x;
        inp.touchY = pt.y;
        inp.prevTouchX = pt.x;
        inp.prevTouchY = pt.y;
      }
      inp.touchActive = true;
    };

    const moveInput = (cx: number, cy: number) => {
      const inp = inputRef.current;
      if (!inp.touchActive) {
        return;
      }
      const pt = toGame(cx, cy);
      if (pt) {
        inp.touchX = pt.x;
        inp.touchY = pt.y;
      }
    };

    const endInput = () => {
      const inp = inputRef.current;
      inp.touchActive = false;
      inp.touchX = inp.touchY = inp.prevTouchX = inp.prevTouchY = null;
    };

    const onTS = (e: TouchEvent) => {
      e.preventDefault();
      startInput(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault();
      moveInput(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTE = (e: TouchEvent) => {
      e.preventDefault();
      endInput();
    };

    cvs.addEventListener('touchstart', onTS, { passive: false });
    cvs.addEventListener('touchmove', onTM, { passive: false });
    cvs.addEventListener('touchend', onTE, { passive: false });
    cvs.addEventListener('touchcancel', onTE, { passive: false });

    const onMD = (e: MouseEvent) => startInput(e.clientX, e.clientY);
    const onMM = (e: MouseEvent) => moveInput(e.clientX, e.clientY);
    const onMU = () => endInput();

    cvs.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);

    return () => {
      cvs.removeEventListener('touchstart', onTS);
      cvs.removeEventListener('touchmove', onTM);
      cvs.removeEventListener('touchend', onTE);
      cvs.removeEventListener('touchcancel', onTE);
      cvs.removeEventListener('mousedown', onMD);
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onMU);
    };
  }, [canvasRef, gameRef, inputRef, sessionRef, getCanvasScale]);
}
