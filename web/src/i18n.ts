// UI strings: a flat dictionary per language. French must define every English key (checked by tsc).
// Switching language reloads the page, so `t` is a plain function usable anywhere (no context plumbing).
import { en } from './locales/en';
import { fr } from './locales/fr';

export type Lang = 'en' | 'fr';
export type Key = keyof typeof en;
export const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'English' }, { id: 'fr', label: 'Français' }];
const DICTS: Record<Lang, Record<Key, string>> = { en, fr };
const LANG_KEY = 'studio.lang';

const saved = localStorage.getItem(LANG_KEY);
export const lang: Lang = saved === 'en' || saved === 'fr' ? saved : navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
document.documentElement.lang = lang;

export function setLang(l: Lang) {
  localStorage.setItem(LANG_KEY, l);
  location.reload();
}

// `t('home.count', { n: 3 })` replaces `{n}`. A missing var stays visible as `{n}`.
export function t(key: Key, vars?: Record<string, string | number>): string {
  const s = DICTS[lang][key] ?? en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

// A look's user-facing name and description, falling back to the backend text (written for the model).
export function look(a: { id: string; name: string; feel: string }): { name: string; desc: string } {
  const k = `look.${a.id}`;
  const has = (key: string) => key in en;
  return { name: has(`${k}.name`) ? t(`${k}.name` as Key) : a.name, desc: has(`${k}.desc`) ? t(`${k}.desc` as Key) : a.feel };
}

// Plurals: `tn('home.screens', n)` reads `home.screens.one` or `home.screens.other`, with `{n}` set.
const plural = new Intl.PluralRules(lang);
export function tn(key: string, n: number, vars?: Record<string, string | number>): string {
  const k = `${key}.${plural.select(n) === 'one' ? 'one' : 'other'}` as Key;
  return t(k, { n, ...vars });
}

// Dates from SQLite (`YYYY-MM-DD HH:MM:SS`, UTC).
const parse = (v: string) => new Date(v.replace(' ', 'T') + 'Z');
export const fmtDate = (v: string) => parse(v).toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
export const fmtDateTime = (v: string) => parse(v).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' });
const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
export function fmtAgo(v: string): string {
  const mins = Math.round((parse(v).getTime() - Date.now()) / 60000);
  if (Number.isNaN(mins) || mins > -1) return t('time.now');
  if (mins > -60) return rtf.format(mins, 'minute');
  if (mins > -1440) return rtf.format(Math.round(mins / 60), 'hour');
  return rtf.format(Math.round(mins / 1440), 'day');
}
