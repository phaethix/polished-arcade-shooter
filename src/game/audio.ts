// Tiny sound synthesizer — Web Audio API, zero external files
let audioCtx: AudioContext | null = null;
let unlockBound = false;
let warmupDone = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) throw new Error('Web Audio API unavailable');
    audioCtx = new AC();
  }
  return audioCtx;
}

/** iOS Safari: start a node synchronously inside the user-gesture stack. */
function warmupContext(ctx: AudioContext) {
  if (warmupDone) return;
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  data[0] = 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(0);
  src.stop(ctx.currentTime + 0.001);
  warmupDone = true;
}

/** Call from a user-gesture handler (tap / key) to unlock audio on mobile. */
export function resumeAudio() {
  try {
    const ctx = getCtx();
    warmupContext(ctx);
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* silent */
  }
}

/** Attach capture-phase listeners so the first screen tap unlocks audio on iOS. */
export function bindAudioUnlock() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const unlock = () => resumeAudio();
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('touchstart', unlock, opts);
  window.addEventListener('touchend', unlock, opts);
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('click', unlock, opts);
}

async function ensureRunning(ctx: AudioContext) {
  if (ctx.state === 'suspended') await ctx.resume();
}

function scheduleTone(
  c: AudioContext,
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  freqEnd?: number,
  delay = 0,
) {
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) {
    o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t0 + dur);
  }
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur);
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.1,
  freqEnd?: number,
  delay = 0,
) {
  try {
    const c = getCtx();
    if (c.state === 'running') {
      scheduleTone(c, freq, dur, type, vol, freqEnd, delay);
      return;
    }
    void (async () => {
      await ensureRunning(c);
      if (c.state === 'running') scheduleTone(c, freq, dur, type, vol, freqEnd, delay);
    })();
  } catch {
    /* silent */
  }
}

export const playShoot = () => tone(880, 0.08, 'square', 0.08, 440);
export const playEnemyShoot = () => tone(330, 0.1, 'sawtooth', 0.04, 220);
export const playHit = () => tone(300, 0.1, 'square', 0.08, 150);
export const playCombo = () => tone(1047, 0.08, 'sine', 0.07);
export const playMenuSelect = () => {
  tone(660, 0.1, 'sine', 0.1);
  tone(880, 0.15, 'sine', 0.1, undefined, 0.08);
};

export function playExplosion() {
  tone(200, 0.3, 'sawtooth', 0.12, 30);
  tone(150, 0.2, 'square', 0.08, 20, 0.05);
}
export function playBigExplosion() {
  tone(150, 0.5, 'sawtooth', 0.15, 20);
  tone(100, 0.4, 'square', 0.1, 15, 0.1);
  tone(80, 0.6, 'triangle', 0.08, 10, 0.15);
}
export function playPowerUp() {
  tone(523, 0.1, 'sine', 0.1);
  tone(659, 0.1, 'sine', 0.1, undefined, 0.1);
  tone(784, 0.15, 'sine', 0.1, undefined, 0.2);
}
export function playHeal() {
  tone(440, 0.08, 'sine', 0.1);
  tone(554, 0.08, 'sine', 0.1, undefined, 0.08);
  tone(659, 0.08, 'sine', 0.1, undefined, 0.16);
  tone(880, 0.2, 'sine', 0.12, undefined, 0.24);
}
export function playGraze() {
  tone(1200, 0.05, 'sine', 0.06, 800);
}
export function playGameOver() {
  tone(440, 0.3, 'sine', 0.12, 220);
  tone(330, 0.3, 'sine', 0.12, 165, 0.3);
  tone(262, 0.5, 'sine', 0.12, 131, 0.6);
}

bindAudioUnlock();
