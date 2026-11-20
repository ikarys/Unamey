import { useEffect, useRef } from 'react';
import { CircleHelp, ExternalLink, X } from 'lucide-react';
import { t, type Key } from '../i18n';

export type HelpSection = 'firstRun' | 'describe' | 'styles' | 'rework' | 'pages' | 'pack' | 'gallery' | 'account' | 'troubleshooting';

// The same guide as docs/help.html, kept in the locales so it works offline and in both languages.
const SECTIONS: { id: HelpSection; title: Key; items: Key[]; list?: true }[] = [
  { id: 'firstRun', title: 'help.firstRun.title', items: ['help.firstRun.p1', 'help.firstRun.p2', 'help.firstRun.p3'] },
  { id: 'describe', title: 'help.describe.title', items: ['help.describe.p1', 'help.describe.p2', 'help.describe.p3'] },
  { id: 'styles', title: 'help.styles.title', items: ['help.styles.p1', 'help.styles.p2', 'help.styles.p3'] },
  { id: 'rework', title: 'help.rework.title', items: ['help.rework.p1', 'help.rework.p2', 'help.rework.p3'] },
  { id: 'pages', title: 'help.pages.title', items: ['help.pages.p1', 'help.pages.p2', 'help.pages.p3'] },
  { id: 'pack', title: 'help.pack.title', items: ['help.pack.p1', 'help.pack.p2', 'help.pack.p3'] },
  { id: 'gallery', title: 'help.gallery.title', items: ['help.gallery.p1', 'help.gallery.p2'] },
  { id: 'account', title: 'help.account.title', items: ['help.account.p1', 'help.account.p2'] },
  { id: 'troubleshooting', title: 'help.troubleshooting.title', list: true, items: ['help.troubleshooting.li1', 'help.troubleshooting.li2', 'help.troubleshooting.li3', 'help.troubleshooting.li4', 'help.troubleshooting.li5', 'help.troubleshooting.li6'] }
];
const SITE = 'https://ikarys.github.io/Unamey/help.html';
const ISSUES = 'https://github.com/ikarys/Unamey/issues';

// Screens open the drawer on their own section without context plumbing, like `studio:unauthorized`.
export const openHelp = (section: HelpSection) => dispatchEvent(new CustomEvent('studio:help', { detail: section }));

export function HelpButton({ section, className = '' }: { section: HelpSection; className?: string }) {
  return (
    <button type="button" onClick={() => openHelp(section)} title={t('nav.help')} aria-label={t('nav.help')} className={`grid size-7 place-items-center rounded-full text-ink-3 hover:bg-raised hover:text-ink ${className}`}>
      <CircleHelp size={16} />
    </button>
  );
}

// The strings use `**bold**` for UI names and `code` for paths; they are ours, never user input.
const inline = (s: string) =>
  s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) =>
    part.startsWith('**') ? <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
      : part.startsWith('`') ? <code key={i} className="rounded bg-raised px-1 font-mono text-[12px]">{part.slice(1, -1)}</code>
        : part);

export function HelpDrawer({ section, onClose }: { section: HelpSection; onClose: () => void }) {
  const body = useRef<HTMLDivElement>(null);
  // The first section opens at the top so the lead and the section list stay visible.
  const jump = (id: HelpSection) => (id === SECTIONS[0].id ? body.current?.scrollTo(0, 0) : body.current?.querySelector(`#help-${id}`)?.scrollIntoView({ block: 'start' }));
  useEffect(() => { jump(section); }, [section]);
  return (
    <aside role="dialog" aria-label={t('help.title')} className="fixed inset-y-0 right-0 z-40 flex w-[min(480px,100vw)] flex-col border-l border-line bg-surface text-[13.5px] leading-relaxed text-ink-2 shadow-soft">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-5">
        <CircleHelp size={18} className="text-accent" />
        <h2 className="text-[15px] font-semibold text-ink">{t('help.title')}</h2>
        <a href={SITE} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12.5px] hover:text-ink">{t('help.site')} <ExternalLink size={12} /></a>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="grid size-8 place-items-center rounded-md hover:bg-raised hover:text-ink"><X size={16} /></button>
      </div>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
        <p className="py-4">{t('help.lead')}</p>
        <nav aria-label={t('help.title')} className="flex flex-wrap gap-1.5 border-b border-line pb-4">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => jump(s.id)} className={`rounded-full border px-2.5 py-0.5 text-[12px] ${s.id === section ? 'border-accent text-accent' : 'border-line hover:border-line-strong hover:text-ink'}`}>{t(s.title)}</button>
          ))}
        </nav>
        {SECTIONS.map((s) => (
          <section key={s.id} id={`help-${s.id}`} className="scroll-mt-2 pt-6">
            <h3 className="mb-2 text-[14px] font-semibold text-ink">{t(s.title)}</h3>
            {s.list ? (
              <ul className="flex list-disc flex-col gap-1.5 pl-5">{s.items.map((k) => <li key={k}>{inline(t(k))}</li>)}</ul>
            ) : s.items.map((k) => <p key={k} className="mb-2.5">{inline(t(k))}</p>)}
          </section>
        ))}
        <p className="mt-4">{t('help.issue')} <a href={ISSUES} target="_blank" rel="noreferrer" className="text-accent hover:underline">{t('help.issueLink')}</a></p>
      </div>
    </aside>
  );
}
