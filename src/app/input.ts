/** Platform input state — keyboard, touch, and mouse share one struct. */
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  padLeft: boolean;
  padRight: boolean;
  padUp: boolean;
  padDown: boolean;
  padShoot: boolean;
  bomb: boolean;
  skill: boolean;
  /** Coop guest only: rising-edge pause request relayed to the host over the wire. */
  pause: boolean;
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
    padLeft: false,
    padRight: false,
    padUp: false,
    padDown: false,
    padShoot: false,
    bomb: false,
    skill: false,
    pause: false,
    touchX: null,
    touchY: null,
    touchActive: false,
    prevTouchX: null,
    prevTouchY: null,
  };
}
