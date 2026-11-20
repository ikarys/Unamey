import { ArrowLeft, Eye, Loader, LogOut, Moon, Shield, Sun, User } from 'lucide-react';
import { VIEW_AS_KEY, type Me } from '../api';
import { useApp } from './AppContext';
import { LANGS, lang, setLang, t, tn, type Lang } from '../i18n';

type Screen = { id: 'home' | 'generate' | 'gallery' | 'styles' | 'account' | 'admin/models' | 'admin/users' | 'admin/jobs' | 'admin/cache'; label: string; area: 'studio' | 'admin'; nav?: false };
export const SCREENS: Screen[] = [
  { id: 'home', label: t('nav.home'), area: 'studio' },
  { id: 'generate', label: t('nav.studio'), area: 'studio', nav: false },
  { id: 'gallery', label: t('nav.gallery'), area: 'studio' },
  { id: 'styles', label: t('nav.styles'), area: 'studio', nav: false },
  { id: 'account', label: t('nav.account'), area: 'studio', nav: false },
  { id: 'admin/models', label: t('nav.models'), area: 'admin' },
  { id: 'admin/users', label: t('nav.users'), area: 'admin' },
  { id: 'admin/jobs', label: t('nav.jobs'), area: 'admin' },
  { id: 'admin/cache', label: t('nav.cache'), area: 'admin' }
];
export type ScreenId = Screen['id'];
export const visibleScreens = (me: Me) => SCREENS.filter((s) => (s.id === 'account' ? me.multi_user : s.area === 'studio' || me.admin));
// Reached from projects and screens only, so not in the nav.
export const navScreens = (me: Me) => visibleScreens(me).filter((s) => s.nav !== false);
export const areaOf = (id: ScreenId) => SCREENS.find((s) => s.id === id)?.area ?? 'studio';

const viewAs = (member: boolean) => {
  if (member) localStorage.setItem(VIEW_AS_KEY, 'member'); else localStorage.removeItem(VIEW_AS_KEY);
  location.hash = '#/';
  location.reload();
};

export function TopBar({ current, onHelp, dark, onTheme }: { current: ScreenId; onHelp: () => void; dark: boolean; onTheme: () => void }) {
  const { status, me, signOut } = useApp();
  // A generation keeps running server-side when the user leaves the studio: offer the way back to it.
  const live = status?.my_jobs[0]?.id;
  const area = areaOf(current);
  const screens = navScreens(me).filter((s) => s.area === area);
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 whitespace-nowrap border-b border-line bg-canvas px-4 text-[14px] lg:gap-8 lg:px-6">
      <a href="#/" title={t('nav.home')} className="text-[15px] font-bold tracking-tight text-ink hover:text-accent">Unamey</a>
      {area === 'admin' && <span className="-ml-2 lg:-ml-5 rounded-full bg-raised px-2 py-0.5 text-[12px] font-semibold text-accent">{t('nav.admin')}</span>}
      <nav aria-label={t('nav.main')} className="flex h-full gap-6">
        {screens.map(({ id, label }, i) => (
          <a key={id} href={`#/${id}`} title={t('nav.navTitle', { label, n: i + 1 })} aria-current={current === id ? 'page' : undefined}
            className={`flex items-center border-b-2 font-medium ${current === id ? 'border-accent text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}>
            {label}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3 lg:gap-5 text-[13px] text-ink-2">
        {area === 'admin' && (
          <>
            <span className="inline-flex items-center gap-1.5" title={t('nav.modelStatus')}>
              <span className={`size-2 rounded-full ${!status ? 'bg-ink-3' : status.endpoint_ok ? 'bg-ok' : 'bg-bad'}`} />
              {status?.model ?? t('nav.unreachable')}
            </span>
            {status && <span title={t('nav.startedAtTitle')}>{t('nav.startedAt', { at: new Date(status.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) })}</span>}
            <a href="#/admin/jobs" title={t('nav.openJobs')} className="inline-flex items-center gap-1.5 hover:text-ink">
              <Loader size={15} className={status?.jobs_running ? 'animate-spin text-info' : ''} />
              {tn('nav.running', status?.jobs_running ?? 0)} ·{' '}
              <span className={status?.jobs_failed ? 'text-bad' : ''}>{tn('nav.failed', status?.jobs_failed ?? 0)}</span>
            </a>
            <a href="#/" title={t('nav.backToApp')} className="inline-flex items-center gap-1.5 hover:text-ink"><ArrowLeft size={15} /> {t('nav.app')}</a>
          </>
        )}
        {area === 'studio' && live && current !== 'generate' && (
          <a href={`#/generate?job=${live}`} title={t('nav.backToGenerationTitle')} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-soft hover:brightness-110">
            <Loader size={15} className="animate-spin" /> {t('nav.backToGeneration')}
          </a>
        )}
        {area === 'studio' && me.admin && (
          <>
            <button onClick={() => viewAs(true)} title={t('nav.viewAsMemberTitle')} aria-label={t('nav.viewAsMember')} className="inline-flex items-center gap-1.5 hover:text-ink"><Eye size={15} /><span className="hidden xl:inline">{t('nav.viewAsMember')}</span></button>
            <a href="#/admin/models" title={t('nav.adminConsole')} aria-label={t('nav.admin')} className="inline-flex items-center gap-1.5 hover:text-ink"><Shield size={15} /><span className="hidden xl:inline">{t('nav.admin')}</span></a>
          </>
        )}
        {me.can_admin && !me.admin && (
          <button onClick={() => viewAs(false)} title={t('nav.backToAdminRights')} aria-label={t('nav.memberViewExit')} className="inline-flex items-center gap-1.5 rounded-md border border-accent px-2 py-1 text-accent hover:bg-raised"><Eye size={15} /><span className="hidden xl:inline">{t('nav.memberViewExit')}</span></button>
        )}
        {me.multi_user && (
          <>
            <a href="#/account" title={t('nav.account')} aria-label={t('nav.account')} className="inline-flex items-center gap-1.5 hover:text-ink"><User size={15} /><span className="hidden xl:inline">{t('nav.account')}</span></a>
            <button onClick={signOut} title={t('nav.signOut')} aria-label={t('nav.signOut')} className="inline-flex items-center gap-1.5 hover:text-ink"><LogOut size={15} /><span className="hidden xl:inline">{t('nav.signOut')}</span></button>
          </>
        )}
        {area === 'admin' && <button onClick={onHelp} title={t('nav.shortcutsTitle')} className="hover:text-ink">?</button>}
        <span className="relative inline-flex items-center">
          <Flag lang={lang} className="pointer-events-none absolute left-2.5" />
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('lang.label')} className="h-9 rounded-md border border-line bg-surface pl-9 pr-2">
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </span>
        <button onClick={onTheme} title={dark ? t('nav.lightMode') : t('nav.darkMode')} aria-label={dark ? t('nav.lightMode') : t('nav.darkMode')}
          className="grid size-9 place-items-center rounded-md border border-line hover:border-line-strong hover:text-ink">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

const ROWS: [string, string][] = [
  ['1 … 4', t('nav.goToScreens')],
  ['Esc', t('nav.closeOverlay')],
  ['?', t('nav.toggleList')]
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60" onClick={onClose}>
      <div role="dialog" aria-label={t('nav.shortcuts')} className="w-96 rounded-lg border border-line bg-surface p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-[15px] font-semibold">{t('nav.shortcuts')}</h2>
        <dl className="flex flex-col gap-1.5 text-[13px]">
          {ROWS.map(([k, d]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-20 shrink-0"><kbd className="rounded-sm border border-line px-1.5 font-mono text-[12px]">{k}</kbd></dt>
              <dd className="text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// Drawn flags: emoji flags render as two letters on Windows.
function Flag({ lang, className = '' }: { lang: Lang; className?: string }) {
  const cls = `h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 ${className}`;
  return lang === 'fr' ? (
    <svg viewBox="0 0 3 2" className={cls} aria-hidden="true">
      <rect width="1" height="2" fill="#002654" /><rect x="1" width="1" height="2" fill="#fff" /><rect x="2" width="1" height="2" fill="#CE1126" />
    </svg>
  ) : (
    <svg viewBox="0 0 60 30" className={cls} aria-hidden="true" preserveAspectRatio="none">
      <clipPath id="flag-uk"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#flag-uk)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
