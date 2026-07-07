// Tiny sound synthesizer — Web Audio API, zero external files
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function resumeAudio() {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}

function tone(
  freq: number, dur: number, type: OscillatorType = 'square',
  vol = 0.1, freqEnd?: number, delay = 0,
) {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + delay);
    if (freqEnd !== undefined)
      o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), c.currentTime + delay + dur);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur);
  } catch { /* silent */ }
}

export const playShoot      = () => tone(880, 0.08, 'square', 0.05, 440);
export const playEnemyShoot = () => tone(330, 0.1, 'sawtooth', 0.025, 220);
export const playHit        = () => tone(300, 0.1, 'square', 0.06, 150);
export const playCombo      = () => tone(1047, 0.08, 'sine', 0.05);
export const playMenuSelect = () => { tone(660, 0.1, 'sine', 0.07); tone(880, 0.15, 'sine', 0.07, undefined, 0.08); };

export function playExplosion() {
  tone(200, 0.3, 'sawtooth', 0.10, 30);
  tone(150, 0.2, 'square', 0.07, 20, 0.05);
}
export function playBigExplosion() {
  tone(150, 0.5, 'sawtooth', 0.13, 20);
  tone(100, 0.4, 'square', 0.09, 15, 0.1);
  tone(80, 0.6, 'triangle', 0.07, 10, 0.15);
}
export function playPowerUp() {
  tone(523, 0.1, 'sine', 0.08);
  tone(659, 0.1, 'sine', 0.08, undefined, 0.1);
  tone(784, 0.15, 'sine', 0.08, undefined, 0.2);
}
export function playHeal() {
  tone(440, 0.08, 'sine', 0.08);
  tone(554, 0.08, 'sine', 0.08, undefined, 0.08);
  tone(659, 0.08, 'sine', 0.08, undefined, 0.16);
  tone(880, 0.2, 'sine', 0.1, undefined, 0.24);
}
export function playGraze() {
  tone(1200, 0.05, 'sine', 0.04, 800);
}
export function playGameOver() {
  tone(440, 0.3, 'sine', 0.1, 220);
  tone(330, 0.3, 'sine', 0.1, 165, 0.3);
  tone(262, 0.5, 'sine', 0.1, 131, 0.6);
}
