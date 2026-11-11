// Translation. Strings live in src/lang/<code>.js; a key missing from the current language falls back to English.
// To add a language: copy src/lang/en.js, translate it, and list it in LANGS below.
import en from './lang/en.js';
import cs from './lang/cs.js';

export const LANGS = { en, cs };
const STORE = 'mirsini-lang';
let lang = 'en', plural, format;

/** The player's saved choice, else the first browser language we have, else English. */
export function detectLang() {
  let saved;
  try { saved = localStorage.getItem(STORE); } catch {}
  if (LANGS[saved]) return saved;
  const wanted = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language];
  return wanted.map(l => String(l).toLowerCase().split('-')[0]).find(code => LANGS[code]) || 'en';
}

/** Switches language. `remember` stores the choice so it beats the browser setting next time. */
export function setLang(code, remember = false) {
  lang = LANGS[code] ? code : 'en';
  if (remember) try { localStorage.setItem(STORE, lang); } catch {}
  plural = new Intl.PluralRules(lang);
  const nf = o => { const f = new Intl.NumberFormat(lang, o); return x => f.format(x); }, eur = { style:'currency', currency:'EUR' };
  const whole = nf({ ...eur, maximumFractionDigits:0 }), cents = nf(eur), n = nf({ maximumFractionDigits:0 }), percent = nf({ style:'percent' });
  format = { eur:x => whole(Math.round(x) || 0), eur2:cents, num:x => n(Math.round(x) || 0), pct:percent }; // `|| 0` turns -0 into 0
}
export const getLang = () => lang;

const raw = key => LANGS[lang][key] ?? en[key];

/** The string for `key` with its {placeholders} filled from `params` (see the notes at the top of src/lang/en.js). */
export function t(key, params = {}) {
  let str = raw(key);
  if (str === undefined) return key; // shown as is, so a missing string gets noticed
  if (typeof str === 'object') str = str[plural.select(params.n)] ?? str.other;
  return str.replace(/\{(\w+)(?::([^}]+))?\}/g, (m, name, fmt) => {
    const x = params[name];
    return !fmt ? x : format[fmt] ? format[fmt](x) : t(fmt.replace('*', x), params);
  });
}
export const fmt = { eur:x => format.eur(x), eur2:x => format.eur2(x), num:x => format.num(x), pct:x => format.pct(x) };
export const monthName = (m, short) => raw(short ? 'monthsShort' : 'months')[m];

/** Fills every element marked in the markup: data-i18n (text), data-i18n-html, data-i18n-title, data-i18n-aria. */
export function translatePage(params) {
  const each = (attr, put) => { for (const e of document.querySelectorAll(`[${attr}]`)) put(e, t(e.getAttribute(attr), params)); };
  each('data-i18n', (e, s) => { e.textContent = s; });
  each('data-i18n-html', (e, s) => { e.innerHTML = s; });
  each('data-i18n-title', (e, s) => { e.title = s; });
  each('data-i18n-aria', (e, s) => { e.setAttribute('aria-label', s); });
  document.documentElement.lang = lang;
  document.title = t('app.title');
}

setLang('en');
