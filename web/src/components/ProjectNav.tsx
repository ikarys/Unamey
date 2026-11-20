// Studio project navigation: the project bar (look, pages, earlier tries) and the no-project sidebar.
import { useEffect, useState, type ReactNode } from 'react';
import { type Archetype, type Concept, type Generation, type Project } from '../api';
import { Button, Segmented, useDismiss, areaCls, confirmDialog, inputCls } from './ui';
import { PromptBox } from './PromptBox';
import { t, tn, fmtDateTime, look } from '../i18n';
import { ChevronDown, ChevronRight, FilePlus, Layers, Monitor, Palette, Pencil, Plus, Smartphone, Trash2, X } from 'lucide-react';

export function ProjectNav({ projects, project, onProject }: {
  projects: Project[];
  project: Project | null;
  onProject: (id: string | null) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-5 pb-3">
        <select
          aria-label={t('projectNav.project')}
          className={inputCls}
          value={project ? String(project.id) : ''}
          onChange={(e) => onProject(e.target.value || null)}
        >
          <option value="">{t('projectNav.newProject')}</option>
          {projects.filter((p) => !p.archived || p.id === project?.id).map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="p-5">
        <h2 className="mb-3 text-[14px] font-semibold text-ink">{t('projectNav.describeApp')}</h2>
        <PromptBox />
      </div>
    </div>
  );
}

// A dropdown with an inline rename (pencil → input; Enter saves, Esc cancels) and an optional delete.
export function NameSelect({ label, value, name, onChange, onRename, onDelete, children }: {
  label: string;
  value: string;
  name: string;
  onChange: (value: string) => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const iconCls = 'grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-raised hover:text-ink';
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={name}
        aria-label={label}
        maxLength={80}
        className={`${inputCls} !h-8 !w-44 shrink-0`}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
          else if (e.key === 'Enter') {
            const v = e.currentTarget.value.trim();
            setEditing(false);
            if (v && v !== name) onRename?.(v);
          }
        }}
      />
    );
  }
  return (
    <div className="flex shrink-0 items-center">
      <select aria-label={label} className={`${inputCls} !h-8 !w-40`} value={value} onChange={(e) => onChange(e.target.value)} onDoubleClick={() => onRename && setEditing(true)}>
        {children}
      </select>
      {onRename && <button type="button" className={iconCls} aria-label={t('projectNav.rename')} title={t('projectNav.rename')} onClick={() => setEditing(true)}><Pencil size={14} /></button>}
      {onDelete && <button type="button" className={iconCls} aria-label={t('projectNav.deleteConcept')} title={t('projectNav.deleteConcept')} onClick={onDelete}><Trash2 size={14} /></button>}
    </div>
  );
}

const NEW_CONCEPT = '__new';
const itemCls = 'flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] text-ink hover:bg-raised disabled:opacity-50 disabled:hover:bg-transparent';

export function ProjectBar({ projects, project, concept, generations, selected, busy, archetypes, addSignal, onProject, onConcept, onNewConcept, onRenameConcept, onDeleteConcept, onSelect, onAddPage, onAlternative, makeOther }: {
  projects: Project[];
  project: Project;
  concept: Concept | null;
  /** Bumped by the parent to open the "add a page" popover. */
  addSignal: number;
  onConcept: (id: string) => void;
  onNewConcept: () => void;
  onRenameConcept: (name: string) => void;
  onDeleteConcept: () => void;
  generations: Generation[];
  selected: string | null;
  busy: boolean;
  archetypes: Archetype[];
  onProject: (id: string | null) => void;
  onSelect: (id: string) => void;
  onAddPage: (name: string, brief: string, target: 'desktop' | 'mobile') => Promise<boolean>;
  onAlternative: (id: string, archetype: string) => void;
  /** The other format of the screen on display, when it does not exist yet; `run` is null while it cannot be made. */
  makeOther: { mobile: boolean; run: (() => void) | null } | null;
}) {
  const [adding, setAdding] = useState(false);
  const [styling, setStyling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDismiss<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
  const [name, setName] = useState('');
  const [brief, setBrief] = useState('');
  const [target, setTarget] = useState<'desktop' | 'mobile'>('desktop');

  const identity = concept ? generations.find((g) => g.id === concept.identity) : undefined;
  useEffect(() => {
    if (addSignal > 0) { setAdding(true); setStyling(false); setMenuOpen(false); }
  }, [addSignal]);

  const pageMap = new Map<string, { newest: Generation; count: number }>();
  for (const g of generations) {
    const pageName = g.page?.trim();
    if (!pageName) continue;
    const existing = pageMap.get(pageName);
    if (!existing) {
      pageMap.set(pageName, { newest: g, count: 1 });
    } else {
      existing.count += 1;
      if (g.id > existing.newest.id) existing.newest = g;
    }
  }

  const pages = Array.from(pageMap.entries())
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const pageNewestIds = new Set(pages.map((p) => p.newest.id));
  const tries = identity ? generations.filter((g) => g.id !== identity.id && !pageNewestIds.has(g.id)) : [];
  const candidateLooks = identity ? [] : generations.filter((g) => !g.page || g.page.trim() === '');

  // Another look starts from the look on screen, else the project's look, else the newest candidate.
  const lookBase = generations.find((g) => g.id === selected && !g.page?.trim())?.id ?? identity?.id ?? candidateLooks[0]?.id;

  // The picker's first entry: the reference look, else the look on screen, else the newest look (no reference yet).
  const main = identity ?? generations.find((g) => g.id === selected && !g.page?.trim()) ?? candidateLooks.reduce<Generation | undefined>((a, g) => (!a || g.id > a.id ? g : a), undefined);
  const pageSelectValue = selected && (selected === main?.id || pages.some((p) => p.newest.id === selected) || tries.some((g) => g.id === selected)) ? selected : '';

  const canSubmit = !busy && name.trim().length > 0 && brief.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ok = await onAddPage(name.trim(), brief.trim(), target);
    if (ok) {
      setName('');
      setBrief('');
      setTarget('desktop');
      setAdding(false);
    }
  };

  return (
    <nav aria-label={t('projectNav.projectScreens')} className="flex min-w-0 items-center gap-3">
      <NameSelect label={t('projectNav.project')} name={project.name} value={String(project.id)} onChange={(v) => onProject(v || null)}>
        <option value="">{t('projectNav.newProject')}</option>
        {projects.filter((p) => !p.archived || p.id === project.id).map((p) => (
          <option key={p.id} value={String(p.id)}>
            {p.name}
          </option>
        ))}
      </NameSelect>

      <ChevronRight size={14} className="shrink-0 text-ink-3" />

      {concept && (
        <NameSelect
          label={t('projectNav.concept')}
          name={concept.name}
          value={concept.id}
          onChange={(v) => (v === NEW_CONCEPT ? onNewConcept() : onConcept(v))}
          onRename={onRenameConcept}
          onDelete={project.concepts.length > 1 ? onDeleteConcept : undefined}
        >
          {project.concepts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value={NEW_CONCEPT}>{t('projectNav.newConcept')}</option>
        </NameSelect>
      )}

      <span className="h-6 w-px shrink-0 bg-line" />

      <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[12px] text-ink-3">{t('projectNav.page')}</span>
          <select
            aria-label={t('projectNav.pages')}
            className={`${inputCls} !h-8 !w-52 shrink-0`}
            value={pageSelectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value) onSelect(value);
            }}
          >
            {pageSelectValue === '' && <option value="" disabled hidden>{pages.length || main ? '—' : t('projectNav.noPages')}</option>}
            {main && <option value={main.id}>{identity ? t('projectNav.mainScreen') : t('projectNav.looks', { n: candidateLooks.length })}</option>}
            {pages.map((p) => (
              <option key={p.newest.id} value={p.newest.id}>
                {p.name}{p.count > 1 ? ` (${tn('projectNav.versions', p.count)})` : ''}{p.newest.target === 'mobile' ? ` · ${t('projectNav.phone')}` : ''}
              </option>
            ))}
            {tries.length > 0 && (
              <optgroup label={tn('projectNav.earlierTries', tries.length)}>
                {tries.map((g) => (
                  <option key={g.id} value={g.id}>
                    {t('projectNav.versionOf', { date: fmtDateTime(g.created_at) })}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-expanded={menuOpen}
          className="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-accent/40 bg-accent/10 px-2 text-[13px] font-medium text-accent hover:border-accent hover:bg-accent/20"
          onClick={() => {
            setMenuOpen(!menuOpen);
            setAdding(false);
            setStyling(false);
          }}
        >
          <Plus size={14} /> {t('projectNav.add')} <ChevronDown size={14} />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 flex w-56 flex-col rounded-lg border border-line bg-surface p-1 shadow-soft">
            <button type="button" className={itemCls} disabled={!identity} title={identity ? undefined : t('projectNav.pickLookShort')} onClick={() => { setMenuOpen(false); setAdding(true); }}>
              <FilePlus size={14} /> {t('projectNav.addPageItem')}
            </button>
            {makeOther && (
              <button type="button" className={itemCls} disabled={busy || !makeOther.run} title={makeOther.run ? undefined : t('result.makeLockedTitle')} onClick={() => { setMenuOpen(false); makeOther.run?.(); }}>
                {makeOther.mobile ? <Monitor size={14} /> : <Smartphone size={14} />} {t(makeOther.mobile ? 'result.makeDesktop' : 'result.makeMobile')}
              </button>
            )}
            <button type="button" className={itemCls} disabled={lookBase == null} onClick={() => { setMenuOpen(false); setStyling(true); }}>
              <Palette size={14} /> {t('projectNav.newLook')}
            </button>
            <button type="button" className={itemCls} onClick={() => { setMenuOpen(false); onNewConcept(); }}>
              <Layers size={14} /> {t('projectNav.newConceptItem')}
            </button>
          </div>
        )}

            {styling && (
              <div
                className="absolute left-0 top-full z-30 mt-1 w-80 flex flex-col rounded-lg border border-line bg-surface p-2 shadow-soft"
                onKeyDown={(e) => e.key === 'Escape' && setStyling(false)}
              >
                <div className="flex items-center gap-2 px-1 pb-1">
                  <span className="text-[12px] text-ink-2">{t('projectNav.sameAppOtherStyle')}</span>
                  <button type="button" aria-label={t('projectNav.cancel')} className="ml-auto text-ink-3 hover:text-ink" onClick={() => setStyling(false)}><X size={14} /></button>
                </div>
                <div className="flex max-h-72 flex-col overflow-y-auto">
                  {archetypes.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={busy}
                      title={look(a).desc}
                      className="flex flex-col rounded-md px-2 py-1.5 text-left hover:bg-raised disabled:opacity-50"
                      onClick={async () => {
                        if (!(await confirmDialog(t('projectNav.confirmLook', { name: look(a).name }), t('projectNav.generate'), false))) return;
                        if (lookBase != null) onAlternative(lookBase, a.id);
                        setStyling(false);
                      }}
                    >
                      <span className="text-[13px] text-ink">{look(a).name}</span>
                      <span className="truncate text-[12px] text-ink-3">{look(a).desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {adding && (
              <div className="absolute left-0 top-full z-30 mt-1 w-96 flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 shadow-soft">
                <input
                  autoFocus
                  className={inputCls}
                  placeholder={t('projectNav.pageNamePlaceholder')}
                  aria-label={t('projectNav.pageName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setAdding(false);
                  }}
                />
                <textarea
                  rows={4}
                  className={areaCls}
                  placeholder={t('projectNav.pageDescriptionPlaceholder')}
                  aria-label={t('projectNav.pageDescription')}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setAdding(false);
                  }}
                />
                <Segmented<'desktop' | 'mobile'>
                  label={t('projectNav.target')}
                  value={target}
                  onChange={setTarget}
                  options={[
                    { value: 'desktop', label: <Monitor size={12} />, title: t('projectNav.desktop') },
                    { value: 'mobile', label: <Smartphone size={12} />, title: t('projectNav.phone') },
                  ]}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    primary
                    className="flex-1"
                    disabled={!canSubmit}
                    onClick={() => {
                      void handleSubmit();
                    }}
                  >
                    {busy ? t('projectNav.generating') : t('projectNav.generatePage')}
                  </Button>
                  <Button type="button" aria-label={t('projectNav.cancel')} onClick={() => setAdding(false)}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}
      </div>
    </nav>
  );
}
