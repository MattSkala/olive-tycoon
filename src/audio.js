// Sound. Effects are synthesized on the spot (no files); music is a playlist of audio/*.mp3.
// The two switch off separately (the Sound panel) and the choice is remembered.
const STORE = 'mirsini-audio';
const TRACKS = ['audio/music-1.mp3', 'audio/music-2.mp3', 'audio/music-3.mp3', 'audio/music-4.mp3']; // played in turn; a missing file is skipped
const MUSIC_VOLUME = .32, SFX_VOLUME = .5;

export const audio = { sfx:true, music:true };
try { Object.assign(audio, JSON.parse(localStorage.getItem(STORE))); } catch {}
/** Switches 'sfx' or 'music' on or off, and remembers it. */
export function setAudio(part, on) {
  audio[part] = on;
  try { localStorage.setItem(STORE, JSON.stringify(audio)); } catch {}
  syncMusic();
}

// ---------- start-up: browsers only allow sound after a user gesture ----------
// iOS does not count pointerdown as one, so a start made there was refused and the music stayed silent until a switch was clicked.
// So: listen for the gestures every browser accepts, on every one of them, until the music really runs.
let ctx, out, started = false;
function start(e) {
  if (!e.isTrusted) return; // a scripted click is not a gesture
  started = true;
  if (!ctx) try { ctx = new AudioContext(); out = ctx.createGain(); out.gain.value = SFX_VOLUME; out.connect(ctx.destination); } catch {}
  if (ctx?.state === 'suspended') ctx.resume();
  syncMusic();
}
for (const e of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(e, start, true);

// ---------- music: the tracks in turn, for as long as the switch is on and the page is visible ----------
let player, track = 0, misses = 0;
function playTrack() { player.src = TRACKS[track]; player.play().catch(() => {}); }
function nextTrack(missed) {
  misses = missed ? misses + 1 : 0;
  if (misses >= TRACKS.length) return; // no music files at all: stay silent
  track = (track + 1) % TRACKS.length; playTrack();
}
function syncMusic() {
  if (!started) return;
  if (!audio.music || document.hidden) return player?.pause();
  if (!player) { player = new Audio(); player.volume = MUSIC_VOLUME; player.onended = () => nextTrack(false); player.onerror = () => nextTrack(true); playTrack(); }
  else if (player.paused && misses < TRACKS.length) player.play().catch(() => {});
}
document.addEventListener('visibilitychange', syncMusic);

// ---------- effects: three building blocks, then the sounds made of them ----------
/** One note. f: Hz; d: seconds. type: oscillator shape; to: glide to this pitch; g: loudness; at: delay in seconds; a: attack. */
function note(f, d = .1, { type = 'triangle', to, g = .2, at = 0, a = .004 } = {}) {
  if (!ctx || !audio.sfx) return;
  const o = ctx.createOscillator(), v = ctx.createGain(), t = ctx.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(.0005, t + d);
  o.connect(v).connect(out); o.start(t); o.stop(t + d + .02);
}
/** A burst of filtered noise: rustle, splash, snip. band: centre Hz; to: sweep the band there; q: how narrow. */
let noise;
function hiss(d = .1, { band = 3000, to, q = 1, g = .2, at = 0 } = {}) {
  if (!ctx || !audio.sfx) return;
  if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const x = noise.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), v = ctx.createGain(), t = ctx.currentTime + at;
  s.buffer = noise; s.loop = true;
  f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(band, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + d);
  v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.0005, t + d);
  s.connect(f).connect(v).connect(out); s.start(t, Math.random()); s.stop(t + d + .02);
}
const bell = (f, d, g = .16, at = 0) => { note(f, d, { type:'sine', g, at }); note(f * 2.76, d * .6, { type:'sine', g:g * .35, at }); note(f * 5.4, d * .3, { type:'sine', g:g * .15, at }); }; // struck metal: partials that are not harmonics
const pluck = (f, d = .4, g = .18, at = 0) => { note(f, d, { type:'sawtooth', g:g * .45, at, a:.002 }); note(f * 2, d * .55, { type:'triangle', g:g * .5, at, a:.002 }); }; // a plucked string, bouzouki-ish

export const sfx = {
  click:() => { hiss(.03, { band:2600, q:2, g:.1 }); note(720, .04, { type:'sine', g:.07 }); }, // a soft wooden tick
  coin:() => { bell(1320, .25); bell(1760, .45, .14, .09); },
  fanfare:() => [392, 494, 587, 784].forEach((f, i) => pluck(f, .55, .2, i * .11)), // a rising G major on strings
  water:() => { hiss(.55, { band:800, to:2800, q:.8, g:.22 }); [1100, 880, 1320].forEach((f, i) => note(f, .09, { type:'sine', to:f * .6, g:.09, at:.12 + i * .1 })); }, // a splash, then drips
  plant:() => { note(150, .22, { type:'sine', to:55, g:.3 }); hiss(.12, { band:500, q:.7, g:.12 }); }, // a spade in soft earth
  snip:() => [0, .13].forEach(at => { hiss(.05, { band:6000, q:3, g:.2, at }); note(2400, .03, { type:'square', g:.03, at }); }), // shears, twice
  warn:() => { note(311, .22, { type:'sawtooth', g:.09 }); note(233, .36, { type:'sawtooth', g:.09, at:.16 }); }, // a falling minor third
  pick:(combo = 1) => { pluck(330 * 2 ** (Math.round((combo - 1) * 4) / 6), .22, .16); hiss(.07, { band:4200, q:1, g:.07 }); }, // leaves rustle; the string climbs with the combo
  shoo:() => [540, 470, 500, 430].forEach((f, i) => note(f, .09, { type:'sawtooth', g:.08, at:i * .07 })), // an indignant bleat
};
