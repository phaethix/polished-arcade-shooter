import { useRef, useEffect, useCallback } from 'react';
import {
  createGameData,
  createInputState,
  resetGame,
  cycleAircraftSelection,
  cycleWeaponSelection,
  update,
  updateBackground,
  render,
  CANVAS_W,
  CANVAS_H,
} from './game/engine';
import { resumeAudio, playMenuSelect } from './game/audio';
import type { InputState } from './game/engine';
import type { GameData } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData>(createGameData());
  const inputRef = useRef<InputState>(createInputState());
  const rafRef = useRef<number>(0);

  const getCanvasScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
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
    if (!cvs) return;
    const ctx = cvs.getContext('2d')!;
    const DT = 1 / 60;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed >= 14) {               // ~60 fps cap
        last = now;
        const game = gameRef.current;
        const input = inputRef.current;

        if (game.state === 'playing') {
          update(game, input, DT);
        } else {
          updateBackground(game, DT);    // stars, particles, shake/flash decay
        }

        // Resize backing store to match CSS size × DPR
        const dpr = window.devicePixelRatio || 1;
        const w = cvs.clientWidth;
        const h = cvs.clientHeight;
        if (cvs.width !== w * dpr || cvs.height !== h * dpr) {
          cvs.width = w * dpr;
          cvs.height = h * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        render(ctx, game, w, h);
      }
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
        case 'ArrowLeft': case 'KeyA':
          if (g.state === 'menu' && down) {
            cycleAircraftSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.left = down; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD':
          if (g.state === 'menu' && down) {
            cycleAircraftSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
            break;
          }
          inp.right = down; e.preventDefault(); break;
        case 'ArrowUp': case 'KeyW': inp.up = down; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': inp.down = down; e.preventDefault(); break;

        case 'Space': case 'KeyZ':
          e.preventDefault();
          if (down) {
            resumeAudio();
            if (g.state === 'menu' || g.state === 'gameover') {
              playMenuSelect(); resetGame(g);
            } else {
              inp.shoot = true;
            }
          } else { inp.shoot = false; }
          break;

        case 'KeyX': case 'KeyB':
          if (down && g.state === 'playing') inp.bomb = true;
          e.preventDefault(); break;

        case 'KeyC': case 'ShiftLeft': case 'ShiftRight':
          if (down && g.state === 'playing') inp.skill = true;
          e.preventDefault(); break;

        case 'BracketLeft':
          if (g.state === 'menu' && down) {
            cycleWeaponSelection(g, -1);
            playMenuSelect();
            e.preventDefault();
          }
          break;
        case 'BracketRight':
          if (g.state === 'menu' && down) {
            cycleWeaponSelection(g, 1);
            playMenuSelect();
            e.preventDefault();
          }
          break;

        case 'Escape': case 'KeyP':
          if (down) {
            if (g.state === 'playing') g.state = 'paused';
            else if (g.state === 'paused') g.state = 'playing';
          }
          e.preventDefault(); break;
      }
    };

    const kd = (e: KeyboardEvent) => handle(e, true);
    const ku = (e: KeyboardEvent) => handle(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // ── Touch / Mouse ─────────────────────────────────────────
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // Convert a client-space point → game-space
    const toGame = (cx: number, cy: number) => {
      const info = getCanvasScale();
      if (!info) return null;
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
        const pt = toGame(cx, cy);
        if (pt) {
          if (pt.y < 300) {
            if (pt.x < CANVAS_W / 3) {
              cycleAircraftSelection(g, -1);
              playMenuSelect();
            } else if (pt.x > (CANVAS_W * 2) / 3) {
              cycleAircraftSelection(g, 1);
              playMenuSelect();
            }
          } else if (pt.y < 380) {
            if (pt.x < CANVAS_W / 3) {
              cycleWeaponSelection(g, -1);
              playMenuSelect();
            } else if (pt.x > (CANVAS_W * 2) / 3) {
              cycleWeaponSelection(g, 1);
              playMenuSelect();
            }
          } else if (pt.x > CANVAS_W / 3 && pt.x < (CANVAS_W * 2) / 3) {
            playMenuSelect();
            resetGame(g);
          }
        }
        return;
      }
      if (g.state === 'gameover') { playMenuSelect(); resetGame(g); return; }
      if (g.state === 'paused') { g.state = 'playing'; return; }

      const pt = toGame(cx, cy);
      if (g.state === 'playing' && pt) {
        const inSkillZone = pt.y > CANVAS_H - 72 && Math.abs(pt.x - CANVAS_W / 2) < 36;
        if (inSkillZone) {
          inp.skill = true;
          return;
        }
      }

      if (pt) { inp.touchX = pt.x; inp.touchY = pt.y; inp.prevTouchX = pt.x; inp.prevTouchY = pt.y; }
      inp.touchActive = true;
    };

    const moveInput = (cx: number, cy: number) => {
      const inp = inputRef.current;
      if (!inp.touchActive) return;
      const pt = toGame(cx, cy);
      if (pt) { inp.touchX = pt.x; inp.touchY = pt.y; }
    };

    const endInput = () => {
      const inp = inputRef.current;
      inp.touchActive = false;
      inp.touchX = inp.touchY = inp.prevTouchX = inp.prevTouchY = null;
    };

    // Touch events
    const onTS = (e: TouchEvent) => { e.preventDefault(); startInput(e.touches[0].clientX, e.touches[0].clientY); };
    const onTM = (e: TouchEvent) => { e.preventDefault(); moveInput(e.touches[0].clientX, e.touches[0].clientY); };
    const onTE = (e: TouchEvent) => { e.preventDefault(); endInput(); };

    cvs.addEventListener('touchstart', onTS, { passive: false });
    cvs.addEventListener('touchmove', onTM, { passive: false });
    cvs.addEventListener('touchend', onTE, { passive: false });
    cvs.addEventListener('touchcancel', onTE, { passive: false });

    // Mouse events (drag to move + auto-fire while held)
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
