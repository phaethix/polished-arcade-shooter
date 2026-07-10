import { useRef, useEffect, useCallback } from 'react';
import {
  createGameData,
  resetGame,
  canStartGame,
  tryUnlockSelectedAircraft,
  tryUnlockSelectedWeapon,
  cycleAircraftSelection,
  cycleWeaponSelection,
  cycleGameModeSelection,
  cycleDifficultySelection,
  togglePause,
  resumeFromPause,
  update,
  updateBackground,
  render,
} from './game/engine';
import { createInputState, type InputState } from './app/input';
import { CANVAS_W, CANVAS_H, FIXED_TIMESTEP_S, MAX_FRAME_DELTA_S } from './game/core/constants';
import { isInSkillZone, resolveMenuTouch } from './game/render/menu-layout';
import { resumeAudio, playMenuSelect } from './game/audio';
import type { GameData } from './game/types';

function handleMenuTouchAction(g: GameData, cx: number, cy: number, toGame: (x: number, y: number) => { x: number; y: number } | null): void {
  const pt = toGame(cx, cy);
  if (!pt) {
    return;
  }

  const action = resolveMenuTouch(pt.x, pt.y);
  if (!action) {
    return;
  }

  switch (action.kind) {
    case 'cycle_mode':
      cycleGameModeSelection(g, action.direction);
      playMenuSelect();
      break;
    case 'cycle_aircraft':
      cycleAircraftSelection(g, action.direction);
      playMenuSelect();
      break;
    case 'cycle_weapon':
      cycleWeaponSelection(g, action.direction);
      playMenuSelect();
      break;
    case 'cycle_difficulty':
      cycleDifficultySelection(g, action.direction);
      playMenuSelect();
      break;
    case 'start':
      if (canStartGame(g)) {
        playMenuSelect();
        resetGame(g);
      }
      break;
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData>(createGameData());
  const inputRef = useRef<InputState>(createInputState());
  const rafRef = useRef<number>(0);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / CANVAS_W, rect.height / CANVAS_H);
    return {
      scale,
      offsetX: (rect.width - CANVAS_W * scale) / 2,
      offsetY: (rect.height - CANVAS_H * scale) / 2,
      rect,
    };
  }, []);

  // ── Game loop ──────────────────────────────────────────────
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

  // ── Keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent, down: boolean) => {
      const inp = inputRef.current;
      const g = gameRef.current;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleGameModeSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.up = down;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'KeyS':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleGameModeSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.down = down;
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleAircraftSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.left = down;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleAircraftSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.right = down;
          e.preventDefault();
          break;

        case 'KeyU':
          if (g.state === 'menu' && down) {
            resumeAudio();
            const unlockedCraft = tryUnlockSelectedAircraft(g);
            const unlockedWeapon = tryUnlockSelectedWeapon(g);
            if (unlockedCraft || unlockedWeapon) {
              playMenuSelect();
            }
            e.preventDefault();
          }
          break;

        case 'Space':
        case 'KeyZ':
          e.preventDefault();
          if (down) {
            resumeAudio();
            if (g.state === 'menu' || g.state === 'gameover') {
              if (g.state === 'menu' && !canStartGame(g)) {
                break;
              }
              playMenuSelect();
              resetGame(g);
            } else {
              inp.shoot = true;
            }
          } else {
            inp.shoot = false;
          }
          break;

        case 'KeyX':
        case 'KeyB':
          if (down && g.state === 'playing') {
            inp.bomb = true;
          }
          e.preventDefault();
          break;

        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          if (down && g.state === 'playing') {
            inp.skill = true;
          }
          e.preventDefault();
          break;

        case 'BracketLeft':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleWeaponSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'BracketRight':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleWeaponSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;

        case 'Comma':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleDifficultySelection(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'Period':
          if (g.state === 'menu' && down) {
            resumeAudio();
            cycleDifficultySelection(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;

        case 'Escape':
        case 'KeyP':
          if (down) {
            togglePause(g);
          }
          e.preventDefault();
          break;
      }
    };

    const kd = (e: KeyboardEvent) => handle(e, true);
    const ku = (e: KeyboardEvent) => handle(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  // ── Touch / Mouse ─────────────────────────────────────────
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
        handleMenuTouchAction(g, cx, cy, toGame);
        return;
      }
      if (g.state === 'gameover') {
        if (canStartGame(g)) {
          playMenuSelect();
          resetGame(g);
        }
        return;
      }
      if (g.state === 'paused') {
        resumeFromPause(g);
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
  }, [getCanvasScale]);

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ maxWidth: '100vw', maxHeight: '100vh' }}
      />
    </div>
  );
}
