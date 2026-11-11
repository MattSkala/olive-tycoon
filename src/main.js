// Start-up and the frame loop. The other modules:
//   config.js  numbers and tables to tune        rules.js    the game itself (no DOM, tested by test/rules.test.js)
//   state.js   shared state, save and load       i18n.js     translation; the strings are in lang/*.js
//   world.js   the 3D scene                      hud.js      the HTML over it
//   actions.js buttons, keys and map clicks      audio.js    sounds
//   tutorial.js the guided tour                  details.js  the detail panels
import { app, load, save } from './state.js';
import { sfx } from './audio.js';
import { world, renderer, scene, camera, controls, fit } from './world.js';
import { t, setLang, detectLang } from './i18n.js';
import { $, toast, initHud, refresh, viewOf, openPanel, showEnd } from './hud.js';
import { bindInput, go } from './actions.js';
import { FARMS } from './config.js';
import { listen, stepDay } from './rules.js';
import { startTutorial, tourTick } from './tutorial.js';

const DAY_SEC = 1.05; // real seconds per game day at 1x: a month takes about half a minute

setLang(detectLang());
load();
initHud();
bindInput();

// news from the rules becomes a toast; bad news slows the clock (lastSpeed is kept, so Space twice or a speed key restores it)
const NEWS_PANEL = { 'say.offer':'orders', 'say.orderMissed':'orders', 'say.delivered':'orders', 'say.sold':'sell', 'say.medal':'fame', 'say.noMedal':'fame', 'say.greenThumb':'fame',
  'say.bankSold':'money', 'say.crewUnpaid':'money', 'say.dripUnpaid':'money', 'say.matured':'farms', 'say.rotted':'farms', 'say.harvestOpen':'farms' };
listen((key, params, kind) => {
  toast(t(key, params), kind, () => go({ panel:NEWS_PANEL[key], farm:FARMS.findIndex((F, i) => nameOf(app.s, i) === params.farm) })); // a tap goes to the panel or farm the news is about
  if (kind === 'good') sfx.fanfare();
  if (kind === 'warn') { sfx.warn(); if (app.speed > 1) app.speed = 1; }
});

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  controls.maxDistance = 420 * fit();
}
addEventListener('resize', resize); resize();
addEventListener('gesturestart', e => e.preventDefault()); // iOS Safari ignores the viewport's no-zoom and needs this to stop pinch-zooming the page
camera.position.sub(controls.target).multiplyScalar(fit()).add(controls.target); // the opening view, pulled back on an upright phone

let acc = 0, last = performance.now(), lastMonth = app.s.month, feats = app.s.medals + app.s.green;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  const s = app.s;
  if (!s.over && !s.event) { acc += dt * app.speed / DAY_SEC; while (acc >= 1) { acc--; stepDay(s); } }
  if (s.month !== lastMonth) { lastMonth = s.month; save(); }
  if (s.medals + s.green > feats) world.fx.fireworks(); // a medal or a Green Thumb
  feats = s.medals + s.green;

  // panels the game itself opens: the end, a decision, a new season report, the win
  if (s.over) { if (app.end !== 'bankrupt') { save(); showEnd('bankrupt'); } }
  else if (s.event) { if (app.panel !== 'event') openPanel('event'); }
  else if (s.report && !s.report.seen) { if (app.panel !== 'report') { app.speed = 0; openPanel('report'); } }
  else if (s.won && !s.wonSeen) { s.wonSeen = true; save(); sfx.fanfare(); world.fx.fireworks(); showEnd('won'); }

  const frac = s.over || s.event ? 0 : acc; // how far into the current day, for smooth bars
  world.update(viewOf(frac), now / 1000, dt); refresh(frac);
  if (app.fresh && !app.panel) startTutorial(); // a new player has closed the help: show them around
  tourTick();
  controls.update(); renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

$('loading').classList.add('done'); setTimeout(() => $('loading').remove(), 500); $('hud').hidden = false; // the loading screen fades out over the first frames
if (app.fresh) { app.speed = 0; openPanel('help'); }
requestAnimationFrame(frame);
