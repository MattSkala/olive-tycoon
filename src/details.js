// The detail panels behind the HUD: tap the estate card, a resource pill, the date or an objective and one of these opens.
// Each entry draws its panel's HTML from the game state; hud.js redraws the open one every frame.
import { t, fmt, monthName } from './i18n.js';
import { GOAL, RANK_MIN, OIL_VALUE, OVERDRAFT, OVERDRAFT_INTEREST, WAGE, FARMS, STAGE, EVAP, RAINP, PRUNE_MONTHS } from './config.js';
import { buyBlock, canPick, canopyOf, crewTotal, farmStatus, rankOf, stageOf, upkeep, worth, worthParts } from './rules.js';

export const SEASON = ['❄️', '❄️', '🌸', '🌸', '🌸', '☀️', '☀️', '☀️', '🍂', '🍂', '🍂', '❄️']; // icon by month
const cap = w => w[0].toUpperCase() + w.slice(1);
const rows = (pairs, cls = () => '') => pairs.map(([a, b], k) => `<tr class="${cls(k)}"><td>${a}</td><td>${b}</td></tr>`).join('');

/** A season's ledger as two tables: income and costs. */
export function ledgerHTML(books) {
  const lines = (head, keys) => `<table><tr><th>${t(head)}</th><th></th></tr>${rows(keys.filter(k => books[k]).map(k => [t('books.' + k), fmt.eur(books[k])]))
    || `<tr><td class="muted">${t('rep.nothing')}</td><td></td></tr>`}</table>`;
  return `<div class="cols">${lines('rep.income', ['sales', 'contracts', 'prizes'])}${lines('rep.costs', ['wages', 'mill', 'upkeep', 'water', 'invest', 'events'])}</div>`;
}

export const DETAILS = {
  // what the estate value is made of, and the ranks on the way to the goal
  estate(s) {
    const w = worth(s), rank = rankOf(w);
    return `<h2>${t('estate.title')}</h2>
      <p>${t('estate.rank', { n:rank + 1, of:RANK_MIN.length, title:t('title.' + rank) })}</p>
      <table>${rows(Object.entries(worthParts(s)).filter(([, v]) => v).map(([k, v]) => [t('estate.' + k, { l:s.oil, v:OIL_VALUE }), fmt.eur(v)]))}
        <tr class="you"><td>${t('estate.total')}</td><td>${fmt.eur(w)}</td></tr></table>
      <p>${t('estate.goal', { pct:Math.max(0, w) / GOAL, goal:GOAL })}</p>
      <h3>${t('estate.ranks')}</h3>
      <table>${rows(RANK_MIN.map((min, k) => [`${k + 1}. ${t('title.' + k)}`, t('estate.from', { w:min })]), k => k === rank ? 'you' : '')}</table>
      <p class="muted">${t('estate.note')}</p>`;
  },
  // cash, this season's books so far, and what a month costs
  money(s) {
    return `<h2>${t('money.title')}</h2>
      <p><b class="${s.cash < 0 ? 'neg' : ''}">${t('money.cash', { cash:s.cash })}</b></p>
      <h3>${t('money.season')}</h3>${ledgerHTML(s.books)}
      <p>${t('money.monthly', { upkeep:upkeep(s), wages:crewTotal(s) * WAGE })}${s.cash < 0 ? t('invest.overdraft', { pct:OVERDRAFT_INTEREST, limit:-OVERDRAFT }) : ''}</p>`;
  },
  // every farm at a glance; a row goes to that farm
  farms(s) {
    const row = (F, i) => {
      const f = s.farms[i], st = farmStatus(s, i);
      if (!f.own) return `<tr class="sale" data-a="pickFarm" data-n="${i}"><td>${F.name}</td><td class="wrap" colspan="3">${buyBlock(s, i) === 'rep' ? t('block.rep', { rep:F.rep }) : t('chip.forSale', { price:F.price })}</td></tr>`;
      return `<tr data-a="pickFarm" data-n="${i}"><td>${F.name}</td><td class="${st.band}">${f.drip ? '💧 ' : ''}${cap(t('band.' + st.band))} ${fmt.pct(f.moist / 100)}</td>
        <td>${t('u.kg', { kg:f.fruit })}${canPick(s, i) ? ' · ' + t('stage.' + stageOf(s, i).name) : ''}${f.crew ? ` · 🧺 ${f.crew}` : ''}</td><td>${cap(t('canopy.' + canopyOf(f)))}</td></tr>`;
    };
    return `<h2>${t('farms.title')}</h2>
      <table><tr>${['rep.farm', 'card.soilL', 'card.fruitL', 'card.canopyL'].map(k => `<th>${t(k)}</th>`).join('')}</tr>${FARMS.map(row).join('')}</table>
      <p class="muted">${t('farms.hint')}</p>`;
  },
  // reputation: what it does, what it has unlocked, how to earn it
  fame(s) {
    return `<h2>${t('fame.title')}</h2>
      <p>${t('fame.now', { rep:Math.round(s.rep), bonus:s.rep / 200 })}</p>
      <p>🏅 ${t('end.medals', { n:s.medals })} · 🌿 ${t('fame.green', { n:s.green })}</p>
      <h3>${t('fame.unlocks')}</h3>
      <table>${rows(FARMS.filter(F => F.rep).map(F => [`${s.rep >= F.rep ? '✅' : '🔒'} ${F.name}`, t('fame.need', { rep:F.rep })]))}</table>
      <p class="muted">${t('fame.how')}</p>`;
  },
  // the olive year, month by month: rain, drying, and the work in the groves
  calendar(s) {
    const work = m => [STAGE[m] && t('cal.harvest', { stage:STAGE[m].name, yield:STAGE[m].yield, q:STAGE[m].q }), m >= 4 && m <= 8 && t('cal.growth'), PRUNE_MONTHS.includes(m) && t('cal.prune')].filter(Boolean).join(' · ') || t('cal.rest');
    return `<h2>${t('cal.title')}</h2>
      <table><tr>${['cal.month', 'cal.rain', 'cal.dry', 'cal.work'].map(k => `<th>${t(k)}</th>`).join('')}</tr>${RAINP.map((p, m) =>
        `<tr class="${m === s.month ? 'you' : ''}"><td class="nw">${SEASON[m]} ${cap(monthName(m))}</td><td>${fmt.pct(p / (1 + p))}</td><td>−${EVAP[m]}</td><td class="wrap">${work(m)}</td></tr>`).join('')}</table>
      <p class="muted">${t('cal.note')}</p>`;
  },
};
