// Input: every button, key and click on the map ends up as one of the ACTIONS below.
// Buttons name their action in the markup: data-a="water" data-n="2" calls ACTIONS.water('2').
import { app, save, setSpeed, restart } from './state.js';
import { audio, tone, sfx } from './audio.js';
import { world, canvas } from './world.js';
import { t, fmt } from './i18n.js';
import { $, float, floatAt, openPanel, closePanel, locked } from './hud.js';
import { FARMS, CREW_MAX } from './config.js';
import {
  OBJECTIVES, accept, advice, buyDrip, buyFarm, canPick, checkGoals, crewTotal, decide, deliver, dripCost, handPick, owned, plant, prune, pruneCost, sell, setCrew, setCrewAll, shoo, thirsty, upgrade, water, waterCost,
} from './rules.js';

const select = i => { if (i >= 0) { app.sel = i; world.flyTo(i); } };
const ripest = s => owned(s).filter(i => canPick(s, i)).sort((a, b) => s.farms[b].fruit - s.farms[a].fruit)[0]; // the pickable farm with the most fruit
/** Takes the player to where something happens: a panel, or else a farm. Objectives, advice and news all point this way. */
export const go = ({ farm = -1, panel } = {}) => { if (panel) ACTIONS.open(panel); else select(farm); };

// An action that returns true has made its own sound.
const ACTIONS = {
  open: n => { if (!locked() && (n !== 'report' || app.s.report)) openPanel(n); },
  close: closePanel,
  speed: n => setSpeed(+n),
  mute: () => { audio.muted = !audio.muted; },
  overlay: () => { app.overlay = !app.overlay; },
  select: n => select(+n),
  desel: () => { app.sel = -1; },
  more: () => { $('card').classList.toggle('more'); }, // the phone card's Details
  thirst: () => select(thirsty(app.s)[0]),
  advise: () => go(advice(app.s)),
  goal: () => go(OBJECTIVES[app.s.goal]?.at(app.s)),
  pickFarm: n => { closePanel(); select(+n); }, // a row in the groves panel
  water: (i = app.sel) => { // with nothing selected, the driest thirsty farm
    const s = app.s;
    i = i < 0 ? thirsty(s)[0] : +i;
    const cost = i >= 0 && waterCost(s, i);
    if (i >= 0 && water(s, i)) { world.fx.truck(i); floatAt(i, `💧 −${fmt.eur(cost)}`); sfx.water(); return true; }
  },
  plant: n => { const k = app.sel >= 0 && plant(app.s, app.sel, +n); if (k) { floatAt(app.sel, `🌱 +${k}`); sfx.plant(); return true; } },
  prune: () => {
    const i = app.sel, cost = i >= 0 && pruneCost(app.s, i);
    if (i >= 0 && prune(app.s, i)) { floatAt(i, `✂️ −${fmt.eur(cost)}`); sfx.snip(); return true; }
  },
  drip: () => { if (app.sel >= 0 && buyDrip(app.s, app.sel)) floatAt(app.sel, `−${fmt.eur(dripCost(app.sel))}`); },
  buy: () => { if (app.sel >= 0 && buyFarm(app.s, app.sel)) { world.fx.buy(app.sel); floatAt(app.sel, `−${fmt.eur(FARMS[app.sel].price)}`); } },
  crew: (n, i = app.sel >= 0 ? app.sel : ripest(app.s)) => { if (i >= 0) setCrew(app.s, i, app.s.farms[i].crew + +n); },
  harvest: () => setCrewAll(app.s, crewTotal(app.s) ? 0 : CREW_MAX), // the big button: every crew out, or all of them home
  sell: n => { if (sell(app.s, app.s.oil * +n)) world.fx.van(); },
  accept: n => accept(app.s, +n),
  deliver: n => { if (deliver(app.s, +n)) world.fx.van(); },
  decide: n => { const s = app.s, i = s.evFarm, fire = s.event === 'fire'; decide(s, +n); if (fire) world.fx.fire(i); closePanel(); }, // decide forgets the farm
  up: n => upgrade(app.s, n),
  new: () => { if (app.s.over || confirm(t('confirm.new'))) { restart(); closePanel(); } },
};

export function act(name, n) {
  const before = app.s.cash, ownSound = ACTIONS[name](n);
  if (app.s.cash > before) sfx.coin(); else if (ownSound !== true) sfx.click();
  checkGoals(app.s); save();
}

function onKey(e) {
  const k = e.key.toLowerCase(), s = app.s, panelKey = { s:'sell', c:'orders', i:'invest', r:'report' }[k];
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'SELECT') return; // leave the browser its shortcuts, and the language menu its keys
  if (k === 'escape') { if (app.panel) locked() || closePanel(); else if (app.sel >= 0) app.sel = -1; else world.flyTo(-1); } // a third Esc shows the whole estate
  else if (k === 'm') audio.muted = !audio.muted;
  else if (locked() || app.panel && !panelKey) return; // under a panel only the keys that switch panel work: nothing acts on a game you cannot see
  else if (k === 'tab') {
    e.preventDefault();
    const own = owned(s);
    select(own[(own.indexOf(app.sel) + (e.shiftKey ? own.length - 1 : 1)) % own.length]);
  }
  else if (k === ' ') { e.preventDefault(); setSpeed(app.speed ? 0 : app.lastSpeed); }
  else if ('123'.includes(k)) setSpeed([1, 3, 10][k - 1]);
  else if (k === 'v') app.overlay = !app.overlay;
  else if (k === '+' || k === '=') act('crew', 1);
  else if (k === '-') act('crew', -1);
  else if (k === 'w') act('water');
  else if (k === 'p') act('plant', 10);
  else if (panelKey) act('open', panelKey);
}

// A click on the world: plots are selected, buildings open panels, goats are chased, ripe trees are picked by hand. Drags move the camera.
let downAt = [0, 0], combo = 1, comboAt = 0;
function onTap(e) {
  const s = app.s, x = e.clientX, y = e.clientY;
  const tap = Math.hypot(x - downAt[0], y - downAt[1]) < (e.pointerType === 'touch' ? 12 : 5), p = tap && !s.over && world.pick(x, y); // fingers wobble more than a mouse
  if (!p) { if (tap) app.sel = -1; return; } // empty ground closes the farm card
  if (p.kind === 'building') return act('open', p.panel);
  if (p.kind === 'goat') { shoo(s); float(x, y, t('float.shoo')); tone(180, .12); }
  else if (p.tree && app.speed && canPick(s, p.farm)) { // not while paused: that stripped a whole crop in zero days
    const now = performance.now();
    combo = now - comboAt < 1200 ? Math.min(3, combo + .25) : 1; comboAt = now; // quick clicks build a multiplier
    float(x, y, `+${Math.round(handPick(s, p.farm, combo))} kg` + (combo > 1 ? ` ×${combo}` : ''));
    world.fx.shake(p.farm, x, y); tone(300 + (combo - 1) * 280, .06); app.sel = p.farm;
  } else { select(p.farm); sfx.click(); }
  checkGoals(s);
}

export function bindInput() {
  document.addEventListener('click', e => {
    if (e.target === $('modal') && !locked()) return closePanel();
    const b = e.target.closest('[data-a]');
    if (b && !b.disabled) act(b.dataset.a, b.dataset.n);
  });
  document.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', onTap);
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return; // a finger drags the map, it does not hover
    const p = world.pick(e.clientX, e.clientY);
    app.hover = p?.kind === 'farm' ? p.farm : -1; canvas.style.cursor = p ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerleave', () => { app.hover = -1; });
  document.addEventListener('wheel', e => { if (e.target.closest?.('.tag')) canvas.dispatchEvent(new WheelEvent('wheel', e)); }, { passive:true }); // zoom through the map chips
}
