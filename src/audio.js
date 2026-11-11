// A tiny synth for feedback sounds. Browsers only let the audio context start after a user gesture.
export const audio = { muted:false };
let ctx;
addEventListener('pointerdown', () => { try { ctx ||= new AudioContext(); } catch {} }, { once:true });

/** One short note: frequency in Hz, duration in seconds, delay in seconds. */
export function tone(f, d = .08, when = 0) {
  if (!ctx || audio.muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + when;
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(.07, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d);
}
export const sfx = {
  click:() => tone(520, .05),
  coin:() => { tone(880, .1); tone(1320, .18, .08); },
  fanfare:() => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, i * .1)),
  water:() => [720, 560, 430].forEach((f, i) => tone(f, .09, i * .07)),
  plant:() => tone(110, .18),
  warn:() => { tone(233, .14); tone(175, .22, .12); },
};
