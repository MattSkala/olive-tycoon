// The HUD: everything drawn in HTML over the 3D world. refresh() rewrites it every frame from the game state;
// the helpers only touch the DOM when a value really changes, so buttons survive clicks and a language switch shows at once.
import { app, setSpeed } from './state.js';
import { audio } from './audio.js';
import { world } from './world.js';
import { t, fmt, monthName, LANGS, getLang, setLang, translatePage } from './i18n.js';
import { DETAILS, SEASON, ledgerHTML } from './details.js';
import { DAYS, GOAL, START_CASH, OVERDRAFT, OVERDRAFT_INTEREST, SAPLING, UPKEEP_TREE, UPKEEP_SAPLING, WAGE, CREW_MAX, UPGRADES, MAX_ORDERS, FARMS, CANOPY } from './config.js';
import {
  OBJECTIVES, advice, buyBlock, canDeliver, canPay, canPick, canopyOf, crewTotal, pruneBlock, pruneCost, dripCost, eventView, farmStatus, freeSlots, fruitAll, fruitFrac, gradeOf, growth,
  matureAll, owned, pickQ, rankOf, rate, sellPrice, sellValue, slots, stageOf, thirsty, trees, upkeep, waterCost, worth, young,
} from './rules.js';

// ---------- DOM helpers ----------
export const $ = id => document.getElementById(id);
const prop = (e, k, x) => { if (e[k] !== x) e[k] = x; };
const set = (e, txt) => prop(e, 'textContent', txt), T = (id, txt) => set($(id), txt), hide = (e, h) => prop(e, 'hidden', h);
const htmlCache = {};
const setHTML = (id, h) => { if (htmlCache[id] !== h) $(id).innerHTML = htmlCache[id] = h; };
const fill = (e, x, c = '') => { prop(e.style, 'width', Math.round(Math.max(0, Math.min(100, x))) + '%'); prop(e, 'className', c); }; // a bar and its colour class
const btn = (id, label, why) => { T(id, why ? t('card.why', { label, why }) : label); prop($(id), 'disabled', !!why); }; // a disabled button says why
const cap = w => w[0].toUpperCase() + w.slice(1);
// A compact action button on the farm card: icon, word and price. One that cannot act now stays tappable but greyed, and a tap says why (see actions.js),
// which keeps the reason off the button so five of them fit in a row.
function action(id, price, why) {
  const b = $(id);
  set(b.children[2], price);
  prop(b.dataset, 'why', why ? t('card.whyNot', { label:b.children[1].textContent, why:t('why.' + why) }) : '');
  if (b.getAttribute('aria-disabled') !== String(!!why)) b.setAttribute('aria-disabled', !!why);
}

const MEDAL_ICON = { gold:'🥇', silver:'🥈', bronze:'🥉' };
const PAGE = { goal:GOAL, start:START_CASH, limit:-OVERDRAFT }; // the numbers quoted by static texts
const narrow = matchMedia('(max-width:700px)'); // the upright-phone layout: shorter texts, the card is a sheet

// ---------- toasts and floating numbers ----------
export function toast(text, kind, onClick) {
  const e = document.createElement('div');
  e.className = 'toast ' + kind; e.onclick = onClick; e.textContent = ({ good:'⭐ ', warn:'⚠️ ' }[kind] || '') + text;
  $('toasts').append(e);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  setTimeout(() => e.remove(), 6000);
}
export function float(x, y, txt) {
  const e = document.createElement('div');
  e.className = 'float'; e.textContent = txt; e.style.left = x + 'px'; e.style.top = y - 20 + 'px';
  document.body.append(e); setTimeout(() => e.remove(), 800);
}
export const floatAt = (i, txt) => { const p = world.screenOf(i); if (p) float(p.x, p.y, txt); }; // above farm i

// ---------- panels ----------
export const locked = () => app.s.over || app.panel === 'event'; // these must be answered, not dismissed
export function closePanel() {
  const s = app.s, paused = app.panel === 'help' || app.panel === 'report' && s.report && !s.report.seen; // the help and a new report pause the game; closing them carries on
  if (app.panel === 'report' && s.report) s.report.seen = true;
  if (paused && !app.speed) setSpeed(app.lastSpeed);
  app.panel = null; $('modal').hidden = true;
}
export function openPanel(name) {
  closePanel();
  app.panel = name; $('modal').hidden = false;
  for (const p of $('modal').children) p.hidden = p.dataset.p !== name;
}
export function showEnd(kind) { app.end = kind; $('endGo').hidden = kind === 'bankrupt'; openPanel('end'); }

// ---------- the scene's picture of the game, refilled in place every frame ----------
const vw = { farms:FARMS.map(() => ({})) };
export function viewOf(frac) {
  const s = app.s;
  vw.month = s.month; vw.day = s.day + frac; vw.speed = app.speed; vw.rain = s.rain > 0; vw.heat = s.heat > 0; vw.overlay = app.overlay;
  const nw = narrow.matches; // on an upright phone the objective card lies across the top and there are no side docks
  vw.inset = [nw ? 0 : $('left').offsetWidth + 14, app.sel >= 0 && !nw ? 332 : 0, $('mid').offsetTop + (nw ? $('left').offsetHeight : 0)]; // px the docks cover: left, right, top
  vw.selected = app.sel; vw.hover = app.hover; vw.oil = s.oil; vw.rep = s.rep; vw.up = s.up; vw.goats = s.goats; vw.pressing = false;
  s.farms.forEach((f, i) => {
    const q = vw.farms[i];
    q.own = f.own; q.mature = f.mature; q.sap = f.sap; q.fruit = fruitFrac(s, i); q.stage = stageOf(s, i)?.name || null;
    q.moist = f.moist; q.health = f.health; q.canopy = canopyOf(f); q.drip = f.drip; q.crew = f.crew; q.picking = f.crew > 0 && canPick(s, i);
    vw.pressing ||= q.picking;
  });
  return vw;
}

// ---------- built once: a chip above every plot, a row per farm in the estate list, the equipment rows, the language menu ----------
let chips;
export function initHud() {
  chips = FARMS.map((F, i) => {
    const el = document.createElement('div');
    el.dataset.a = 'select'; el.dataset.n = i;
    el.innerHTML = `<b></b><span class="bar"><i></i></span><span></span><button class="blue" data-a="water" data-n="${i}" data-i18n-title="chip.waterTip"></button>`;
    document.body.append(el); world.addTag(el, ...world.farmTop(i));
    return el;
  });
  $('list').innerHTML = FARMS.map((F, i) => `<div class="frow" data-a="select" data-n="${i}"><b></b><span class="bar"><i></i></span><small></small></div>`).join('');
  $('upgs').innerHTML = Object.keys(UPGRADES).map(k =>
    `<div class="upg"><div><b data-i18n="up.${k}.name"></b><div class="muted" data-i18n="up.${k}.desc"></div></div><button id="up-${k}" data-a="up" data-n="${k}"></button></div>`).join('');
  for (const name of Object.keys(DETAILS)) // one modal section per detail panel; its content is drawn while it is open
    $('modal').insertAdjacentHTML('beforeend', `<section data-p="${name}" hidden><button class="x" data-a="close" data-i18n-aria="card.close">✕</button><div id="${name}Body"></div></section>`);
  $('lang').innerHTML = Object.entries(LANGS).map(([code, table]) => `<option value="${code}">${table.langName}</option>`).join('');
  $('lang').value = getLang();
  $('lang').onchange = e => { setLang(e.target.value, true); translatePage(PAGE); };
  translatePage(PAGE);
}

// ---------- refresh ----------
const short = (c, cat) => canPay(app.s, c, cat) ? '' : 'cash';
const waterWhy = i => !trees(app.s.farms[i]) ? 'noTrees' : app.s.farms[i].moist >= 95 ? 'wet' : short(waterCost(app.s, i));
const dryIn = st => !st.daysLeft ? t('dry.now', { band:st.band }) : st.auto ? t('dry.drip') : st.daysLeft > 60 ? t('dry.none') : t('dry.in', { n:st.daysLeft });
const gradeName = q => t('grade.' + gradeOf(q));

export function refresh(frac) {
  const s = app.s;
  refreshTop(s);
  refreshFarms(s);
  refreshCard(s);
  refreshBottom(s, frac);
  refreshPanels(s);
}

function refreshTop(s) {
  const w = worth(s), dry = thirsty(s), crew = crewTotal(s), rank = rankOf(w), g = gradeName(s.oilQ);
  // estate card: rank, and the estate value on its way to the goal
  T('rankN', String(rank + 1)); T('rankT', t('title.' + rank));
  fill($('goalBar'), w / GOAL * 100);
  T('worthL', w >= GOAL && !s.won ? t('top.worthFinish') : t('top.worthOf', { w, goal:GOAL }));
  // resources
  T('cashV', fmt.eur(s.cash)); prop($('cashV'), 'className', s.cash < 0 ? 'neg' : '');
  T('fruitV', t('u.kg', { kg:fruitAll(s) })); T('crewNote', crew ? t('list.pickers', { n:crew }) : t('top.onTrees'));
  T('oilV', t('u.l', { l:s.oil }) + (narrow.matches && s.oil >= 1 ? ' ' + g.replace(/[^★]/g, '') : '')); // a phone has no room for the grade's name: the stars stand for it
  T('oilG', s.oil >= 1 ? g : t('top.inCellar'));
  T('repV', `${Math.round(s.rep)}` + (s.medals ? ` · 🏅 ${s.medals}` : ''));
  // tools
  hide($('thirst'), !dry.length); T('thirstN', String(dry.length)); prop($('thirst'), 'title', t('top.thirsty', { n:dry.length }));
  T('mute', audio.sfx || audio.music ? '🔊' : '🔇');
  // objective and advisor
  const ob = OBJECTIVES[s.goal], pr = ob?.prog?.(s);
  T('goalT', !ob ? t('goal.allDone') : t('goal.' + s.goal, { target:GOAL }) + (pr ? t('goal.progress', { a:fmt.num(Math.floor(Math.min(pr[0], pr[1]))), b:fmt.num(pr[1]) }) : ''));
  hide($('goalR'), !ob?.cash); T('goalR', '+' + fmt.eur(ob?.cash || 0));
  fill($('goalP'), !ob ? 100 : pr ? pr[0] / pr[1] * 100 : 0);
  const adv = advice(s);
  T('advT', t('adv.line', { text:t(adv.key, adv.params) }));
}

// map chips and the estate list
function refreshFarms(s) {
  FARMS.forEach((F, i) => {
    const f = s.farms[i], st = farmStatus(s, i), chip = chips[i], row = $('list').children[i], [cn, cb, cv, cw] = chip.children, [rn, rb, rs] = row.children;
    const goat = s.goats?.farm === i, hot = f.own && (goat || trees(f) > 0 && f.moist < 35) ? ' alert' : '', on = i === app.sel ? ' on' : '';
    const label = (goat ? '🐐 ' : '') + (f.crew ? '🧺 ' : '') + F.name;
    set(cn, label); set(rn, label);
    prop(chip, 'className', 'tag chip' + (f.own ? '' : ' sale') + hot + on); prop(row, 'className', 'frow' + hot + on);
    hide(cb, !f.own); hide(rb, !f.own); hide(cw, !f.own || f.drip || !trees(f));
    if (f.own) {
      fill(cb.firstChild, f.moist, st.band); fill(rb.firstChild, f.moist, st.band);
      set(cv, app.overlay ? dryIn(st) : f.drip ? t('chip.drip', { pct:f.moist / 100 }) : fmt.pct(f.moist / 100));
      set(cw, `💧 ${fmt.eur(waterCost(s, i))}`); prop(cw, 'disabled', !!waterWhy(i));
      set(rs, [t('u.kg', { kg:f.fruit }), f.crew && t('list.pickers', { n:f.crew }), t('list.trees', { n:trees(f) })].filter(Boolean).join(' · '));
    } else {
      const sale = buyBlock(s, i) === 'rep' ? t('block.rep', { rep:F.rep }) : t('chip.forSale', { price:F.price });
      set(cv, sale); set(rs, sale);
    }
  });
}

// the card of the selected farm
function refreshCard(s) {
  hide($('card'), app.sel < 0);
  if (app.sel < 0) return;
  const i = app.sel, F = FARMS[i], f = s.farms[i], st = farmStatus(s, i), stg = stageOf(s, i), free = freeSlots(s, i), n = Math.min(10, free), pk = canPick(s, i);
  T('cMore', $('card').classList.contains('more') ? `${t('card.less')} ▴` : `${t('card.details')} ▾`);
  T('cName', F.name); T('cBlurb', t(`farm.${i}.blurb`));
  setHTML('cTraits', `<span>${t('soil.' + F.soil)}</span>` + [['Fruit', F.fruit, 1], ['Drain', F.drain, -1], ['Q', F.q, 1]].map(([k, x, good]) =>
    `<span class="${x === 1 ? '' : (x - 1) * good > 0 ? 'pos' : 'neg'}">${t('card.trait' + k, { x })}</span>`).join('')
    + (F.late ? `<span>${t('card.traitLate')}</span>` : '') + `<span>${t('card.traitSlots', { n:slots(i) })}</span>`);
  hide($('cOwn'), !f.own); hide($('cSale'), f.own); $('card').classList.toggle('pick', pk);
  if (!f.own) {
    const block = buyBlock(s, i);
    T('cStands', t('card.stands', { stands:F.old ? t('card.standsTrees', { n:F.old, health:F.oldHealth / 100 }) : t('card.standsBare'), slots:slots(i), cost:dripCost(i) }));
    btn('cBuy', t('card.buy', { farm:F.name, price:F.price }), block && t('block.' + block, { rep:F.rep }));
    return;
  }
  T('cTrees', t('card.trees', { mature:f.mature, young:young(f), free }));
  T('cBand', cap(t('card.band', { band:st.band, pct:f.moist / 100 }))); fill($('cMoist'), f.moist, st.band);
  T('cWaterNote', [dryIn(st), f.drip ? '' : st.since === null ? t('card.never') : t('card.since', { n:st.since }), f.dryDays ? t('card.dryDays', { n:f.dryDays }) : ''].filter(Boolean).join(' · '));
  T('cHealthV', fmt.pct(f.health / 100)); fill($('cHealth'), f.health);
  const cn = canopyOf(f), C = CANOPY[cn]; // the note says what the canopy does to the crop and the picking, and when it was last pruned
  T('cCanopy', cap(t('canopy.' + cn)));
  T('cCanopyNote', [t('canopy.' + cn + 'Note', { fruit:Math.abs(C.fruit - 1), pick:Math.abs(C.pick - 1) }), f.pruned === 0 ? t('card.prunedNow') : t('card.pruned', { n:f.pruned ?? 2 })].join(' · '));
  T('cFruit', t('u.kg', { kg:f.fruit }));
  T('cRipe', pk ? cap(t('card.ripePick', { stage:stg.name, yield:stg.yield, grade:gradeOf(pickQ(s, i)) })) : !f.mature ? t('card.ripeNone') : stg ? t('card.ripeDone')
    : f.fruit >= 1 ? t('card.ripeGrowing', { x:growth(f.moist).toFixed(1), month:monthName(9 + F.late) }) : t('card.ripeRest'));
  T('cCrew', String(f.crew));
  T('cCrewNote', pk ? t('card.crewNote', { wage:WAGE, rate:Math.round(rate(s, i)) }) : '');
  $('crewMinus').disabled = !f.crew; $('crewPlus').disabled = $('crewMax').disabled = !pk || f.crew >= CREW_MAX;
  action('cWater', fmt.eur(waterCost(s, i)), waterWhy(i));
  action('cDrip', f.drip ? '✓' : fmt.eur(dripCost(i)), f.drip ? 'installed' : short(dripCost(i), 'invest'));
  set($('cPlant').children[1], '+' + (n || 10));
  action('cPlant', fmt.eur((n || 10) * SAPLING), !free ? 'noSlots' : short(n * SAPLING, 'invest'));
  action('cFill', fmt.eur(free * SAPLING), !free ? 'full' : short(free * SAPLING, 'invest'));
  action('cPrune', fmt.eur(pruneCost(s, i)), pruneBlock(s, i));
}

function refreshBottom(s, frac) {
  const crew = crewTotal(s), ripe = owned(s).some(i => canPick(s, i)), nw = narrow.matches, contracts = s.offers.length || s.orders.length;
  // season card
  T('date', t(nw ? 'top.dateShort' : 'top.date', { season:SEASON[s.month], month:monthName(s.month, nw), year:s.year }));
  $('dayBar').style.width = (s.day + frac) / DAYS * 100 + '%';
  for (const b of $('speed').children) prop(b, 'className', +b.dataset.n === app.speed ? 'on' : '');
  // dock: the Harvest button sends every crew out, or home again
  $('harvestBtn').disabled = !ripe && !crew; prop($('harvestBtn'), 'className', crew ? 'on' : '');
  T('harvestN', crew ? t('list.pickers', { n:crew }) : ripe ? t('bar.harvestReady') : '');
  hide($('ordersN'), !contracts); T('ordersN', String(contracts));
  $('repBtn').disabled = !s.report;
  // oil market: your price, the market's change over a month, and ten bars of the last six months
  const past = s.hist[Math.max(0, s.hist.length - 31)] ?? s.price, change = Math.round((s.price / past - 1) * 100) / 100 || 0; // whole percent, and never "-0%"
  T('priceV', fmt.eur2(sellPrice(s))); T('priceD', (change >= 0 ? '↗ +' : '↘ ') + fmt.pct(change)); prop($('priceD'), 'className', 'chip2 ' + (change >= 0 ? 'pos' : 'neg'));
  const step = Math.max(1, Math.floor(s.hist.length / 10)), pts = s.hist.filter((p, k) => (s.hist.length - 1 - k) % step === 0).slice(-10), lo = Math.min(...pts), span = Math.max(...pts) - lo || 1;
  setHTML('bars', pts.map(p => `<i style="height:${Math.round(25 + (p - lo) / span * 75)}%"></i>`).join(''));
  T('sellBtn', t('market.sell', { l:s.oil }));
  T('millTag', t(vw.pressing ? 'tag.millOn' : 'tag.mill'));
}

// the modal panels: all are kept current, so whichever is open is right
function refreshPanels(s) {
  // market
  T('sellInfo', t('sell.info', { l:s.oil, grade:gradeOf(s.oilQ), p:s.price, q:s.oilQ, bottled:s.up.bottling ? t('sell.bottled') : '', rep:1 + s.rep / 200, sp:sellPrice(s) }));
  for (const [id, part] of [['sell25', .25], ['sell50', .5], ['sell100', 1]]) { T(id, t('sell.' + id.slice(4), { v:sellValue(s, s.oil * part) })); $(id).disabled = s.oil < 1; }
  if (s.hist.length > 1) { // the price chart
    const lo = Math.min(...s.hist), hi = Math.max(...s.hist), span = hi - lo || 1;
    $('spark').setAttribute('points', s.hist.map((p, i) => `${180 - s.hist.length + i + 1},${(36 - (p - lo) / span * 32).toFixed(1)}`).join(' '));
  }
  // contracts
  const orderRow = (o, text, button) => `<div class="upg"><div><b>${t('buyer.' + o.buyer)}</b><div class="muted">${t('orders.row', { l:o.litres, grade:gradeOf(o.minQ), p:o.price, v:o.litres * o.price })}<br>${text}</div></div>${button}</div>`;
  T('cellarInfo', t('orders.cellar', { l:s.oil, grade:gradeOf(s.oilQ) }));
  setHTML('orderList', s.orders.map((o, k) => orderRow(o,
    (o.months ? t('orders.left', { n:o.months }) : t('orders.due')) + (canDeliver(s, o) ? '' : t(s.oil < o.litres ? 'orders.noOil' : 'orders.lowGrade')),
    `<button data-a="deliver" data-n="${k}" ${canDeliver(s, o) ? '' : 'disabled'}>${t('orders.deliver')}</button>`)).join('') || `<p class="muted">${t('orders.none')}</p>`);
  setHTML('offerList', s.offers.map((o, k) => orderRow(o, t('orders.within', { n:o.months }),
    `<button data-a="accept" data-n="${k}" ${s.orders.length < MAX_ORDERS ? '' : 'disabled'}>${t('orders.accept')}</button>`)).join('') || `<p class="muted">${t('orders.noOffers')}</p>`);
  // equipment
  T('investInfo', t('invest.info', { upkeep:upkeep(s), tree:UPKEEP_TREE, sapling:UPKEEP_SAPLING }) + (s.cash < 0 ? t('invest.overdraft', { pct:OVERDRAFT_INTEREST, limit:-OVERDRAFT }) : ''));
  for (const [k, u] of Object.entries(UPGRADES)) { T('up-' + k, s.up[k] ? t('invest.owned') : fmt.eur(u.cost)); $('up-' + k).disabled = !!s.up[k] || !canPay(s, u.cost, 'invest'); }
  // sound switches
  for (const part of ['music', 'sfx']) { const b = $('sw-' + part); T('sw-' + part, t(audio[part] ? 'sound.on' : 'sound.off')); prop(b, 'className', 'switch' + (audio[part] ? ' on' : '')); b.setAttribute('aria-pressed', audio[part]); }
  // a pending decision
  const ev = eventView(s);
  if (ev) {
    T('evT', t(`ev.${ev.id}.title`)); T('evX', t(`ev.${ev.id}.text`, { farm:ev.farm }));
    ev.opts.forEach((o, k) => { const label = t(`ev.${ev.id}.opt${k}`); T('ev' + k, o.cost ? t('ev.optCost', { label, cost:o.cost }) : label); $('ev' + k).disabled = !o.can; });
  }
  if (app.panel === 'report' && s.report) setHTML('repBody', reportHTML(s.report));
  if (DETAILS[app.panel]) setHTML(app.panel + 'Body', DETAILS[app.panel](s));
  if (app.panel === 'end') {
    const won = app.end === 'won';
    T('endTitle', t(won ? 'end.won' : 'end.bankrupt'));
    T('endText', won ? t('end.wonText', { w:worth(s), year:s.year, farms:owned(s).length, trees:matureAll(s), medals:t('end.medals', { n:s.medals }) }) : t('end.bankruptText', { year:s.year }));
  }
}

// the season report (s.report, drawn up by the rules on 1 February)
function reportHTML(r) {
  return `<h2>${t('rep.title', { n:r.season })}</h2>
    ${ledgerHTML(r.books)}
    <p><b>${t('rep.profit')} <span class="${r.profit < 0 ? 'neg' : ''}">${fmt.eur(r.profit)}</span></b><br>${t('rep.pressed', { l:r.litres })}${r.q ? t('rep.avgGrade', { grade:gradeOf(r.q) }) : ''}
      · ${r.medal ? t('rep.medal', { icon:MEDAL_ICON[r.medal], medal:r.medal }) : t('rep.noMedal')}</p>
    <table><tr>${['farm', 'picked', 'water', 'dryDays', 'health'].map(k => `<th>${t('rep.' + k)}</th>`).join('')}</tr>${r.farms.map(f =>
      `<tr><td>${FARMS[f.i].name}</td><td>${t('u.kg', { kg:f.kg })}</td><td>${fmt.eur(f.water)}</td><td>${f.dryDays}</td><td>${fmt.pct(f.health / 100)}</td></tr>`).join('')}</table>
    <p><b>${t('rep.worth', { w:r.worth })}</b> · ${t('title.' + rankOf(r.worth))} · ${t('rep.ofGoal', { pct:Math.max(0, r.worth) / GOAL })}</p>
    <table><tr><th>${t('rep.league')}</th><th>${t('rep.estate')}</th></tr>${r.league.map((l, k) =>
      `<tr class="${l.you ? 'you' : ''}"><td>${k + 1}. ${l.name ?? t('rep.you')}</td><td>${fmt.eur(l.worth)}</td></tr>`).join('')}</table>
    <p class="muted">${r.rank === 1 ? t('rep.lead') : t('rep.rank', { rank:r.rank, of:r.league.length })}</p>`;
}
