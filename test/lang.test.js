// Checks every language file against English: no unknown keys, no missing keys, same placeholders, complete plural forms.
import { LANGS } from '../src/i18n.js';

const NEUTRAL = ['goal.progress', 'adv.line', 'ev.optCost', 'card.why']; // pure patterns, the same in every language
const en = LANGS.en, problems = [];
const forms = v => typeof v === 'string' ? [v] : Array.isArray(v) ? v : Object.values(v);
const holes = v => new Set(forms(v).flatMap(s => s.match(/\{\w+/g) || []));
for (const [code, table] of Object.entries(LANGS)) {
  const rules = new Intl.PluralRules(code).resolvedOptions().pluralCategories.filter(c => c !== 'many'); // 'many' is for fractions, which the game never counts
  for (const key of Object.keys(table)) {
    if (!(key in en)) { problems.push(`${code}: unknown key ${key}`); continue; }
    const v = table[key];
    if (typeof v !== typeof en[key] || Array.isArray(v) !== Array.isArray(en[key])) problems.push(`${code}: ${key} has a different shape than in English`);
    else if (Array.isArray(v)) { if (v.length !== en[key].length) problems.push(`${code}: ${key} has ${v.length} entries, English has ${en[key].length}`); }
    else {
      if (typeof v === 'object') for (const r of rules) if (!(r in v)) problems.push(`${code}: ${key} lacks the plural form "${r}"`);
      for (const h of holes(v)) if (!holes(en[key]).has(h)) problems.push(`${code}: ${key} uses ${h}} which English does not`);
    }
  }
  for (const key of Object.keys(en)) if (!(key in table) && !NEUTRAL.includes(key)) problems.push(`${code}: missing ${key}`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`lang ok: ${Object.keys(LANGS).join(', ')}, ${Object.keys(en).length} keys`);
