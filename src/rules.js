// Game rules: plain functions over one plain state object `s` (see newGame). No DOM and no player-facing text.
// News, advice and events are message keys with parameters; the UI translates them (src/i18n.js, src/lang/*.js).
// `i` is always a farm index into FARMS and s.farms, `f` a farm's state.
import {
  DAYS, GOAL, START_CASH, OVERDRAFT, OVERDRAFT_INTEREST, HOME_VALUE, OIL_VALUE, SAPLING, UPKEEP_TREE, UPKEEP_SAPLING, WAGE, PICK, HAND_PICK, CREW_MAX,
  MILL_FEE, TREE_KG, UPGRADES, PRESS_QUALITY, BOTTLING_PRICE, SHAKER_SPEED, STAGE, DROP, GRADE_MIN, MEDALS, PRICE_HARVEST, PRICE_NORMAL, PRICE_MIN,
  MARKET_DEPTH, BUYERS, MAX_ORDERS, EVAP, RAINP, RAIN_GAIN, BAND_MIN, TRUCK, TRUCK_MIN, DRIP_RATE, DRIP_TO, GREEN_DAYS, GREEN_PRIZE, LEAGUE, FARMS,
  DRIP_BASE, DRIP_SLOT, PRUNE_MONTHS, PRUNE_COST, PRUNE_MIN, PRUNE_HEALTH, CANOPY,
} from './config.js';

// ---------- state ----------
// Starts mid-September with fruit on the trees so the first harvest is seconds away, and with dry soil so the first job is the water truck.
export const newGame = () => ({
  day:15, month:8, year:1, // month 0 = January
  t:0, // absolute day counter
  cash:START_CASH, oil:0, oilQ:1, // the cellar is one blend: litres and their average quality
  price:12, hist:[], // market price per litre and its last 180 days
  up:{}, // owned equipment, by UPGRADES id
  rep:10, goal:0, // reputation 0..100; index of the current objective
  offers:[], orders:[], // contracts: { buyer, minQ, months, ttl, litres, price }
  event:null, evFarm:-1, // a pending decision (EVENTS id) and the farm it is about
  medals:0, green:0, heat:0, rain:0, // Green Thumb awards; heatwave and rain days left
  goats:null, // or { farm, n, days }
  books:{}, // this season's ledger: signed sums by category
  report:null, // last season's report, see monthStart
  dripWarn:-DAYS,
  pressed:0, sold:0, delivered:0, planted:0, watered:0, // lifetime counters
  seasonL:0, seasonQ:0, // this season's litres and litres x quality, for the medal
  over:false, won:false,
  farms:FARMS.map((F, i) => ({
    own:!i, mature:F.old, sap:[0, 0], // saplings: [mature next January, the January after]
    fruit:i ? 0 : 3240, moist:i ? 50 : 30, health:F.oldHealth, drip:false, crew:0,
    pruned:F.pruned, // years since the last pruning
    lastWater:-1, dryDays:i ? 0 : 1, kg:0, water:0, // this season: dry days, kg picked, money spent on water
    warn:i ? '' : 'dry', // last band the player was alerted about
  })),
});

// ---------- news ----------
let onSay = () => {};
/** The UI subscribes to news here: fn(key, params, kind), kind 'info' | 'good' | 'warn'. */
export const listen = fn => { onSay = fn; };
const say = (key, params = {}, kind = 'info') => onSay(key, params, kind);
const sayResult = (r, kind) => Array.isArray(r) ? say(r[0], r[1], kind) : say(r, {}, kind); // an event outcome: a key, or [key, params]

// ---------- money ----------
// Every cash change goes through these, so the season ledger misses nothing.
// Investments need cash in hand; only running costs (wages, water, upkeep, events) may dip into the overdraft.
export const canPay = (s, c, cat) => s.cash - c >= (cat === 'invest' ? 0 : OVERDRAFT);
const earn = (s, c, cat) => { s.cash += c; s.books[cat] = (s.books[cat] || 0) + c; };
const spend = (s, c, cat) => earn(s, -c, cat);
const pay = (s, c, cat) => canPay(s, c, cat) && (spend(s, c, cat), true);
const addRep = (s, n) => { s.rep = Math.max(0, Math.min(100, s.rep + n)); };
export const total = o => Object.values(o).reduce((a, b) => a + b, 0);

// ---------- queries ----------
export const slots = i => FARMS[i].cols * FARMS[i].rows;
export const young = f => f.sap[0] + f.sap[1];
export const trees = f => f.mature + young(f);
export const freeSlots = (s, i) => slots(i) - trees(s.farms[i]);
export const owned = s => s.farms.flatMap((f, i) => f.own ? [i] : []);
const sumOwned = (s, fn) => owned(s).reduce((a, i) => a + fn(s.farms[i], i), 0);
export const upkeep = s => sumOwned(s, f => f.mature * UPKEEP_TREE + young(f) * UPKEEP_SAPLING); // a month
export const matureAll = s => sumOwned(s, f => f.mature);
export const fruitAll = s => sumOwned(s, f => f.fruit);
export const crewTotal = s => sumOwned(s, f => f.crew);
/** Canopy state of a farm's trees: 'tidy', 'grown' or 'wild' (see CANOPY). A save from before pruning existed counts as grown. */
export const canopyOf = f => Object.keys(CANOPY).find(k => (f.pruned ?? 2) <= CANOPY[k].until);
export const potential = (s, i) => s.farms[i].mature * TREE_KG * FARMS[i].fruit * s.farms[i].health / 100 * CANOPY[canopyOf(s.farms[i])].fruit;
/** How full the trees look, 0..1 (1 = the best crop lush soil can give). */
export const fruitFrac = (s, i) => s.farms[i].mature ? Math.min(1, s.farms[i].fruit / (s.farms[i].mature * TREE_KG * FARMS[i].fruit * 1.3)) : 0;
export const stageOf = (s, i) => STAGE[(s.month - FARMS[i].late + 12) % 12];
export const canPick = (s, i) => s.farms[i].own && !!stageOf(s, i) && s.farms[i].fruit >= 1;
export const pickQ = (s, i) => stageOf(s, i) ? stageOf(s, i).q * FARMS[i].q * (s.up.press ? PRESS_QUALITY : 1) : 0;
/** Grade index for a quality, 0 = best (see GRADE_MIN). */
export const gradeOf = q => GRADE_MIN.findIndex(min => q + 1e-9 >= min);
export const band = m => Object.keys(BAND_MIN).find(k => m >= BAND_MIN[k]);
/** Fruit growth multiplier for a soil moisture: x0.4 bone dry, x1 at 40, x1.3 from 60. */
export const growth = m => .4 + .9 * Math.min(1, m / 60);
const evapToday = (s, i) => EVAP[s.month] * FARMS[i].drain * (s.heat > 0 ? 1.5 : 1);
/** Irrigation status of a farm: its band, whole days until it turns dry, days since the last truck (null if never), and whether drip runs. */
export function farmStatus(s, i) {
  const f = s.farms[i], e = evapToday(s, i);
  return { band:band(f.moist), daysLeft:f.moist < BAND_MIN.good ? 0 : f.drip || !(e > 0) ? Infinity : Math.floor((f.moist - BAND_MIN.good) / e) + 1,
    since:f.lastWater < 0 ? null : s.t - f.lastWater, auto:f.drip };
}
/** Owned farms with trees, no drip and dry soil, driest first. */
export const thirsty = s => owned(s).filter(i => trees(s.farms[i]) && !s.farms[i].drip && s.farms[i].moist < BAND_MIN.good).sort((a, b) => s.farms[a].moist - s.farms[b].moist);
export const dripCost = i => DRIP_BASE + DRIP_SLOT * slots(i);
export const pruneCost = (s, i) => Math.max(PRUNE_MIN, PRUNE_COST * s.farms[i].mature);
/** Why a farm cannot be pruned now: '' (it can), 'noMature', 'season', 'pruned' (already this year) or 'cash'. */
export const pruneBlock = (s, i) => !s.farms[i].mature ? 'noMature' : !PRUNE_MONTHS.includes(s.month) ? 'season' : s.farms[i].pruned === 0 ? 'pruned' : canPay(s, pruneCost(s, i)) ? '' : 'cash';
export const waterCost = (s, i) => Math.max(TRUCK_MIN, TRUCK * trees(s.farms[i])) * FARMS[i].haul * (s.heat > 0 ? 2 : 1) * (s.up.borehole ? .5 : 1);
/** Why a farm cannot be bought: '' (it can), 'owned', 'rep' or 'cash'. */
export const buyBlock = (s, i) => s.farms[i].own ? 'owned' : s.rep < FARMS[i].rep ? 'rep' : canPay(s, FARMS[i].price, 'invest') ? '' : 'cash';
/** Farms you qualify for, cheapest first. */
export const forSale = s => FARMS.map((F, i) => i).filter(i => !s.farms[i].own && s.rep >= FARMS[i].rep).sort((a, b) => FARMS[a].price - FARMS[b].price);
/** Estate value: cash, oil, land, trees and half of what drip and equipment cost. */
export const worth = s => s.cash + OIL_VALUE * s.oil + sumOwned(s, (f, i) => (FARMS[i].price || HOME_VALUE) + f.mature * f.health + SAPLING * young(f) + (f.drip ? dripCost(i) / 2 : 0))
  + Object.keys(s.up).reduce((a, k) => a + UPGRADES[k].cost / 2, 0);
/** Rank index for an estate value, 0 = smallholder .. 4 = olive baron (names: lang `title.N`). */
export const rankOf = w => w < 25000 ? 0 : w < 75000 ? 1 : w < 150000 ? 2 : w < GOAL ? 3 : 4;
export const rate = (s, i) => PICK * (s.up.shakers ? SHAKER_SPEED : 1) * CANOPY[canopyOf(s.farms[i])].pick; // kg a picker picks on farm i in a month
export const sellPrice = s => s.price * s.oilQ * (s.up.bottling ? BOTTLING_PRICE : 1) * (1 + s.rep / 200);
const dip = (s, l) => Math.max(PRICE_MIN, s.price - l / MARKET_DEPTH); // market depth: a big lot pushes the price down, so big estates sell in slices
/** What selling `l` litres would pay now. */
export const sellValue = (s, l) => (l = Math.min(l, s.oil)) > 0 ? l * sellPrice(s) * (s.price + dip(s, l)) / 2 / s.price : 0;

// ---------- actions: each returns a truthy value on success, falsy and no change otherwise ----------
export function buyFarm(s, i) {
  if (buyBlock(s, i) || !pay(s, FARMS[i].price, 'invest')) return false;
  s.farms[i].own = true; s.farms[i].moist = 50;
  say('say.farmBought', { farm:FARMS[i].name }, 'good');
  return true;
}
/** Plants up to `n` saplings; returns how many. */
export function plant(s, i, n) {
  n = Math.floor(Math.min(n, freeSlots(s, i)));
  if (!s.farms[i].own || !(n > 0) || !pay(s, n * SAPLING, 'invest')) return 0;
  s.farms[i].sap[1] += n; s.planted += n;
  say('say.planted', { n, farm:FARMS[i].name });
  return n;
}
/** One water truck load: soil to 100. */
export function water(s, i) {
  const f = s.farms[i], c = waterCost(s, i);
  if (!f.own || !trees(f) || f.moist >= 95 || !pay(s, c, 'water')) return false;
  f.moist = 100; f.lastWater = s.t; f.water += c; s.watered++;
  return true;
}
/** Prunes every mature tree on the farm: a tidy canopy for two seasons, and a little health back. */
export function prune(s, i) {
  const f = s.farms[i];
  if (!f.own || pruneBlock(s, i) || !pay(s, pruneCost(s, i), 'upkeep')) return false;
  f.pruned = 0; f.health = Math.min(100, f.health + PRUNE_HEALTH);
  say('say.pruned', { farm:FARMS[i].name });
  return true;
}
export function buyDrip(s, i) {
  const f = s.farms[i];
  if (!f.own || f.drip || !pay(s, dripCost(i), 'invest')) return false;
  say('say.drip', { farm:FARMS[i].name });
  return f.drip = true;
}
/** Picks up to `kg`; picked olives are pressed the same day, at that farm's ripeness. Returns the kg picked. */
export function pick(s, i, kg) {
  const st = stageOf(s, i), f = s.farms[i];
  kg = Math.min(kg, f.fruit);
  if (!f.own || !st || !(kg > 0)) return 0;
  const l = kg * st.yield, q = pickQ(s, i);
  if (!s.up.press) spend(s, kg * MILL_FEE, 'mill');
  s.oilQ = (s.oil * s.oilQ + l * q) / (s.oil + l);
  s.oil += l; f.fruit -= kg; f.kg += kg; s.pressed += l; s.seasonL += l; s.seasonQ += l * q;
  return kg;
}
export const handPick = (s, i, mult = 1) => pick(s, i, HAND_PICK * rate(s, i) / PICK * Math.max(1, Math.min(3, mult))); // shakers and a tidy canopy help the hand too
export const setCrew = (s, i, n) => s.farms[i].crew = canPick(s, i) ? Math.max(0, Math.min(CREW_MAX, n)) || 0 : 0;
export const setCrewAll = (s, n) => s.farms.forEach((f, i) => canPick(s, i) && setCrew(s, i, n));
/** Sells `l` litres on the market; returns the cash received. */
export function sell(s, l) {
  l = Math.min(l, s.oil);
  const got = sellValue(s, l);
  if (!(got > 0)) return 0;
  s.price = dip(s, l); s.oil -= l; s.sold += l; earn(s, got, 'sales');
  say('say.sold', { l, got });
  return got;
}
export function upgrade(s, k) {
  if (s.up[k] || !pay(s, UPGRADES[k].cost, 'invest')) return false;
  say('say.upgrade', { up:k });
  return s.up[k] = true;
}

// ---------- contracts: better than market, but need a grade and have a deadline ----------
function makeOffer(s) {
  const minQ = GRADE_MIN[Math.floor(Math.random() * 3)];
  return { buyer:Math.floor(Math.random() * BUYERS), minQ, months:3 + Math.floor(Math.random() * 6), ttl:2,
    litres:Math.max(50, Math.round(sumOwned(s, (f, i) => potential(s, i)) * .18 * (.08 + Math.random() * .25) / 10) * 10),
    price:+(PRICE_NORMAL * Math.max(1, minQ) * (1.2 + Math.random() * .4) * (1 + s.rep / 200)).toFixed(2) };
}
export const accept = (s, k) => s.orders.length < MAX_ORDERS && !!s.offers[k] && !!s.orders.push(s.offers.splice(k, 1)[0]);
export const canDeliver = (s, o) => s.oil >= o.litres && s.oilQ + 1e-9 >= o.minQ;
export function deliver(s, k) {
  const o = s.orders[k];
  if (!o || !canDeliver(s, o)) return false;
  s.orders.splice(k, 1);
  s.oil -= o.litres; s.sold += o.litres; s.delivered++; earn(s, o.litres * o.price, 'contracts');
  addRep(s, o.minQ >= 1.25 ? 8 : o.minQ >= 1.05 ? 5 : 3);
  say('say.delivered', { l:o.litres, buyer:o.buyer, got:o.litres * o.price }, 'good');
  return true;
}

// ---------- events ----------
// With `opts` the game stops and the player decides (an unaffordable option falls back to the second); without, they just happen.
// `at` names the farm the event is about, kept in s.evFarm while it is pending.
// Texts live in the lang files: `ev.<id>.title`, `.text`, `.opt0`, `.opt1`; `run` returns the key of the outcome (or [key, params]).
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], perTree = (s, c) => Math.round(matureAll(s) * c);
const lose = (s, k) => owned(s).forEach(i => s.farms[i].fruit *= k);
const undripped = s => owned(s).filter(i => trees(s.farms[i]) && !s.farms[i].drip);
const burning = s => owned(s).filter(i => s.farms[i].mature >= 4 && s.farms[i].moist < BAND_MIN.dry).sort((a, b) => s.farms[a].moist - s.farms[b].moist);
const burn = (s, k) => { const f = s.farms[s.evFarm], n = Math.ceil(f.mature * k); f.mature -= n; return n; };
const EVENTS = {
  fly:{ months:[5, 6, 7], ok:s => fruitAll(s) >= 1, opts:[
    { cost:s => perTree(s, 3), run:s => (lose(s, .95), 'ev.fly.saved') },
    { run:s => Math.random() < .6 ? (lose(s, .7), 'ev.fly.lost') : 'ev.fly.lucky' }] },
  heat:{ months:[5, 6, 7], ok:s => undripped(s).length, opts:[
    { cat:'water', cost:s => undripped(s).reduce((a, i) => a + 4 * trees(s.farms[i]), 0), run:s => {
      for (const i of undripped(s)) { const f = s.farms[i]; f.moist = 100; f.lastWater = s.t; f.water += 4 * trees(f); }
      return (s.heat = 30, 'ev.heat.soaked'); } },
    { run:s => (s.heat = 30, 'ev.heat.rode') }] },
  fire:{ months:[6, 7, 8], ok:s => burning(s).length, at:s => burning(s)[0], opts:[
    { cost:() => 800, run:s => ['ev.fire.plane', { n:burn(s, .05) }] },
    { run:s => (s.farms[s.evFarm].fruit = 0, ['ev.fire.buckets', { n:burn(s, .25) }]) }] },
  storm:{ months:[9, 10, 11, 0], ok:s => fruitAll(s) >= 1, opts:[
    { cost:s => perTree(s, 2), run:s => (lose(s, .96), 'ev.storm.nets') },
    { run:s => (lose(s, .8), 'ev.storm.lost') }] },
  bus:{ months:[3, 4, 5, 6, 7, 8], ok:s => s.oil >= 50, opts:[
    { cost:() => 150, run:s => { const l = Math.min(s.oil, 120), got = l * sellPrice(s) * 1.6; s.oil -= l; s.sold += l; earn(s, got, 'sales'); addRep(s, 3); return ['ev.bus.tasting', { l, got }]; } },
    { run:() => 'ev.bus.left' }] },
  fest:{ months:[7], ok:() => true, opts:[
    { cost:() => 500, run:s => (addRep(s, 6), 'ev.fest.sponsored') },
    { run:() => 'ev.fest.declined' }] },
  goats:{ months:[2, 3, 4, 5, 6, 7, 8], ok:s => !s.goats, kind:'warn', run:s => {
    const i = owned(s).sort((a, b) => young(s.farms[b]) - young(s.farms[a]) || s.farms[b].fruit - s.farms[a].fruit)[0];
    s.goats = { farm:i, n:5, days:30 };
    return ['ev.goats.in', { farm:FARMS[i].name }]; } },
  boom:{ months:ALL, ok:() => true, run:s => (s.price += 3, 'ev.boom') },
  glut:{ months:ALL, ok:() => true, run:s => (s.price = Math.max(PRICE_MIN, s.price - 2), 'ev.glut') },
};
/** The pending decision for the UI: null, or { id, farm (name or undefined), opts:[{ cost, can }] }. */
export function eventView(s) {
  const e = EVENTS[s.event];
  return e ? { id:s.event, farm:FARMS[s.evFarm]?.name, opts:e.opts.map(o => { const cost = o.cost ? o.cost(s) : 0; return { cost, can:canPay(s, cost) }; }) } : null;
}
export function decide(s, k) {
  const e = EVENTS[s.event];
  if (!e) return false;
  let o = e.opts[k] || e.opts[1];
  if (o.cost && !pay(s, o.cost(s), o.cat || 'events')) o = e.opts[1];
  s.event = null;
  sayResult(o.run(s));
  s.evFarm = -1;
  return true;
}
/** Chases one goat off; true when the last one leaves. */
export function shoo(s) {
  if (!s.goats || --s.goats.n > 0) return false;
  s.goats = null; addRep(s, 1);
  say('say.goatsChased', {}, 'good');
  return true;
}

// ---------- objectives: a guided chain with rewards; the last one wins the game (texts: lang `goal.N`) ----------
export const OBJECTIVES = [
  { prog:s => [s.watered, 1], cash:150 },
  { done:s => s.pressed > 0, cash:200 },
  { prog:s => [s.pressed, 300], cash:300 },
  { prog:s => [s.sold, 300], cash:300 },
  { prog:s => [s.delivered, 1], cash:500 },
  { prog:s => [s.planted, 20], cash:400 },
  { prog:s => [owned(s).length, 2], cash:750 },
  { prog:s => [sumOwned(s, f => +f.drip), 1], cash:500 },
  { prog:s => [s.green, 1], cash:1000 },
  { prog:s => [s.rep, 30], cash:1000 },
  { prog:s => [s.medals, 1], cash:2000 },
  { prog:s => [matureAll(s), 150], cash:1500 },
  { prog:s => [owned(s).length, 4], cash:2500 },
  { prog:s => [Math.max(0, worth(s)), GOAL], cash:0 },
];
const goalDone = (s, o) => o.done ? o.done(s) : o.prog(s)[0] >= o.prog(s)[1];
export function checkGoals(s) {
  for (let o; (o = OBJECTIVES[s.goal]) && goalDone(s, o);) {
    say(o.cash ? 'say.goalDoneCash' : 'say.goalDone', { goal:s.goal, cash:o.cash, target:GOAL }, 'good');
    s.goal++; earn(s, o.cash, 'prizes'); addRep(s, 2);
  }
  if (!OBJECTIVES[s.goal]) s.won = true;
}

// ---------- advisor: one line of what to do next; the first matching rule wins ----------
/** Returns { key, params, farm }: a message key and the farm it is about (-1 if none). */
export function advice(s) {
  const m = s.month, own = owned(s), tell = (key, params = {}, farm = -1) => ({ key, params, farm });
  let i, o;
  const reserve = 3000 + 6 * upkeep(s); // a flat 3,000 did not cover a summer of upkeep on a big estate
  if (s.cash < 0 && s.oil >= 1) return tell('adv.overdrawnSell', { limit:-OVERDRAFT });
  if (s.goats) return tell('adv.goats', { farm:FARMS[s.goats.farm].name }, s.goats.farm);
  if (m >= 3 && m <= 8 && (i = thirsty(s)[0]) >= 0) return tell('adv.thirsty', { farm:FARMS[i].name, band:band(s.farms[i].moist), cost:waterCost(s, i) }, i);
  if (m >= 4 && m <= 8 && (i = undripped(s).find(i => farmStatus(s, i).daysLeft <= 5)) >= 0) return tell('adv.dryIn', { farm:FARMS[i].name, n:farmStatus(s, i).daysLeft }, i);
  if (o = s.orders.find(o => o.months < 1 && !canDeliver(s, o))) return tell('adv.orderDue', { buyer:o.buyer, l:o.litres, grade:gradeOf(o.minQ) });
  if (!crewTotal(s) && (i = own.filter(i => canPick(s, i)).sort((a, b) => s.farms[b].fruit - s.farms[a].fruit)[0]) >= 0)
    return tell('adv.pick', { farm:FARMS[i].name, kg:s.farms[i].fruit, stage:stageOf(s, i).name }, i);
  if (s.cash < 0) return tell('adv.overdrawnEmpty', { limit:-OVERDRAFT });
  if (PRUNE_MONTHS.includes(m) && (i = own.find(i => canopyOf(s.farms[i]) !== 'tidy' && !pruneBlock(s, i) && s.cash >= pruneCost(s, i) + 1000)) >= 0)
    return tell('adv.prune', { farm:FARMS[i].name, cost:pruneCost(s, i) }, i);
  if ((m >= 9 || m <= 2) && s.cash >= reserve && (i = own.find(i => freeSlots(s, i) >= 10)) >= 0) return tell('adv.plant', { farm:FARMS[i].name }, i);
  if ((i = forSale(s)[0]) >= 0 && s.cash >= FARMS[i].price + reserve) return tell('adv.afford', { farm:FARMS[i].name, price:FARMS[i].price }, i);
  if ((i = own.find(i => trees(s.farms[i]) >= 30 && !s.farms[i].drip && s.cash >= dripCost(i) + reserve)) >= 0) return tell('adv.drip', { farm:FARMS[i].name, cost:dripCost(i) }, i);
  return tell((m >= 9 || m === 0) && fruitAll(s) >= 1 ? 'adv.harvest' : m >= 9 || m <= 3 ? 'adv.quiet' : 'adv.growing');
}

// ---------- the clock ----------
function monthStart(s) {
  const own = owned(s);
  spend(s, upkeep(s), 'upkeep');
  if (s.cash < 0) spend(s, -s.cash * OVERDRAFT_INTEREST, 'upkeep');
  const m = s.month = (s.month + 1) % 12;
  if (m >= 5 && m <= 9) for (const i of own) { // a parched summer kills young trees
    const f = s.farms[i], dead = f.sap.map(n => Math.ceil(n * .2));
    if (f.moist < BAND_MIN.dry && dead[0] + dead[1]) { f.sap = [f.sap[0] - dead[0], f.sap[1] - dead[1]]; say('say.withered', { n:dead[0] + dead[1], farm:FARMS[i].name }, 'warn'); }
  }
  if (m === 0) { // new year: the older saplings mature
    s.year++;
    const n = sumOwned(s, f => f.sap[0]);
    if (n) say('say.matured', { n }, 'good');
    for (const i of own) { const f = s.farms[i]; f.mature += f.sap[0]; f.sap = [f.sap[1], 0]; f.pruned = (f.pruned ?? 2) + 1; }
  }
  if (m === 1) seasonEnd(s, own);
  if (m === 9) {
    if (fruitAll(s) >= 1) say('say.harvestOpen');
    if (own.every(i => s.farms[i].dryDays <= GREEN_DAYS)) { s.green++; earn(s, GREEN_PRIZE, 'prizes'); addRep(s, 3); say('say.greenThumb', { prize:GREEN_PRIZE }, 'good'); }
  }
  s.orders = s.orders.filter(o => --o.months >= 0 || (addRep(s, -5), say('say.orderMissed', { buyer:o.buyer }, 'warn'), false));
  s.offers = s.offers.filter(o => --o.ttl > 0);
  if (s.offers.length < 3 && Math.random() < .6) { s.offers.push(makeOffer(s)); say('say.offer'); }
  if (Math.random() < .3) {
    const ids = Object.keys(EVENTS).filter(k => EVENTS[k].months.includes(m) && EVENTS[k].ok(s)), id = ids[Math.floor(Math.random() * ids.length)], e = EVENTS[id];
    if (e.opts) { s.event = id; s.evFarm = e.at ? e.at(s) : -1; } else sayResult(e.run(s), e.kind);
  }
  if (s.cash < OVERDRAFT && s.oil >= 1) { sell(s, s.oil); say('say.bankSold', {}, 'warn'); } // foreclosing on a full cellar was the commonest way to lose
  if (s.cash < OVERDRAFT) s.over = true;
}

// 1 February: unpicked fruit rots, the season's oil is judged, and the report is drawn up.
function seasonEnd(s, own) {
  if (fruitAll(s) >= 1) say('say.rotted', { kg:fruitAll(s) });
  for (const i of own) s.farms[i].fruit = s.farms[i].crew = 0;
  const q = s.seasonL > 0 ? s.seasonQ / s.seasonL : 0, [medal = '', , prize, rep] = MEDALS.find(md => q >= md[1]) || [];
  if (medal) { s.medals++; earn(s, prize, 'prizes'); addRep(s, rep); say('say.medal', { medal, prize }, 'good'); }
  else if (q) say('say.noMedal');
  const season = s.year - 1, w = worth(s);
  const league = [{ name:null, worth:w, you:true }, ...LEAGUE.map(([name, w0, g]) => ({ name, worth:w0 * g ** (season - 1), you:false }))].sort((a, b) => b.worth - a.worth);
  const rank = league.findIndex(r => r.you) + 1;
  if (rank === 1) addRep(s, 5);
  s.report = { season, books:s.books, profit:total(s.books), litres:s.seasonL, q, medal, // medal: MEDALS id or ''
    farms:own.map(i => { const f = s.farms[i]; return { i, kg:f.kg, water:f.water, dryDays:f.dryDays, health:f.health }; }),
    worth:w, league, rank, seen:false }; // the UI sets `seen` when the panel is closed
  s.books = {}; s.seasonL = s.seasonQ = 0;
  for (const i of own) s.farms[i].kg = s.farms[i].water = s.farms[i].dryDays = 0;
}

/** Advances the game by one day. A pending decision (s.event) stops the clock. */
export function stepDay(s) {
  if (s.over || s.event) return;
  const m = s.month, late = m >= 10 || m === 0;
  s.t++;
  if (s.rain > 0) { for (const i of owned(s)) s.farms[i].moist = Math.min(100, s.farms[i].moist + RAIN_GAIN); s.rain--; }
  else if (Math.random() < RAINP[m] / 2) s.rain = 2;
  if (s.heat > 0) s.heat--;
  for (const i of owned(s)) farmDay(s, i);
  const g = s.goats;
  if (g) {
    const f = s.farms[g.farm];
    if (--g.days % 3 === 0) f.sap[1] ? f.sap[1]-- : f.sap[0] ? f.sap[0]-- : f.fruit *= .98; // every third day: a sapling, or 2% of the fruit
    if (g.days <= 0) { s.goats = null; say('say.goatsLeft'); }
  }
  s.price = Math.max(PRICE_MIN, s.price + ((late ? PRICE_HARVEST : PRICE_NORMAL) - s.price) * .01 + (Math.random() - .5) * .55);
  s.hist.push(s.price); if (s.hist.length > 180) s.hist.shift();
  checkGoals(s);
  if (++s.day >= DAYS) { s.day = 0; monthStart(s); }
}

// One farm's day: evaporation, drip, growth, health, fruit drop, the picking crew, then the dry-soil alert.
function farmDay(s, i) {
  const m = s.month, f = s.farms[i], n = trees(f), st = stageOf(s, i), DRY = BAND_MIN.good;
  f.moist = Math.max(0, f.moist - evapToday(s, i));
  if (f.drip && n && f.moist < DRIP_TO) {
    const c = s.up.borehole ? 0 : (DRIP_TO - f.moist) * n * DRIP_RATE;
    if (pay(s, c, 'water')) { f.water += c; f.moist = DRIP_TO; }
    else if (s.t - s.dripWarn >= DAYS) { s.dripWarn = s.t; say('say.dripUnpaid', {}, 'warn'); }
  }
  if (m >= 4 && m <= 8) { f.fruit += potential(s, i) * growth(f.moist) * .2 / DAYS; if (n && f.moist < DRY) f.dryDays++; }
  f.health = Math.max(40, Math.min(100, f.health + (f.moist < BAND_MIN.dry ? -.25 : f.moist >= DRY ? .15 : 0)));
  if (st && st.name !== 'green') f.fruit *= DROP;
  if (f.crew && canPick(s, i) && !pay(s, f.crew * WAGE / DAYS, 'wages')) { f.crew = 0; say('say.crewUnpaid', {}, 'warn'); }
  if (f.crew) {
    pick(s, i, f.crew * rate(s, i) / DAYS);
    if (!canPick(s, i)) { f.crew = f.fruit = 0; say('say.stripped', { farm:FARMS[i].name }); }
  }
  // alert once on entering dry and once on entering parched; climbing back from parched to dry is not news
  const b = band(f.moist);
  if (f.moist >= DRY) f.warn = '';
  else if (m >= 3 && m <= 8 && n && !f.drip && (b === 'parched' ? f.warn !== b : !f.warn)) {
    f.warn = b;
    say(b === 'dry' ? 'say.gettingDry' : 'say.parched', { farm:FARMS[i].name }, 'warn');
  }
}
