// Self-check of the rules: unit asserts, then four bots play 20 years each with every invariant checked daily.
// Run with `npm test` (or `node test/rules.test.js`). Math.random stays live, so every run is a different game.
import { DAYS, GOAL, SAPLING, PICK, CREW_MAX, UPGRADES, FARMS } from '../src/config.js';
import {
  newGame, listen, total, slots, trees, freeSlots, owned, upkeep, matureAll, stageOf, canPick, growth, dripCost, forSale, worth, sellPrice,
  buyFarm, plant, water, buyDrip, setCrew, sell, upgrade, accept, canDeliver, deliver, decide, shoo, advice, stepDay,
} from '../src/rules.js';

// self-check (node): unit asserts, then four bots play 20 years each with every invariant checked daily
const ok = (c, msg) => { if (!c) throw new Error(msg); };
let s = newGame();
ok(worth(s) === 17000, `start worth ${worth(s)}`);
ok(growth(0) === .4 && Math.abs(growth(40) - 1) < 1e-9 && Math.abs(growth(60) - 1.3) < 1e-9, 'growth curve');
ok(!buyFarm(s, 3) && !s.farms[3].own && s.cash === 5000, 'bought below the reputation gate');
ok(buyFarm(s, 1) && !buyFarm(s, 1) && s.cash === 1000, 'buyFarm must charge exactly once');
s.cash = 100;
ok(!upgrade(s, 'press') && !buyDrip(s, 0) && plant(s, 0, 10) === 0 && s.cash === 100, 'investments must not use the overdraft');
s.cash = 5000;
ok(plant(s, 1, 10) === 10 && plant(s, 0, 999) === 20 && plant(s, 0, 1) === 0 && freeSlots(s, 0) === 0, 'plant must stop at the free slots');
s.cash = 5000; s.farms[1].sap = [0, 0]; s.farms[1].moist = 20; s.farms[0].moist = 95;
ok(!water(s, 1) && !water(s, 0) && s.cash === 5000 && !s.watered, 'water on a bare or wet farm');
s.farms[0].moist = 30;
ok(water(s, 0) && s.cash === 5000 - 2 * 80 && s.farms[0].moist === 100 && s.farms[0].water === 160, 'a truck load');
s.farms[4].own = true; s.farms[4].fruit = 100; s.month = 9;
ok(canPick(s, 0) && !canPick(s, 4), 'a late farm is not ready in October');
s.month = 0;
ok(canPick(s, 4) && stageOf(s, 4).name === 'ripe', 'a late farm is ripe in January');
s.oil = 3000;
const quoted = 3000 * sellPrice(s), got = sell(s, 3000);
ok(got > 0 && got < quoted && Math.abs(s.price - 10) < 1e-9 && !s.oil, 'market depth');
s = newGame(); s.cash = -3500; s.oil = 500; s.day = DAYS - 1; stepDay(s);
ok(!s.over && !s.oil && s.cash > 0, 'the bank sells the cellar before it forecloses');
s.cash = -3500; s.event = null; s.day = DAYS - 1; stepDay(s);
ok(s.over, 'foreclosure on an empty cellar');
s = newGame(); s.cash = -100; s.month = 9; s.farms[0].moist = 100;
ok(advice(s).key === 'adv.pick', 'overdrawn with an empty cellar: the advice is to pick, not to sell');
s.cash = 5000; s.month = 6; s.farms[0].moist = 40;
ok(advice(s).key === 'adv.dryIn' && advice(s).params.n === 3 && advice(s).farm === 0, 'the advisor warns before a farm turns dry');

const fresh = newGame().farms.map(f => JSON.stringify(f));
const bot = o => {
  const s = newGame(), at = {};
  let closing = s.cash, report = null, withered = 0;
  listen(key => { withered += key === 'say.withered'; });
  for (let d = 0; d < 240 * DAYS; d++) {
    const m = s.month, spare = () => s.cash - 2500 - 6 * upkeep(s); // a flat 2,500 went bust in 2% of runs: a summer of upkeep and trucks after contracts emptied the cellar
    if (s.event) decide(s, 0);
    while (s.goats) shoo(s);
    for (const i of owned(s)) {
      const f = s.farms[i];
      if (canPick(s, i) && stageOf(s, i).name !== 'green') setCrew(s, i, Math.min(CREW_MAX, Math.ceil(f.fruit / PICK)));
      if (o.water && m >= 4 && m <= 8 && !f.drip && f.moist < 40) water(s, i);
    }
    // the builders only sign what is already in the cellar; the home-farm bots sign anything, to exercise missed orders
    const k = o.grow ? s.offers.findIndex(x => canDeliver(s, x)) : 0;
    if (accept(s, k) || !o.grow) deliver(s, 0);
    if (s.cash < 1500) sell(s, 300); else if (!s.day && m >= 1 && m <= 8) sell(s, s.oil / (9 - m));
    if (o.grow && !s.day) {
      for (const i of owned(s)) plant(s, i, Math.min(freeSlots(s, i), spare() / SAPLING));
      const b = forSale(s)[0];
      if (b >= 0 && spare() >= FARMS[b].price) buyFarm(s, b);
      if (o.water) for (const i of owned(s)) if (trees(s.farms[i]) && spare() >= dripCost(i)) buyDrip(s, i);
      for (const u in UPGRADES) if (spare() >= UPGRADES[u].cost) upgrade(s, u);
    }
    stepDay(s);
    const w = worth(s), bad = msg => { throw new Error(`bot ${o.id}, day ${d}: ${msg}`); };
    for (const key of ['cash','oil','oilQ','price','rep']) if (!Number.isFinite(s[key]) || (key !== 'cash' && s[key] < 0)) bad(`${key}=${s[key]}`);
    if (!Number.isFinite(w) || !Object.values(s.books).every(Number.isFinite)) bad('worth or books not finite');
    s.farms.forEach((f, i) => {
      if (!f.own) return JSON.stringify(f) === fresh[i] || bad(`unowned farm ${i} changed`);
      if (!(f.moist >= 0 && f.moist <= 100 && f.health >= 40 && f.health <= 100 && f.fruit >= 0)) bad(`farm ${i} moist ${f.moist} health ${f.health} fruit ${f.fruit}`);
      if (![f.mature, ...f.sap].every(n => Number.isInteger(n) && n >= 0) || trees(f) > slots(i)) bad(`farm ${i} trees ${f.mature} ${f.sap}`);
      if (!(f.crew >= 0 && f.crew <= CREW_MAX) || (f.crew && !canPick(s, i))) bad(`farm ${i} crew ${f.crew}`);
    });
    if (s.report !== report) { // the ledger misses nothing: last closing cash + this season's books = cash now
      report = s.report;
      const cash = s.cash - total(s.books);
      if (Math.abs(closing + report.profit - cash) > .01) bad(`ledger off by ${closing + report.profit - cash}`);
      closing = cash;
    }
    at[s.year] = { w, farms:owned(s).length, mature:matureAll(s), l:s.pressed, won:s.won };
  }
  return { s, at, withered };
};
const [A, B, C, D] = [{ id:'A', water:1, grow:1 }, { id:'B', grow:1 }, { id:'C', water:1 }, { id:'D' }].map(bot);
ok(!A.s.over, 'bot A went bankrupt');
ok(A.at[10].farms >= 4 && A.at[10].mature >= 150, `bot A year 10: ${A.at[10].farms} farms, ${A.at[10].mature} mature`);
ok(!A.withered, `${A.withered} wither warnings on farms bot A watered`);
ok(A.at[12].w >= GOAL && A.at[12].won, `bot A year 12: worth ${Math.round(A.at[12].w)}, won ${A.at[12].won}, objective ${A.s.goal}`);
const b12 = (B.at[12] || B.at[B.s.year]).w;
ok(A.at[12].w >= 1.5 * b12, `watering should pay: A ${Math.round(A.at[12].w)} vs B ${Math.round(b12)}`);
ok(C.at[10].l >= 1.3 * D.at[10].l, `home farm watered ${Math.round(C.at[10].l)} L vs dry ${Math.round(D.at[10].l)} L`);
console.log('self-check ok. worth after 12y: A', Math.round(A.at[12].w), 'B', Math.round(b12), '| A: farms', A.at[10].farms, 'mature', A.at[10].mature, 'by y10, rep', A.s.rep,
  'medals', A.s.medals, 'green', A.s.green, 'delivered', A.s.delivered, '| B withered', B.withered, '| litres in 10y: C', Math.round(C.at[10].l), 'D', Math.round(D.at[10].l));
