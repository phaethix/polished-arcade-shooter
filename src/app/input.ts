/** Platform input state — keyboard, touch, and mouse share one struct. */
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  bomb: boolean;
  skill: boolean;
  touchX: number | null;
  touchY: number | null;
  touchActive: boolean;
  prevTouchX: number | null;
  prevTouchY: number | null;
}

export function createInputState(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    bomb: false,
    skill: false,
    touchX: null,
    touchY: null,
    touchActive: false,
    prevTouchX: null,
    prevTouchY: null,
  };
}
