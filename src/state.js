// What the modules share: the game state, and the UI's own state (which is not saved).
import { newGame } from './rules.js';

const KEY = 'mirsini-tycoon-3'; // bump when the saved shape changes: older saves are then dropped

export const app = {
  s:null, // the game state: see newGame in rules.js
  fresh:false, // no save was found: show the help first
  speed:1, lastSpeed:1, // 0 = paused, else 1, 3 or 10; lastSpeed is what un-pausing returns to
  panel:null, // name of the open modal panel (the data-p of a section in #modal)
  end:null, // what the end panel shows: 'bankrupt' or 'won'
  sel:0, hover:-1, // selected and hovered farm, -1 = none
  overlay:false, // the water view
};

export function load() {
  try { app.s = JSON.parse(localStorage.getItem(KEY)); } catch {}
  app.fresh = !app.s;
  app.s ||= newGame();
}
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(app.s)); } catch {} };
export const setSpeed = n => { if (n) app.lastSpeed = n; app.speed = n; };
export function restart() { app.s = newGame(); app.end = null; app.sel = 0; setSpeed(1); }
