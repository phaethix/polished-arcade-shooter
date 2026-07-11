import { useRef, useCallback } from 'react';
import { createGameData } from './game/engine';
import { createInputState } from './app/input';
import { CANVAS_W, CANVAS_H } from './game/core/constants';
import { useGameLoop } from './app/use-game-loop';
import { useKeyboardInput } from './app/use-keyboard-input';
import { usePointerInput } from './app/use-pointer-input';
import { CoopSession } from './net/coop-session';
import type { GameData } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData>(createGameData());
  const inputRef = useRef(createInputState());
  const rafRef = useRef<number>(0);
  const sessionRef = useRef(new CoopSession());

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

  useGameLoop(canvasRef, gameRef, inputRef, rafRef);
  useKeyboardInput(gameRef, inputRef, sessionRef);
  usePointerInput(canvasRef, gameRef, inputRef, sessionRef, getCanvasScale);

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
