// The detail panels behind the HUD: tap the estate card, a resource pill, the date or an objective and one of these opens.
// Each entry draws its panel's HTML from the game state; hud.js redraws the open one every frame.
import { t, fmt, monthName } from './i18n.js';
import { GOAL, RANK_MIN, OIL_VALUE, OVERDRAFT, OVERDRAFT_INTEREST, WAGE, FARMS, STAGE, EVAP, RAINP, PRUNE_MONTHS } from './config.js';
import { buyBlock, canPick, canopyOf, crewTotal, farmStatus, nameOf, rankOf, stageOf, upkeep, worth, worthParts } from './rules.js';

export const SEASON = ['❄️', '❄️', '🌸', '🌸', '🌸', '☀️', '☀️', '☀️', '🍂', '🍂', '🍂', '❄️']; // icon by month
const cap = w => w[0].toUpperCase() + w.slice(1);
const ICON = { sales:'🛒', contracts:'📜', prizes:'🏅', wages:'🧺', mill:'⚙️', upkeep:'🌿', water:'💧', invest:'🏗', events:'⚡', cash:'💶', oil:'🫙', land:'🗺', trees:'🌳', drip:'🚿', equipment:'🏗' };
// The parts every panel is built of (their look: "modal panels" in the stylesheet).
/** A row: icon, text, and a value at the right. */
export const line = (icon, text, value, cls = '') => `<div class="line ${cls}"><i>${icon}</i><span>${text}</span><b>${value}</b></div>`;
/** A small tile: icon, value, and what it is. */
const fact = (icon, value, label = '') => `<div class="fact"><i>${icon}</i><b>${value}</b><small>${label}</small></div>`;
/** The number a panel is about: label, value, an optional progress bar (0..1) and a line of small print. */
export const hero = (label, value, note = '', bar = null, neg = false) => `<div class="hero"><small>${label}</small><b class="${neg ? 'neg' : ''}">${value}</b>${
  bar === null ? '' : `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%"></i></div>`}<small>${note}</small></div>`;

/** A season's ledger as two boxes: income and costs. */
export function ledgerHTML(books) {
  const box = (head, cls, keys) => `<div class="box ${cls}"><h3>${t(head)}</h3>${keys.filter(k => books[k]).map(k => line(ICON[k], t('books.' + k), fmt.eur(books[k]))).join('') || line('', t('rep.nothing'), '')}</div>`;
  return box('rep.income', 'in', ['sales', 'contracts', 'prizes']) + box('rep.costs', 'out', ['wages', 'mill', 'upkeep', 'water', 'invest', 'events']);
}

// Each draws the body of its panel; the title in the banner is the string `<name>.title`.
export const DETAILS = {
  // what the estate value is made of, and the ranks on the way to the goal
  estate(s) {
    const w = worth(s), rank = rankOf(w), pct = Math.max(0, w) / GOAL;
    return hero(t('estate.total'), fmt.eur(w), `${t('estate.goal', { pct, goal:GOAL })} ${t('estate.rank', { n:rank + 1, of:RANK_MIN.length, title:t('title.' + rank) })}`, pct)
      + `<div class="box">${Object.entries(worthParts(s)).filter(([, v]) => v).map(([k, v]) => line(ICON[k], t('estate.' + k, { l:s.oil, v:OIL_VALUE }), fmt.eur(v))).join('')}</div>
      <div class="box"><h3>${t('estate.ranks')}</h3>${RANK_MIN.map((min, k) => line(`${k + 1}.`, t('title.' + k), t('estate.from', { w:min }), k === rank ? 'you' : '')).join('')}</div>
      <p class="note">${t('estate.note')}</p>`;
  },
  // cash, what a month costs, and this season's books so far
  money(s) {
    return hero(t('top.cash'), fmt.eur(s.cash), t('money.monthly', { upkeep:upkeep(s), wages:crewTotal(s) * WAGE }) + (s.cash < 0 ? t('invest.overdraft', { pct:OVERDRAFT_INTEREST, limit:-OVERDRAFT }) : ''), null, s.cash < 0)
      + `<h3>${t('money.season')}</h3><div class="cols">${ledgerHTML(s.books)}</div>`;
  },
  // every farm at a glance; a row goes to that farm
  farms(s) {
    const row = (F, i) => {
      const f = s.farms[i], st = farmStatus(s, i), go = `data-a="pickFarm" data-n="${i}"`;
      if (!f.own) return `<div class="line sale" ${go}><i class="ic">🔒</i><div><b>${nameOf(s, i)}</b><small>${t('soil.' + F.soil)}</small></div>
        <span class="chip2">${buyBlock(s, i) === 'rep' ? t('block.rep', { rep:F.rep }) : t('chip.forSale', { price:F.price })}</span><b class="go">›</b></div>`;
      return `<div class="line" ${go}><i class="ic green">🫒</i><div><b>${nameOf(s, i)}</b>
        <small>${t('u.kg', { kg:f.fruit })}${canPick(s, i) ? ' · ' + t('stage.' + stageOf(s, i).name) : ''}${f.crew ? ` · 🧺 ${f.crew}` : ''} · ${t('card.canopyL')}: ${t('canopy.' + canopyOf(f))}</small></div>
        <span class="chip2 ${st.band}">${f.drip ? '🚿 ' : '💧 '}${cap(t('band.' + st.band))} ${fmt.pct(f.moist / 100)}</span><b class="go">›</b></div>`;
    };
    return `<div class="box">${FARMS.map(row).join('')}</div><p class="note">${t('farms.hint')}</p>`;
  },
  // reputation: what it does, what it has unlocked, how to earn it
  fame(s) {
    return hero(t('top.rep'), `${Math.round(s.rep)} / 100`, t('fame.now', { bonus:s.rep / 200 }), s.rep / 100)
      + `<div class="facts">${fact('🏅', t('end.medals', { n:s.medals }))}${fact('🌿', t('fame.green', { n:s.green }))}</div>
      <div class="box"><h3>${t('fame.unlocks')}</h3>${FARMS.flatMap((F, i) => F.rep ? [line(s.rep >= F.rep ? '✅' : '🔒', nameOf(s, i), t('fame.need', { rep:F.rep }))] : []).join('')}</div>
      <p class="note">${t('fame.how')}</p>`;
  },
  // the olive year, month by month: rain, drying, and the work in the groves
  calendar(s) {
    const work = m => [STAGE[m] && t('cal.harvest', { stage:STAGE[m].name, yield:STAGE[m].yield, q:STAGE[m].q }), m >= 4 && m <= 8 && t('cal.growth'), PRUNE_MONTHS.includes(m) && t('cal.prune')].filter(Boolean).join(' · ') || t('cal.rest');
    return `<div class="box"><table><tr>${['cal.month', 'cal.rain', 'cal.dry', 'cal.work'].map((k, c) => `<th class="${c === 3 ? 'wrap' : ''}">${t(k)}</th>`).join('')}</tr>${RAINP.map((p, m) =>
        `<tr class="${m === s.month ? 'you' : ''}"><td class="nw">${SEASON[m]} ${cap(monthName(m))}</td><td>${fmt.pct(p / (1 + p))}</td><td>−${EVAP[m]}</td><td class="wrap">${work(m)}</td></tr>`).join('')}</table></div>
      <p class="note">${t('cal.note')}</p>`;
  },
};
