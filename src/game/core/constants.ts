/** Logical canvas dimensions and shared gameplay constants. */
export const CANVAS_W = 400;
export const CANVAS_H = 700;

export const PLAYER_W = 32;
export const PLAYER_H = 36;
export const MAX_PARTICLES = 600;
export const COMBO_WINDOW_S = 1.5;
export const GRAZE_RADIUS = 22;

/** Fixed simulation step used by the React game loop (60 Hz). */
export const FIXED_TIMESTEP_S = 1 / 60;

/** Cap frame delta so a backgrounded tab does not spiral the accumulator. */
export const MAX_FRAME_DELTA_S = 0.1;
