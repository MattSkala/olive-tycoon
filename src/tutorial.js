// The guided tour: a bubble walks a new player through the controls and the mechanics, one step at a time, with a ring around
// what the step is about. It starts when a new game's help is closed, or from the help panel, and the game is paused while it runs.
// Every step has a Next button; a step with `done` also moves on when the player does what it asks.
import { app, setSpeed } from './state.js';
import { world } from './world.js';
import { t } from './i18n.js';
import { GOAL, START_CASH } from './config.js';
import { nameOf } from './rules.js';

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer:coarse)');
let step = -1, mark = 0; // step: -1 = no tour running; mark: the truck runs made before the watering step

// id: its strings are tut.<id>.t (title) and tut.<id>.x (text). at: the element to ring. enter: sets the scene.
const STEPS = [
  { id:'welcome' },
  { id:'camera' },
  { id:'select', at:'.chip[data-n="0"]', enter:() => { app.sel = -1; world.flyTo(0); }, done:() => app.sel === 0 },
  { id:'water', at:'#cWater', enter:() => { app.sel = 0; mark = app.s.watered; }, done:() => app.s.watered > mark },
  { id:'time', at:'#season' }, { id:'res', at:'#res' }, { id:'harvest', at:'#harvestBtn' }, { id:'dock', at:'#dock' }, { id:'goal', at:'#goal' },
];
console.assert(STEPS.every(st => t(`tut.${st.id}.t`) !== `tut.${st.id}.t` && t(`tut.${st.id}.x`) !== `tut.${st.id}.x`), 'a tour step has no text');

function show(k) {
  step = k < STEPS.length ? k : -1;
  $('coach').hidden = step < 0;
  if (step < 0) { $('spot').hidden = true; setSpeed(app.lastSpeed); } else STEPS[step].enter?.();
}
export function startTutorial() { app.fresh = false; setSpeed(0); show(0); }
export const nextStep = () => show(step + 1);
export const endTutorial = () => show(STEPS.length);

/** Every frame: moves on when the step's task is done, keeps the texts in the current language, and keeps the ring and the bubble on the target. */
export function tourTick() {
  if (step < 0) return;
  const st = STEPS[step], coach = $('coach'), spot = $('spot');
  if (st.done?.()) return nextStep();
  const set = (id, txt) => { if ($(id).textContent !== txt) $(id).textContent = txt; };
  set('coachT', t(`tut.${st.id}.t`));
  set('coachX', t(`tut.${st.id === 'camera' && touch.matches ? 'cameraTouch' : st.id}.x`, { home:nameOf(app.s, 0), start:START_CASH, goal:GOAL }));
  set('coachN', `${step + 1} / ${STEPS.length}`); set('coachGo', t(step === STEPS.length - 1 ? 'tut.done' : 'tut.next'));
  const r = st.at && document.querySelector(st.at)?.getBoundingClientRect(), seen = !!r && r.width > 0 && r.bottom > 0 && r.top < innerHeight; // a closed card or a label off the map has no place
  const cw = coach.offsetWidth, ch = coach.offsetHeight;
  let x = (innerWidth - cw) / 2, y = (innerHeight - ch) / 2; // nothing to point at: the middle of the screen
  spot.hidden = !seen;
  if (seen) {
    Object.assign(spot.style, { left:r.left - 6 + 'px', top:r.top - 6 + 'px', width:r.width + 12 + 'px', height:r.height + 12 + 'px' });
    x = r.left + r.width / 2 - cw / 2;
    y = r.top + r.height / 2 < innerHeight / 2 ? r.bottom + 16 : r.top - ch - 16; // under a target in the upper half of the screen, over one in the lower half
  }
  const fit = (v, room) => Math.round(Math.max(8, Math.min(v, room - 8)));
  coach.style.transform = `translate(${fit(x, innerWidth - cw)}px,${fit(y, innerHeight - ch)}px)`;
}
