// Gallery screen: all generated screens grouped by project.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Loader, Pencil, Smartphone, Sparkles, SquareCheck, SquareX, Trash2 } from 'lucide-react';
import { api, shortId, type Generation } from '../api';
import { useAsync } from '../hooks/useAsync';
import { Dot, ErrorRow, confirmDialog } from '../components/ui';
import { previewDoc } from './Generate';
import { useApp } from '../components/AppContext';
import { fmtAgo, t, tn, type Key } from '../i18n';

type VerdictFilter = 'all' | 'good' | 'mixed' | 'bad' | 'none';
const VERDICTS: VerdictFilter[] = ['all', 'good', 'mixed', 'bad', 'none'];
const VERDICT_LABELS: Record<VerdictFilter, Key> = {
  all: 'gallery.verdictAll',
  good: 'gallery.verdictGood',
  mixed: 'gallery.verdictMixed',
  bad: 'gallery.verdictBad',
  none: 'gallery.verdictNone',
};

/** A CSS hex color from the model's output, else undefined (never pass free text into styles). */
const hex = (c?: string | null) => (c && /^#[0-9a-f]{3,8}$/i.test(c) ? c : undefined);

/** Most recent first, by the newest id of each newest-first list (UUIDv7: code-point order is creation order); an empty list (still generating) first. */
const byNewest = (a: Generation[], b: Generation[]) => {
  const [x, y] = [a[0]?.id ?? '~', b[0]?.id ?? '~'];
  return x === y ? 0 : x < y ? 1 : -1;
};

const orderItems = (items: Generation[]) => {
  const newest = new Map<string, string>();
  for (const g of items) if (g.batch != null && g.id > (newest.get(g.batch) ?? '')) newest.set(g.batch, g.id);
  const rank = (g: Generation) => (g.batch != null ? newest.get(g.batch)! : g.id);
  return [...items].sort((x, y) => rank(y).localeCompare(rank(x)) || y.id.localeCompare(x.id));
};

function Fit({ id, html, mobile }: { id: string; html: string | undefined; mobile: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = mobile ? box.h / 844 : box.w / 1440;

  return (
    <div ref={ref} className="absolute inset-0">
      {html === undefined ? <div className="skeleton h-full w-full" /> : box.w > 0 && (
        <iframe
          title={t('gallery.previewTitle', { id })}
          sandbox="allow-scripts"
          srcDoc={previewDoc(html)}
          className={`pointer-events-none absolute top-0 origin-top-left ${mobile ? 'h-[844px] w-[390px]' : 'left-0 h-[900px] w-[1440px]'}`}
          style={{ transform: `scale(${scale})`, left: mobile ? (box.w - 390 * scale) / 2 : 0 }}
        />
      )}
    </div>
  );
}

function Card({
  g,
  html,
  onRequest,
  checked,
  onToggle,
  admin,
  title,
  reference,
}: {
  g: Generation;
  html?: string;
  onRequest: (id: string) => void;
  checked: boolean;
  onToggle: (id: string) => void;
  admin: boolean;
  title?: string;
  reference?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (html !== undefined) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      onRequest(g.id);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onRequest(g.id);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [html, onRequest, g.id]);

  return (
    <div className="group relative">
      <input
        type="checkbox"
        aria-label={t('gallery.selectScreen', { id: g.id })}
        checked={checked}
        onChange={() => onToggle(g.id)}
        className={`absolute left-2 top-2 z-10 h-4 w-4 accent-accent ${checked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      />
      <button
        ref={ref}
        type="button"
        onClick={() => {
          window.location.hash = `#/generate?id=${g.id}`;
        }}
        className={`flex w-full flex-col overflow-hidden rounded-md border bg-surface text-left shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong ${
          checked ? 'border-accent ring-2 ring-accent/30' : 'border-line'
        }`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-raised" style={{ background: hex(g.canvas) }}>
          <Fit id={g.id} html={html} mobile={g.target === 'mobile'} />
        </div>
        <div className="h-1" style={{ background: hex(g.accent) ?? 'var(--color-line)' }} />
        <div className="flex flex-col gap-0.5 p-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <span className="truncate">{title ?? g.label ?? g.page ?? t('gallery.untitledScreen')}</span>
            {reference && <span className="ml-auto shrink-0 rounded-full bg-ok px-2 text-[11px] font-semibold text-canvas">{t('gallery.reference')}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <span>{fmtAgo(g.created_at)}</span>
            {g.page && !title && <span>· {g.page}</span>}
            {g.target === 'mobile' && <Smartphone size={12} className="shrink-0" aria-label={t('gallery.mobile')} />}
          </div>
          {admin && (
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <span>#{shortId(g.id)} · {g.archetype ?? t('gallery.none')} · {g.detect_count ?? 0}</span>
              {g.verdict && <Dot status={g.verdict} title={g.verdict_note ?? undefined} />}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

export function Gallery() {
  // Reloads when the user's background generation starts or ends, so a result finished elsewhere shows up here.
  const myJobs = useApp().status?.my_jobs;
  const jobsKey = (myJobs ?? []).map((j) => j.id).join(',');
  const { data, error, loading, reload } = useAsync(api.generations, [jobsKey]);
  const projects = useAsync(api.projects, [jobsKey]);
  // Running jobs shown in place (concept + page) as "in progress" cards.
  const pending = useMemo(() => (myJobs ?? []).flatMap((j) => (j.target && !j.target.page?.trim() ? [{ id: j.id, concept: j.target.concept, page: j.target.page?.trim() ?? '' }] : [])), [jobsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [verdict, setVerdict] = useState<VerdictFilter>('all');
  const [archetype, setArchetype] = useState('');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<'recent' | 'name'>(() => (localStorage.getItem('gallery.sort') === 'name' ? 'name' : 'recent'));
  const [htmls, setHtmls] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { me } = useApp();
  const admin = Boolean(me?.admin);

  const requestHtml = useCallback(
    (id: string) => {
      api
        .generation(id)
        .then((g) => {
          const h = g.html;
          if (h) setHtmls((prev) => (prev[id] ? prev : { ...prev, [id]: h }));
        })
        .catch(() => {});
    },
    []
  );

  useEffect(() => {
    if (!data) return;
    setSelected((prev) => new Set([...prev].filter((id) => data.some((g) => g.id === id))));
  }, [data]);

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (items: Generation[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const all = items.every((i) => next.has(i.id));
      if (all) items.forEach((i) => next.delete(i.id));
      else items.forEach((i) => next.add(i.id));
      return next;
    });

  const removeSelected = async () => {
    if (!(await confirmDialog(tn('gallery.deleteScreensConfirm', selected.size), t('gallery.delete')))) return;
    try {
      await api.deleteGenerations([...selected]);
      setSelected(new Set());
      reload();
      projects.reload();
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  const archetypes = useMemo(
    () =>
      Array.from(
        new Set((data ?? []).map((g) => g.archetype).filter((a): a is string => Boolean(a)))
      ).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Looks only: a concept's pages live in the studio (page picker of the project bar).
    return (data ?? []).filter(
      (g) =>
        !g.page?.trim() &&
        (verdict === 'all' || (verdict === 'none' ? !g.verdict : g.verdict === verdict)) &&
        (!archetype || g.archetype === archetype) &&
        (!q || (g.label ?? '').toLowerCase().includes(q) || (g.brief ?? '').toLowerCase().includes(q))
    );
  }, [data, verdict, archetype, query]);

  const groups = useMemo(() => {
    const m = new Map<string, Generation[]>();
    const byId = new Map((projects.data ?? []).map((p) => [p.id, p]));
    for (const g of filtered) {
      const k = g.project_id != null ? `p${g.project_id}` : 'unsorted';
      m.set(k, [...(m.get(k) ?? []), g]);
    }
    // A project whose first looks are still generating has no generation yet: list it anyway.
    for (const j of pending) {
      const p = (projects.data ?? []).find((p) => p.concepts.some((c) => c.id === j.concept));
      if (p && !m.has(`p${p.id}`)) m.set(`p${p.id}`, []);
    }

    return Array.from(m.entries())
      .map(([key, items]) => {
        const project = key === 'unsorted' ? null : key.slice(1);
        const proj = project != null ? byId.get(project) : undefined;
        const identities = new Set((proj?.concepts ?? []).map((c) => c.identity).filter(Boolean));
        const ordered = orderItems(items);
        // One sub-section per concept of the project (concept order), then generations of unknown concepts.
        const sections = (proj?.concepts ?? [])
          .map((c) => ({ id: c.id, name: c.name, identity: c.identity, items: ordered.filter((i) => i.concept_id === c.id) }))
          .filter((c) => c.items.length > 0 || pending.some((j) => j.concept === c.id));
        // Recent first: concepts/projects still generating their first looks (no item yet) on top.
        const sortedSections = sort === 'recent' ? [...sections].sort((a, b) => byNewest(a.items, b.items)) : sections;
        return {
          key,
          project,
          heading: proj?.name ?? (project != null ? t('gallery.projectFallback', { id: project }) : t('gallery.unsorted')),
          sections: sortedSections,
          accent: hex(items.find((i) => identities.has(i.id))?.accent) ?? items.map((i) => hex(i.accent)).find(Boolean),
          archived: proj?.archived ?? false,
          items: ordered,
        };
      })
      .filter((g) => showArchived || !g.archived)
      .sort(
        (a, b) =>
          (a.project == null ? 1 : 0) - (b.project == null ? 1 : 0) ||
          (a.project == null ? 0 : sort === 'name' ? a.heading.localeCompare(b.heading) : byNewest(a.items, b.items))
      );
  }, [filtered, projects.data, showArchived, pending, sort]);

  const rename = async (id: string, current: string) => {
    const name = window.prompt(t('gallery.projectName'), current)?.trim();
    if (!name || name === current) return;
    try {
      await api.renameProject(id, name);
      projects.reload();
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  const archive = async (id: string, archived: boolean) => {
    try {
      await api.archiveProject(id, archived);
      projects.reload();
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!(await confirmDialog(t('gallery.deleteProjectConfirm', { name }), t('gallery.delete')))) return;
    try {
      await api.deleteProject(id);
      projects.reload();
      reload();
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  const head = (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-ink">
          {t('gallery.title')} <span className="text-ink-3">{data?.length ?? 0}</span>
        </h1>
        <p className="mt-1 text-[14px] text-ink-2">{t('gallery.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('gallery.searchPlaceholder')}
          className="h-10 w-64 rounded-md border border-line bg-surface px-3 text-[14px] text-ink shadow-soft placeholder:text-ink-3"
        />
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          {t('gallery.sortBy')}
          <select
            value={sort}
            onChange={(e) => {
              const value = e.target.value as 'recent' | 'name';
              setSort(value);
              localStorage.setItem('gallery.sort', value);
            }}
            className="h-10 rounded-md border border-line bg-surface px-2 text-[13px] text-ink"
          >
            <option value="recent">{t('gallery.sortRecent')}</option>
            <option value="name">{t('gallery.sortName')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          {t('gallery.showArchived')}
        </label>
        {admin && (
          <>
            <div className="flex items-center rounded-md border border-line bg-surface p-0.5">
              {VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(v)}
                  className={`rounded-sm px-2.5 py-1 text-[13px] ${
                    verdict === v ? 'bg-accent/10 font-medium text-accent' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {t(VERDICT_LABELS[v])}
                </button>
              ))}
            </div>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="h-10 rounded-md border border-line bg-surface px-2 text-[13px] text-ink"
            >
              <option value="">{t('gallery.allArchetypes')}</option>
              {archetypes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );

  const selectionBar =
    selected.size > 0 ? (
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-ink-2">{tn('gallery.selected', selected.size)}</span>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="text-[13px] text-ink-2 hover:text-ink"
        >
          {t('gallery.clear')}
        </button>
        <button
          type="button"
          onClick={removeSelected}
          className="h-9 rounded-md border border-line px-3 text-[13px] font-medium text-bad hover:border-bad"
        >
          {t('gallery.deleteSelected', { n: selected.size })}
        </button>
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton h-7 w-48 rounded-md" />
              <div className="skeleton h-4 w-72 rounded-md" />
            </div>
            <div className="skeleton h-10 w-64 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-md border border-line bg-surface shadow-soft">
                <div className="skeleton aspect-[16/10] w-full" />
                <div className="p-3">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="mt-2 skeleton h-3 w-40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <ErrorRow message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          {head}
          {selectionBar}
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center shadow-soft">
              <Sparkles className="mx-auto h-6 w-6 text-accent" />
              <h2 className="mt-4 text-[18px] font-semibold text-ink">
                {data?.length ? t('gallery.noMatchingScreens') : t('gallery.noGeneratedScreens')}
              </h2>
              <p className="mt-2 text-[14px] text-ink-2">
                {data?.length ? t('gallery.adjustFilters') : t('gallery.generateToSee')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-10">
        {head}
        {selectionBar}
        <div className="space-y-8">
          {groups.map((group) => {
            const allSelected = group.items.every((item) => selected.has(item.id));
            return (
              <section key={group.key}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: group.accent ?? 'var(--color-line-strong)' }} />
                  <h2 className="text-[15px] font-semibold text-ink">
                    {group.heading} <span className="text-ink-3">{group.items.length}</span>
                  </h2>
                  {group.archived && (
                    <span className="rounded-sm bg-raised px-1.5 py-0.5 text-[11px] font-medium text-ink-3">{t('gallery.archivedBadge')}</span>
                  )}
                  <span className="ml-1 inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.items)}
                    title={allSelected ? t('gallery.clear') : t('gallery.selectAll')}
                        aria-label={allSelected ? t('gallery.clear') : t('gallery.selectAll')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-ink"
                  >
                    {allSelected ? <SquareX size={16} /> : <SquareCheck size={16} />}
                  </button>
                  {group.project != null && (
                    <>
                      <button
                        type="button"
                        onClick={() => rename(group.project!, group.heading)}
                        title={t('gallery.rename')}
                        aria-label={t('gallery.rename')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-ink"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => archive(group.project!, !group.archived)}
                        title={group.archived ? t('gallery.unarchive') : t('gallery.archive')}
                        aria-label={group.archived ? t('gallery.unarchive') : t('gallery.archive')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-ink"
                      >
                        {group.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(group.project!, group.heading)}
                        title={t('gallery.delete')}
                        aria-label={t('gallery.delete')}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-raised hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  </span>
                </div>
                {(group.sections.length > 0 ? group.sections : [{ id: group.key, name: null as string | null, identity: null as string | null, items: group.items }]).map((sec) => (
                  <div key={sec.id} className="mb-4">
                    {sec.name != null && (
                      <h3 className="mb-2 text-[13px] font-medium text-ink-2">
                        {sec.name} <span className="text-ink-3">{sec.items.length}</span>
                        {admin && sec.identity != null && <span className="ml-2 text-[12px] font-normal text-ink-3">{t('gallery.identity', { id: sec.identity })}</span>}
                      </h3>
                    )}
                    {/* Main screen (the looks) first, then one row per page, so tries of a page read as tries. */}
                    {[...new Set([...sec.items.map((i) => i.page?.trim() ?? ''), ...pending.filter((j) => j.concept === sec.id).map((j) => j.page)])].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b))).map((page) => {
                      const items = sec.items.filter((i) => (i.page?.trim() ?? '') === page);
                      const running = pending.filter((j) => j.concept === sec.id && j.page === page);
                      return (
                        <div key={page} className="mb-3">
                          <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-3">
                            {page || t('gallery.mainScreen')} · {t(page ? 'gallery.tries' : 'gallery.looks', { n: items.length })}
                          </div>
                          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {running.map((j) => (
                              <a key={j.id} href={`#/generate?job=${j.id}`} title={t('nav.backToGenerationTitle')}
                                className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent/10 text-[14px] font-medium text-accent hover:bg-accent/20">
                                <Loader size={22} className="animate-spin" /> {t('gallery.inProgress')}
                              </a>
                            ))}
                            {items.map((item, k) => (
                              <Card
                                key={item.id}
                                g={item}
                                html={htmls[item.id]}
                                onRequest={requestHtml}
                                checked={selected.has(item.id)}
                                onToggle={toggleSelected}
                                admin={admin}
                                title={page ? `${page} · ${t('result.tryN', { n: items.length - k })}` : undefined}
                                reference={sec.identity === item.id}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
