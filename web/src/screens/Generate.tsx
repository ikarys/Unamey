import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Archive, Check, ChevronDown, ChevronRight, Columns3, Copy, Hand, Download, Fingerprint, FolderInput, ImageDown, ImagePlus, Link, Maximize2, Monitor, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, Share2, Smartphone, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { api, shortId, REFINE_ACTIONS, REFINE_HINTS, type Archetype, type BriefDraft, type Concept, type EditRequest, type GenerateRequest, type Generation, type Job, type Project, type RefineAction, type Share, type Verdict } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useJob } from '../hooks/useJob';
import { useApp } from '../components/AppContext';
import { HelpButton } from '../components/Help';
import { Button, Dot, useDismiss, EmptyState, ErrorRow, Hint, Label, Segmented, SkeletonRows, confirmDialog, areaCls, inputCls, labelCls, linkCls, rowCls } from '../components/ui';
import { ProjectNav, ProjectBar, NameSelect } from '../components/ProjectNav';
import { PromptBox } from '../components/PromptBox';
import { t, tn, look, fmtAgo, fmtDate } from '../i18n';

const split = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

// UI toggles kept across reloads.
function usePersisted(key: string, init: boolean) { const [v, setV] = useState(() => { const s = localStorage.getItem(key); return s == null ? init : s === '1'; }); const set = (n: boolean) => { localStorage.setItem(key, n ? '1' : '0'); setV(n); }; return [v, set] as const; }

// Notes come as a JSON array of strings / {step,note} objects or a map; show them as ordered steps.
function steps(notes: unknown): { title: string; note: string }[] {
  if (!notes) return [];
  const o = notes as { steps?: unknown };
  if (Array.isArray(o.steps)) notes = o.steps;
  const items = Array.isArray(notes) ? notes : Object.entries(notes as object).map(([k, v]) => ({ step: k, note: v }));
  return items.map((it, i) => {
    if (typeof it === 'string') return { title: t('generate.step', { n: i + 1 }), note: it };
    const o = it as Record<string, unknown>;
    const note = o.note ?? o.text ?? o.notes ?? '';
    const name = String(o.step ?? o.title ?? o.name ?? '');
    return { title: /^\d*$/.test(name) ? t('generate.step', { n: i + 1 }) : name, note: typeof note === 'string' ? note : JSON.stringify(note) };
  });
}
// Links like href="#" would navigate the srcdoc iframe to a blank page: the preview is static, so swallow them.
const NO_NAV = '<script>addEventListener("click",e=>{if(e.target.closest("a[href]"))e.preventDefault()},true);const h=()=>parent.postMessage({studioHeight:Math.max(document.documentElement.getBoundingClientRect().height,document.body?document.body.scrollHeight:0)},"*");addEventListener("load",h);new ResizeObserver(h).observe(document.documentElement);addEventListener("message",e=>{if(e.data&&typeof e.data.studioTokens==="string"){let s=document.getElementById("studio-tokens");if(!s){s=document.createElement("style");s.id="studio-tokens";document.head.appendChild(s)}s.textContent=e.data.studioTokens;document.querySelectorAll("style[data-studio-effects]").forEach(x=>x.remove())}})</script>';
// Injected after <head> so a leading <!DOCTYPE> keeps the page out of quirks mode.
export const previewDoc = (html: string) => (/<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + NO_NAV) : NO_NAV + html);
const LIVE_KEYS = ['canvas', 'surface', 'border', 'text', 'muted', 'accent', 'accent2', 'font', 'mono', 'radius'];
// Keep in sync with EFFECT_RULES in src/pipeline/tokens.rs (saved into the mockup as <style data-studio-effects>).
const glowCss = (level: number) => `body{text-shadow:0 0 ${(level * 0.08).toFixed(2)}em color-mix(in srgb,currentColor ${40 + 6 * level}%,transparent)}`;
const EFFECT_CSS: Record<string, string> = {
  scanlines: 'html::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:2147483647;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.16) 0 1px,transparent 1px 3px)}',
  caps: 'button,[role="button"],.btn,input[type="submit"],th{text-transform:uppercase;letter-spacing:.08em;font-family:var(--mono,ui-monospace,monospace)}',
};
const TOGGLE_FX = Object.keys(EFFECT_CSS);
const FX_KEYS = ['glow', ...TOGGLE_FX];
const effectsCss = (tokens: Record<string, unknown>) => [typeof tokens.glow === 'number' && tokens.glow > 0 ? glowCss(tokens.glow) : '', ...TOGGLE_FX.filter((k) => tokens[k] === true).map((k) => EFFECT_CSS[k])].filter(Boolean).join('\n');
// CSS sent into the preview iframe: overrides the mockup's :root variables while tokens are being edited.
function tokenCss(tokens: Record<string, unknown>): string {
  const imports: string[] = [];
  const rules: string[] = [];
  for (const k of LIVE_KEYS) {
    const v = tokens[k];
    if (k === 'radius' && typeof v === 'number') rules.push(`--radius:${v}px`);
    else if ((k === 'font' || k === 'mono') && typeof v === 'string' && /^[A-Za-z0-9 ]+$/.test(v)) {
      imports.push(`@import url("https://fonts.googleapis.com/css2?family=${v.replace(/ /g, '+')}:wght@400;500;600;700&display=swap");`);
      rules.push(`--${k}:'${v}', ${k === 'font' ? 'sans-serif' : 'monospace'}`);
    } else if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) rules.push(`--${k}:${v}`);
  }
  return rules.length ? `${imports.join('')}:root{${rules.map((r) => `${r} !important`).join(';')}}` : '';
}
const menuItemCls = 'flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] text-ink hover:bg-raised disabled:opacity-50 disabled:hover:bg-transparent';
export const thumbCls = (mobile: boolean) => mobile ? 'pointer-events-none h-[844px] w-[390px] origin-top-left ml-[116px]' : 'pointer-events-none h-[900px] w-[1440px] origin-top-left';

const strList = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
type Finding = { rule: string; severity: string; detail: string; why: string };
type Direction = { label?: string; direction?: string; archetype?: { name?: string; feel?: string; fonts?: string[] }; structure?: { id?: string; name?: string; regions?: string } | null; identity?: Record<string, unknown> };
type Tok = { prompt: number; cached: number; completion: number; seconds: number };
const fmtK = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(1)}k`);
type Notes = { usage?: Tok & { calls?: number; planner?: Tok }; direction?: Direction; seed?: number; truncated?: boolean; invented?: unknown; files_read?: unknown; detect?: unknown; refine?: { from: number; action: string; label?: string; move?: string; change?: string | null }; edit?: { from: number; changes: Record<string, { from: unknown; to: unknown }>; layout?: string | null; change?: string | null } };
const asNotes = (n: unknown) => (n ?? {}) as Notes;
const findings = (n: unknown) => (Array.isArray(asNotes(n).detect) ? (asNotes(n).detect as Finding[]) : []);

// Job progress from the backend: {"phase","files","max_files","kb"}; plain text from older jobs.
type Progress = { phase: 'planning' | 'thinking' | 'reading' | 'writing'; files: number; max_files: number; kb: number; variant?: number; variants?: number; parallel?: boolean };
function parseProgress(p: string | undefined): Progress | null {
  try { return p ? (JSON.parse(p) as Progress) : null; } catch { return null; }
}

// Progress percentage for the determinate bar.
function progressPct(job: Job | null, p: Progress | null): number {
  if (!job || job.status === 'queued' || !p) return 3;
  const frac =
    p.phase === 'planning'
      ? 0.08
      : p.phase === 'writing'
        ? 0.5 + 0.45 * Math.min(1, p.kb / 40)
        : 0.1 + 0.35 * Math.min(1, p.files / Math.max(1, p.max_files));
  const variants = p.variants ?? 1;
  const variant = p.variant ?? 1;
  const overall = p.parallel ? frac : variants > 1 && p.phase !== 'planning' ? ((variant - 1) + frac) / variants : frac;
  return Math.max(3, Math.min(97, Math.round(overall * 100)));
}

function Running({ job }: { job: Job | null }) {
  const { me } = useApp();
  const [start] = useState(Date.now());
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const secs = Math.floor((Date.now() - start) / 1000);
  const p = parseProgress(job?.progress);
  const lines = (job?.log ?? '').split('\n').filter(Boolean);
  const files = lines.map((l) => /^read_skill_file .*"path":\s*"([^"]+)"/.exec(l)?.[1]).filter(Boolean) as string[];
  const writing = p?.phase === 'writing';
  const refining = job?.kind === 'refine';
  const phase = !job || job.status === 'queued' ? 'queued' : p?.phase === 'writing' ? 'writing' : p?.phase === 'planning' ? 'planning' : 'reading';
  const best = useRef(0);
  const pct = Math.max(best.current, progressPct(job, p));
  best.current = pct;
  const stepIndex = phase === 'queued' ? 0 : phase === 'planning' ? 1 : phase === 'reading' ? 2 : 3;
  const stepLabels = [
    t('generate.step.queued'),
    refining ? t('generate.step.planningRefine') : t('generate.step.planning'),
    t('generate.step.reading'),
    refining ? t('generate.step.writingRefine') : t('generate.step.writing')
  ];
  const stages = [
    { title: 'Queued', detail: 'waiting for the model', done: job?.status === 'running', active: !job || job.status === 'queued' },
    { title: refining ? 'Planning moves' : 'Reading the skill', detail: refining ? 'one per version' : `${files.length} files${p?.max_files ? ` / max ${p.max_files}` : ''}${!writing && p?.phase === 'thinking' ? ' · thinking' : ''}`, done: writing, active: job?.status === 'running' && !writing },
    { title: refining ? 'Writing the version' : 'Writing the screen', detail: writing ? `${p!.kb} kB of HTML written` : 'notes + HTML', done: false, active: writing }
  ];
  return (
    <div className="grid min-w-0 flex-1 place-items-center overflow-auto p-6 dots">
      <div className="w-[480px] rounded-lg border border-line bg-surface p-6 shadow-soft">
        <div className="mb-1 flex items-baseline justify-between text-[13px]">
          <span>{refining ? t('generate.running.refining') : t('generate.running.generating')} {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
          <span className="text-ink-3">{t((p?.variants ?? 1) > 1 ? 'generate.running.usuallyBatch' : 'generate.running.usually')}</span>
        </div>
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} /></div>
        {p && ((me.admin && p.phase === 'planning') || (p.phase !== 'planning' && (p.variants ?? 1) > 1)) && (
          <div className="mb-3 text-[12px] text-accent">{p.phase === 'planning' ? (refining ? t('generate.running.planning') : t('generate.running.planningDirections')) : p.parallel ? `${p.variants} ${t('generate.running.parallel')}` : `${t(refining ? 'generate.running.version' : me.admin ? 'generate.running.variant' : 'generate.running.look')} ${p.variant ?? 0} / ${p.variants}`}</div>
        )}
        {!me.admin && (
          <ol className="mt-1 flex flex-col gap-2.5">
            {stepLabels.map((label, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={i} aria-current={current ? 'step' : undefined} className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? 'bg-accent text-accent-ink' : current ? 'border-2 border-accent' : 'border border-line'}`}>
                    {done ? <Check size={12} /> : current ? <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> : null}
                  </span>
                  <span className={`text-[13.5px] ${current ? 'font-medium text-ink' : done ? 'text-ink-2' : 'text-ink-3'}`}>{label}</span>
                  {current && phase === 'reading' && <span className="ml-auto text-[12px] tabular-nums text-ink-3">{t('generate.step.readingDetail', { n: p?.files ?? files.length })}</span>}
                  {current && phase === 'writing' && <span className="ml-auto text-[12px] tabular-nums text-ink-3">{t('generate.step.writingDetail', { kb: p?.kb ?? 0 })}</span>}
                </li>
              );
            })}
          </ol>
        )}
        {me.admin && <ol className="mb-4 flex flex-col gap-2">
          {stages.map((s, i) => (
            <li key={s.title} className="flex items-baseline gap-2">
              <span className={`text-[12px] ${s.done ? 'text-ok' : s.active ? 'text-accent' : 'text-ink-3'}`}>{s.done ? '✓' : i + 1}</span>
              <span className={`text-[13px] font-medium ${s.active ? 'text-ink' : s.done ? 'text-ink-2' : 'text-ink-3'}`}>{s.title}</span>
              <span className="ml-auto text-[12px] text-ink-3">{s.detail}</span>
            </li>
          ))}
        </ol>}
        {me.admin && <pre className="h-52 overflow-auto rounded-md bg-canvas p-2 font-mono text-[12px] leading-4 text-ink-2">{lines.slice(-12).join('\n') || '(no log yet)'}</pre>}
      </div>
    </div>
  );
}

export function Generate() {
  const { toast, refreshStatus, me } = useApp();
  const hist = useAsync(api.generations, []);
  const archetypes = useAsync(api.archetypes, []);
  const projects = useAsync(api.projects, []);
  const [newProject, setNewProject] = useState<string | null>(null);
  const [mode, setMode] = useState<'look' | 'pages'>('pages');
  const [form, setForm] = useState<{ brief: string; users: string; data_objects: string; style_tags: string; density: string; variants: number; seed: string; archetype: string; project: string | null; concept: string | null; page: string; target: 'desktop' | 'mobile' | 'both'; pages: string[]; looks: string[]; describe: string; colours: string }>({ brief: '', users: '', data_objects: '', style_tags: '', density: 'compact', variants: 1, seed: '', archetype: 'auto', project: new URLSearchParams(location.hash.split('?')[1]).get('project') || null, concept: new URLSearchParams(location.hash.split('?')[1]).get('concept') || null, page: '', target: 'desktop', pages: [], looks: [], describe: '', colours: '' });
  // `#/generate?job=N&project=P&concept=C` (from the prompt page): follow that job in its concept.
  const [job, setJob] = useState<string | null>(() => new URLSearchParams(location.hash.split('?')[1]).get('job') || null);
  // The project the running job writes into, so it can be found again after browsing elsewhere.
  const [jobProject, setJobProject] = useState<string | null>(() => new URLSearchParams(location.hash.split('?')[1]).get('project') || null);
  // `#/generate?id=N` (from the Gallery) opens that generation; null follows the newest one (while a job runs); 'none' is a blank form, the start state.
  const [selected, setSelected] = useState<string | null | 'none'>(() => new URLSearchParams(location.hash.split('?')[1]).get('id') || (new URLSearchParams(location.hash.split('?')[1]).get('job') ? null : 'none'));
  const [helper, setHelper] = useState<string | null>(null);
  const briefRef = useRef<HTMLTextAreaElement>(null);
  // What the user had typed before a generation's request or the brief helper replaced it; the banner offers it back.
  const [stash, setStash] = useState<{ form: typeof form; from: 'generation' | 'helper' } | null>(null);
  const typed = useRef(false);
  const [leftOpen, setLeftOpen] = usePersisted('studio.left', true);

  useJob(helper, (done) => {
    setHelper(null);
    if (done.status === 'failed') { toast(t('generate.toast.briefHelperFailed')); return; }
    const d = done.result as BriefDraft | undefined;
    if (!d) return;
    if (form.brief.trim() && form.brief !== d.brief) setStash({ form, from: 'helper' });
    typed.current = true;
    setForm((f) => ({ ...f, brief: d.brief, users: d.users, data_objects: d.data_objects.join(', '), style_tags: d.style_tags.join(', '), density: d.density, pages: d.pages, looks: d.looks ?? [], colours: d.colours ?? '' }));
    toast(t('generate.toast.briefFilled'));
  });
  const [shots, setShots] = useState<string[]>([]);
  const pickShots = async (files: FileList | null) => {
    if (!files?.length) return;
    try { setShots(await Promise.all(Array.from(files).slice(0, 5).map(shrink))); } catch (e) { toast((e as Error).message); }
  };
  const expand = async () => {
    try { setHelper(await api.briefHelper(form.describe.trim(), shots)); } catch (e) { toast(t('generate.toast.briefHelperFailedError', { message: (e as Error).message })); }
  };

  const all = [...(hist.data ?? [])].sort((a, b) => b.id.localeCompare(a.id));
  const project = (projects.data ?? []).find((p) => p.id === form.project) ?? null;
  // The current concept: the one in the URL / opened generation, else the project's first.
  const concept = project ? project.concepts.find((c) => c.id === form.concept) ?? project.concepts[0] ?? null : null;
  const shown = all.filter((g) => (g.project_id ?? null) === form.project && (!project || g.concept_id === concept?.id));
  const effMode = concept?.identity != null ? mode : 'look';
  const existingPages = (() => {
    const m = new Map<string, { count: number; newest: string }>();
    for (const g of shown) {
      if (!g.page) continue;
      const e = m.get(g.page) ?? { count: 0, newest: g.id };
      e.count += 1;
      if (g.id > e.newest) e.newest = g.id;
      m.set(g.page, e);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => a.name.localeCompare(b.name));
  })();
  const identityGen = concept ? all.find((g) => g.id === concept.identity) : undefined;
  const suggestedPages = (identityGen?.request?.pages ?? []).filter((p) => !existingPages.some((e) => e.name === p));
  const projectOf = (g: Generation) => (projects.data ?? []).find((p) => p.id === g.project_id) ?? null;
  const conceptOf = (g: Generation) => projectOf(g)?.concepts.find((c) => c.id === g.concept_id) ?? null;
  const newest = all.length ? all.reduce((m, g) => (g.id > m ? g.id : m), all[0].id) : null;
  // While a job runs with nothing selected, no generation is "current": falling back to the newest would drag its project into the form.
  // A just-created generation (Save, edit) is selected before the list reloads: keep showing the previous one meanwhile, or the whole studio blanks for a render.
  const lastGen = useRef<Generation | undefined>(undefined);
  const selectedGen = all.find((g) => g.id === selected) ?? (selected == null && job == null ? all.find((g) => g.id === newest) : selected != null && selected !== 'none' ? lastGen.current : undefined);
  if (selectedGen) lastGen.current = selectedGen;
  const batch = selectedGen?.batch ?? null;
  // Variants: in a project, every try of the same page (or of the look) for the same viewport, newest first like the sidebar; otherwise the batch.
  const pageKey = (g: Generation) => g.page?.trim() ?? '';
  const siblings = !selectedGen ? [] : (selectedGen.project_id != null
    ? all.filter((g) => g.concept_id === selectedGen.concept_id && pageKey(g) === pageKey(selectedGen) && g.target === selectedGen.target)
    : batch != null ? all.filter((g) => g.batch === batch) : []);
  const batchSize = (g: Generation) => (g.batch == null ? 0 : all.filter((x) => x.batch === g.batch).length);
  // Compare pool: in a project, every screen of the concept at the same viewport (a page against the reference look too); otherwise the batch.
  const comparePool = !selectedGen ? [] : selectedGen.project_id != null ? all.filter((g) => g.concept_id === selectedGen.concept_id && g.target === selectedGen.target) : siblings;
  const [compare, setCompare] = usePersisted('compare', false);
  const comparing = compare && comparePool.length > 1;
  // Comparing takes the whole width: both side panels fold to their rail, whose button then leaves compare mode.
  const leftShown = leftOpen && !comparing;

  // The hash mirrors the selection (`#/generate?id=N`, deep-linkable); `#/generate` alone (the wordmark) blanks the screen.
  useEffect(() => {
    const on = () => {
      const q = new URLSearchParams(location.hash.split('?')[1]);
      const id = q.get('id');
      if (id) setSelected(id);
      else if (q.get('job')) { setJob(q.get('job')); setJobProject(q.get('project')); setForm((f) => ({ ...f, project: q.get('project'), concept: q.get('concept') })); setSelected(null); }
      else if (location.hash.startsWith('#/generate')) blank();
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected != null && selected !== 'none' && (location.hash === '' || location.hash.startsWith('#/generate'))) history.replaceState(null, '', `#/generate?id=${selected}${concept ? `&concept=${concept.id}` : ''}`); }, [selected, concept?.id]);
  useEffect(() => {
    if (!selectedGen) return;
    setMode(selectedGen.page ? 'pages' : 'look');
    setForm((f) => ({ ...f, project: selectedGen.project_id ?? null, concept: selectedGen.concept_id ?? null }));
  }, [selectedGen?.id]);

  const j = useJob(job, async (done) => {
    setJob(null);
    refreshStatus();
    if (done.status === 'failed') { toast(`${done.kind === 'refine' ? 'Refine failed' : done.kind === 'edit' ? 'Edit failed' : 'Generation failed'}${done.error ? `: ${done.error}` : ''}`); return; }
    hist.reload();
    projects.reload();
    const ids = done.result?.generation_ids;
    if (ids?.length) setSelected(ids[0]);
  });

  // A new concept of a project is the same app in another style: reuse the brief of a look already made in the project.
  const appBrief = project ? all.find((g) => g.project_id === project.id && !g.page?.trim() && g.request?.brief)?.request?.brief ?? undefined : undefined;
  const follow = (id: string, projectId: string | null) => { setJob(id); setJobProject(projectId); setSelected(null); refreshStatus(); };
  const run = async () => {
    try {
      setStash(null);
      let projectId = form.project;
      let conceptId = concept?.id ?? null;
      if (effMode === 'look' && projectId == null) {
        const name = (form.brief.split('\n')[0] ?? '').trim().slice(0, 40) || 'Untitled';
        const p = await api.createProject(name);
        projects.reload();
        projectId = p.id;
        conceptId = p.concept;
        setForm((f) => ({ ...f, project: p.id, concept: p.concept }));
      }
      const isPages = effMode === 'pages';
      follow(await api.generate({
        brief: form.brief,
        description: isPages ? undefined : (form.describe.trim() || undefined),
        colours: isPages ? undefined : (form.colours.trim() || undefined),
        users: form.users,
        density: form.density,
        data_objects: split(form.data_objects),
        style_tags: split(form.style_tags),
        variants: isPages ? 1 : form.variants,
        seed: isPages ? undefined : (/^\d+$/.test(form.seed) ? Number(form.seed) : undefined),
        archetype: isPages ? undefined : (form.archetype === 'auto' ? undefined : form.archetype),
        concept: conceptId ?? undefined,
        page: isPages ? form.page.trim() : undefined,
        target: form.target,
        pages: form.pages.length ? form.pages : undefined,
        looks: isPages || !form.looks.length ? undefined : form.looks
      }), projectId);
    } catch (e) { toast(t('generate.toast.generateFailed', { message: (e as Error).message })); }
  };
  const refine = async (id: string, action: RefineAction, count: number) => {
    try { follow(await api.refine(id, action, count), all.find((g) => g.id === id)?.project_id ?? null); } catch (e) { toast(t('generate.toast.refineFailed', { message: (e as Error).message })); }
  };
  const edit = async (id: string, body: EditRequest) => {
    try { follow(await api.edit(id, body), all.find((g) => g.id === id)?.project_id ?? null); } catch (e) { toast(t('generate.toast.editFailed', { message: (e as Error).message })); }
  };
  const applyTokens = async (id: string, identity: EditRequest['identity']) => {
    try { const r = await api.tokens(id, identity); hist.reload(); projects.reload(); setSelected(r.id); toast(t('generate.toast.tokensApplied')); } catch (e) { toast(t('generate.toast.editFailed', { message: (e as Error).message })); }
  };
  // Moves a mockup as-is into another concept of the project, then follows it there.
  const moveTo = async (g: Generation, c: Concept) => { try { await api.moveGeneration(g.id, c.id); hist.reload(); projects.reload(); setForm((f) => ({ ...f, concept: c.id })); setMode(c.identity == null && g.page?.trim() ? 'look' : 'pages'); setSelected(g.id); toast(t('generate.toast.moved', { name: c.name })); } catch (e) { toast((e as Error).message); } };
  const alternative = async (id: string, archetype: string) => {
    try { follow(await api.alternative(id, archetype), all.find((g) => g.id === id)?.project_id ?? null); } catch (e) { toast(t('generate.toast.alternativeFailed', { message: (e as Error).message })); }
  };
  const load = (r: Partial<GenerateRequest>, seed?: number, project?: string | null, concept?: string | null) => {
    if (typed.current && form.brief.trim() && form.brief !== (r.brief ?? '')) setStash({ form, from: 'generation' });
    typed.current = false;
    setForm((f) => ({ ...f, brief: r.brief ?? '', describe: r.description ?? '', colours: r.colours ?? '', users: r.users ?? '', data_objects: (r.data_objects ?? []).join(', '), style_tags: (r.style_tags ?? []).join(', '), density: r.density ?? f.density, seed: seed != null ? String(seed) : f.seed, archetype: r.archetype ?? 'auto', project: project === undefined ? f.project : project, concept: concept === undefined ? f.concept : concept, page: r.page ?? '', target: r.target ?? 'desktop', pages: r.pages ?? [], looks: r.looks ?? [] }));
  };
  const blank = () => {
    setStash(null);
    setSelected('none');
    setMode('look');
    setForm((f) => ({ ...f, project: null, concept: null, brief: '', users: '', data_objects: '', style_tags: '', seed: '', archetype: 'auto', page: '', pages: [], looks: [], describe: '', colours: '' }));
  };
  const createProject = async () => {
    const name = (newProject ?? '').trim();
    if (!name) { setNewProject(null); return; }
    try {
      const p = await api.createProject(name);
      projects.reload();
      setForm((f) => ({ ...f, project: p.id, concept: p.concept }));
      setNewProject(null);
      setMode('look');
    } catch (e) { toast(t('generate.toast.createProjectFailed', { message: (e as Error).message })); }
  };
  // Set (or clear) a concept's reference look. Pages already made keep their look: each can be regenerated in the new one.
  const setIdentity = async (c: Concept, generation: string | null) => {
    if (generation != null && c.identity != null && all.some((g) => g.concept_id === c.id && g.page?.trim()) && !(await confirmDialog(t('generate.switchLookConfirm', { name: c.name }), t('result.switchLook'), false))) return false;
    try {
      await api.setIdentity(c.id, generation);
      projects.reload();
      setMode(generation == null ? 'look' : 'pages');
      toast(generation == null ? t('generate.toast.identityCleared', { name: c.name }) : t('generate.toast.identitySet', { generation, name: c.name }));
      return true;
    } catch (e) { toast(t('generate.toast.identityFailed', { message: (e as Error).message })); return false; }
  };
  // "Add a page on this look": the look becomes the concept's reference, then the add-page form opens.
  const [addSignal, setAddSignal] = useState(0);
  const pageOnLook = async (c: Concept, generation: string) => {
    if (c.identity !== generation && !(await setIdentity(c, generation))) return;
    setMode('pages');
    setAddSignal((n) => n + 1);
    setTimeout(() => briefRef.current?.focus(), 0);
  };
  // Open a concept on its reference look (or its newest screen); an empty one shows the look-exploration start.
  const openConcept = (p: Project, c: Concept) => {
    const gid = c.identity ?? all.find((g) => g.concept_id === c.id)?.id;
    setForm((f) => ({ ...f, project: p.id, concept: c.id }));
    setMode(c.identity != null ? 'pages' : 'look');
    setSelected(gid ?? 'none');
  };
  const openProject = (id: string | null) => {
    if (id == null) { blank(); return; }
    const p = (projects.data ?? []).find((x) => x.id === id);
    if (p?.concepts[0]) openConcept(p, p.concepts[0]);
  };
  const newConcept = async () => {
    if (!project) return;
    try {
      const c = await api.createConcept(project.id);
      projects.reload();
      setForm((f) => ({ ...f, concept: c.id }));
      setMode('look');
      setSelected('none');
    } catch (e) { toast((e as Error).message); }
  };
  const renameConcept = async (name: string) => {
    if (!concept) return;
    try { await api.renameConcept(concept.id, name); projects.reload(); } catch (e) { toast((e as Error).message); }
  };
  // Deletes one screen, or every try of its page in this concept and viewport, then shows what is left.
  const removeScreen = async (g: Generation, wholePage: boolean) => {
    const ids = wholePage ? siblings.map((s) => s.id) : [g.id];
    const name = g.page?.trim() || t('projectNav.mainScreen');
    const msg = wholePage ? t('result.deletePageConfirm', { name, n: ids.length }) : t('result.deleteScreenConfirm', { name });
    if (!(await confirmDialog(concept?.identity != null && ids.includes(concept.identity) ? `${msg} ${t('result.deleteReferenceWarn')}` : msg, t('gallery.delete')))) return;
    try {
      await api.deleteGenerations(ids);
      const next = siblings.find((s) => !ids.includes(s.id))?.id ?? (concept?.identity != null && !ids.includes(concept.identity) ? concept.identity : null);
      lastGen.current = undefined;
      setSelected(next ?? 'none');
      hist.reload();
      projects.reload();
    } catch (e) { toast((e as Error).message); }
  };
  const deleteConcept = async () => {
    if (!project || !concept || !(await confirmDialog(t('generate.deleteConceptConfirm', { name: concept.name }), t('gallery.delete')))) return;
    try {
      await api.deleteConcept(concept.id);
      projects.reload();
      hist.reload();
      const next = project.concepts.find((c) => c.id !== concept.id);
      if (next) openConcept(project, next);
    } catch (e) { toast((e as Error).message); }
  };
  const addPage = async (name: string, brief: string, target: 'desktop' | 'mobile') => {
    if (!project || concept?.identity == null) return false;
    try {
      const r = (await api.generation(concept.identity)).request ?? {};
      follow(await api.generate({ brief, users: r.users ?? '', density: r.density ?? 'comfortable', data_objects: r.data_objects ?? [], style_tags: r.style_tags ?? [], variants: 1, concept: concept.id, page: name, target }), project.id);
      return true;
    } catch (e) { toast(`Generate failed: ${(e as Error).message}`); return false; }
  };
  const counterpart = selectedGen ? all.find((x) => x.id !== selectedGen.id && x.concept_id != null && x.concept_id === selectedGen.concept_id && (x.page?.trim() || t('projectNav.mainScreen')) === (selectedGen.page?.trim() || t('projectNav.mainScreen')) && (x.target ?? 'desktop') !== (selectedGen.target ?? 'desktop')) ?? null : null;
  const onMakeCounterpart = concept?.identity != null && selectedGen && selectedGen.concept_id === concept.id ? () => void addPage(selectedGen.page?.trim() || t('projectNav.mainScreen'), selectedGen.request?.brief ?? selectedGen.brief ?? '', (selectedGen.target ?? 'desktop') === 'mobile' ? 'desktop' : 'mobile') : null;
  const set = (k: 'brief' | 'users' | 'data_objects' | 'style_tags' | 'seed' | 'page' | 'describe' | 'colours') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    typed.current = true;
    setForm({ ...form, [k]: e.target.value });
  };
  const restore = () => {
    if (!stash) return;
    setForm((f) => ({ ...stash.form, project: f.project, concept: f.concept }));
    setStash(null);
    typed.current = true;
  };

  const bar = project && concept ? <ProjectBar projects={projects.data ?? []} project={project} concept={concept} addSignal={addSignal} generations={shown} selected={selectedGen?.id ?? null} busy={job != null} archetypes={archetypes.data ?? []} onProject={openProject} onConcept={(id) => openConcept(project, project.concepts.find((c) => c.id === id)!)} onNewConcept={newConcept} onRenameConcept={renameConcept} onDeleteConcept={deleteConcept} onSelect={setSelected} onAddPage={addPage} onAlternative={alternative} makeOther={selectedGen && !counterpart ? { mobile: (selectedGen.target ?? 'desktop') === 'mobile', run: onMakeCounterpart } : null} /> : undefined;

  const banners = (
    <>
      {stash && (
        <div role="status" className="flex items-center gap-3 border-b border-line bg-raised px-5 py-2 text-[12px]">
          <span className="min-w-0 flex-1 text-ink-2">{t(stash.from === 'helper' ? 'generate.stash.helper' : 'generate.stash.generation')}</span>
          <Button primary className="h-7 shrink-0" onClick={restore}>{t('generate.stash.restore')}</Button>
        </div>
      )}
      {job != null && selected != null && (
        <button onClick={() => { setForm((f) => ({ ...f, project: jobProject, concept: jobProject === f.project ? f.concept : null })); setSelected(null); }} className="flex items-center gap-2 border-b border-line bg-raised px-5 py-2.5 text-left text-[13px] text-ink-2 hover:text-ink">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
          <span className="truncate">{t('generate.sidebar.generatingIn')} <b className="text-ink">{(projects.data ?? []).find((p) => p.id === jobProject)?.name ?? t('generate.sidebar.newProject')}</b></span>
          <span className="ml-auto shrink-0 text-accent">{t('generate.sidebar.view')}</span>
        </button>
      )}
      {project?.archived && (
        <div className="flex items-center gap-2 border-b border-line bg-raised px-5 py-2.5 text-[13px] text-ink-2">
          <Archive size={14} className="text-ink-3" />
          <span className="flex-1">{t('generate.archivedBanner')}</span>
          <button className="font-medium text-accent hover:underline" onClick={async () => { try { await api.archiveProject(project.id, false); projects.reload(); } catch (e) { toast((e as Error).message); } }}>{t('generate.unarchive')}</button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col divide-y divide-line overflow-y-auto lg:flex-row lg:divide-x lg:divide-y-0 lg:overflow-hidden">
      {(me.admin || !project) && (
      <aside className={`flex w-full shrink-0 flex-col bg-canvas ${leftShown ? 'lg:w-[300px] xl:w-[380px]' : 'lg:w-11'}`}>
        {!leftShown && <button onClick={() => (comparing ? setCompare(false) : setLeftOpen(true))} aria-label={t('generate.panel.expand')} title={t('generate.panel.expand')} className="hidden h-10 w-full items-center justify-center border-b border-line text-accent hover:bg-accent/10 lg:flex"><PanelLeftOpen size={18} /></button>}
        <div className={`flex min-h-0 flex-1 flex-col ${leftShown ? '' : 'lg:hidden'}`}>
        <button onClick={() => setLeftOpen(false)} aria-label={t('generate.panel.collapse')} title={t('generate.panel.collapse')} className="hidden h-8 shrink-0 items-center justify-end gap-1.5 border-b border-line px-3 text-[12px] font-medium text-accent hover:bg-accent/10 lg:flex"><PanelLeftClose size={16} /></button>
        {banners}
        {!me.admin ? (
          <ProjectNav projects={projects.data ?? []} project={project} onProject={openProject} />
        ) : (<>
        <div className="flex flex-col gap-2.5 overflow-y-auto [&>*]:shrink-0 border-b border-line p-5">
          <Label className="mb-0 flex items-center">{t('generate.form.project')}<button onClick={blank} disabled={selected === 'none' && form.project == null} title={t('generate.form.newProjectTitle')} className={`ml-auto ${linkCls}`}>{t('generate.ui.new')}</button></Label>
          {newProject == null ? (
            <select
              value={form.project ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'new') { setNewProject(''); return; }
                const id = v === '' ? null : v;
                const p = id == null ? null : (projects.data ?? []).find((x) => x.id === id);
                setForm((f) => ({ ...f, project: id, concept: p?.concepts[0]?.id ?? null }));
                setMode(p?.concepts[0]?.identity != null ? 'pages' : 'look');
              }}
              aria-label={t('generate.form.project')}
              className={inputCls}
            >
              <option value="">{t('generate.form.newProjectFromBrief')}</option>
              {(projects.data ?? []).filter((p) => !p.archived || p.id === form.project).map((p) => <option key={p.id} value={p.id}>{p.archived ? `${p.name} · ${t('generate.archived')}` : p.name} · {p.generations}</option>)}
              <option value="new">{t('generate.form.newProjectEllipsis')}</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input autoFocus value={newProject} onChange={(e) => setNewProject(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setNewProject(null); else if (e.key === 'Enter') createProject(); }} placeholder={t('generate.form.projectName')} aria-label={t('generate.form.newProjectName')} className={`${inputCls} flex-1`} />
              <Button onClick={createProject}>{t('generate.form.create')}</Button>
            </div>
          )}
          {project && concept && (
            <NameSelect label={t('projectNav.concept')} name={concept.name} value={concept.id} onChange={(v) => (v === '__new' ? void newConcept() : openConcept(project, project.concepts.find((c) => c.id === v)!))} onRename={renameConcept} onDelete={project.concepts.length > 1 ? deleteConcept : undefined}>
              {project.concepts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new">{t('projectNav.newConcept')}</option>
            </NameSelect>
          )}
          {concept?.identity != null && (
            <Segmented label={t('generate.form.mode')} value={mode} onChange={(m) => setMode(m)} options={[{ value: 'pages' as const, label: t('generate.form.pages') }, { value: 'look' as const, label: t('generate.form.look') }]} />
          )}
          {effMode === 'look' && (
            <>
              <Label className="mb-0 mt-1">{t('generate.form.exploreLook')}</Label>
              <p className="text-[12px] text-ink-3">{t('generate.form.exploreLookHint')}</p>
              <Label className="mb-0 mt-1">{t('generate.form.describe')}</Label>
              <div className="flex gap-2">
                <textarea rows={2} value={form.describe} onChange={set('describe')} maxLength={2000} placeholder={t('generate.form.quickDescriptionPlaceholder')} aria-label={t('generate.form.quickDescription')} className={`${areaCls} flex-1`} />
                <Button onClick={expand} disabled={!(form.describe.trim() || shots.length > 0) || helper != null} title={t('generate.form.expandTitle')}><Sparkles size={16} /> {helper != null ? t('generate.form.expanding') : t('generate.form.expand')}</Button>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <label title={t('generate.form.fromShotsTitle')} className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-line-strong px-2.5 text-ink-2 hover:border-accent hover:text-accent">
                  <ImagePlus size={14} /> {t('generate.form.fromShots')}
                  <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { pickShots(e.target.files); e.target.value = ''; }} />
                </label>
                {shots.map((src, i) => <img key={i} src={src} alt="" className="h-7 w-10 rounded-sm border border-line object-cover" />)}
                {shots.length > 0 && <button onClick={() => setShots([])} className={linkCls}>{t('generate.form.clearShots')}</button>}
              </div>
              <Label className="mb-0 mt-1">{t('generate.form.brief')}</Label>
              <textarea rows={10} value={form.brief} onChange={set('brief')} placeholder={t('generate.form.projectBriefPlaceholder')} aria-label={t('generate.form.brief')} className={areaCls} />
              <input value={form.users} onChange={set('users')} placeholder={t('generate.form.users')} aria-label={t('generate.form.users')} className={inputCls} />
              <textarea rows={3} value={form.data_objects} onChange={set('data_objects')} placeholder={t('generate.form.dataObjectsPlaceholder')} aria-label={t('generate.form.dataObjects')} className={areaCls} />
              {<StyleTags value={form.style_tags} onChange={(style_tags) => setForm({ ...form, style_tags })} />}
              <input value={form.colours} onChange={set('colours')} maxLength={200} placeholder={t('generate.form.coloursPlaceholder')} aria-label={t('generate.form.colours')} className={inputCls} />
              {form.pages.length > 0 && <p className="text-[12px] text-ink-3">{t('generate.form.pagesList')} · {form.pages.join(' · ')}</p>}
              <div className="flex gap-2">
                <div className="flex-[3]"><Segmented label={t('generate.form.density')} value={form.density} onChange={(density) => setForm({ ...form, density })} options={['compact', 'comfortable', 'spacious'].map((value) => ({ value }))} /></div>
                <div className="flex-1"><Segmented label={t('generate.form.variants')} value={form.variants} onChange={(variants) => setForm({ ...form, variants })} options={[1, 2, 3].map((value) => ({ value, title: value > 1 ? t('generate.form.variantsTitle') : undefined }))} /></div>
              </div>
              <Label className="mb-0 mt-1">{t('generate.form.target')}</Label>
              <Segmented label={t('generate.form.target')} value={form.target} onChange={(target) => setForm({ ...form, target: target as 'desktop' | 'mobile' | 'both' })} options={[{ value: 'desktop' as const, label: <Monitor size={12} />, title: t('generate.form.desktopTitle') }, { value: 'mobile' as const, label: <Smartphone size={12} />, title: t('generate.form.phoneTitle') }, { value: 'both' as const, label: t('generate.form.both'), title: t('generate.form.bothTitle') }]} />
              <Label className="mb-0 mt-1">{t('generate.form.archetype')}</Label>
              <div className="grid grid-cols-3 gap-1">
                {[{ id: 'auto', name: t('generate.form.seeded'), feel: t('generate.form.seededFeel') }, ...(archetypes.data ?? [])].map((a) => (
                  <button key={a.id} title={look(a).desc} aria-pressed={form.archetype === a.id} onClick={() => setForm({ ...form, archetype: a.id })}
                    className={`h-8 truncate rounded-sm border px-1 text-[12px] ${form.archetype === a.id ? 'border-accent bg-raised text-accent' : 'border-line text-ink-2 hover:text-ink'}`}>{look(a).name}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={form.seed} onChange={set('seed')} inputMode="numeric" placeholder="seed · empty = random" title="Same seed = same theme, accent and font" aria-label="Seed" className={`${inputCls} font-mono`} />
                <Button onClick={() => setForm({ ...form, seed: '' })} disabled={!form.seed}>clear</Button>
              </div>
              <Button primary className="w-full" disabled={!form.brief.trim() || job != null} onClick={run}>{job != null ? t('generate.form.generating') : t('generate.form.generate')}</Button>
            </>
          )}
          {effMode === 'pages' && concept && (
            <>
              <Label className="mb-0 mt-1">{t('generate.form.pagesSection')}</Label>
              <p className="text-[12px] text-ink-3">{t('generate.form.pagesHint', { id: concept.identity ?? '' })}</p>
              {(existingPages.length > 0 || suggestedPages.length > 0) && (
                <div className="flex flex-col gap-1">
                  {existingPages.map((p) => (
                    <button key={p.name} onClick={() => { setMode('pages'); setSelected(p.newest); }} className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-left hover:border-line-strong hover:bg-raised">
                      <span className="text-[12px] text-ink">{p.name}</span>
                      <span className="ml-auto text-[12px] text-ink-3">{p.count}</span>
                    </button>
                  ))}
                  {suggestedPages.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {suggestedPages.map((name) => (
                        <button key={name} onClick={() => { setForm((f) => ({ ...f, page: name })); briefRef.current?.focus(); }} className="h-7 rounded-full border border-line px-2.5 text-[12px] text-ink-2 hover:border-line-strong hover:text-ink">+ {name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <Label className="mb-0 mt-1">{t('generate.form.newPage')}</Label>
              <input value={form.page} onChange={set('page')} list="page-names" placeholder={t('generate.form.pageNamePlaceholder')} aria-label={t('generate.form.page')} className={inputCls} />
              <datalist id="page-names">{suggestedPages.map((p) => <option key={p} value={p} />)}</datalist>
              <textarea ref={briefRef} rows={6} value={form.brief} onChange={set('brief')} placeholder={t('generate.form.pageBriefPlaceholder')} aria-label={t('generate.form.brief')} className={areaCls} />
              <textarea rows={3} value={form.data_objects} onChange={set('data_objects')} placeholder={t('generate.form.dataObjectsPlaceholder')} aria-label={t('generate.form.dataObjects')} className={areaCls} />
              <div className="flex gap-2">
                <div className="flex-1"><Segmented label={t('generate.form.density')} value={form.density} onChange={(density) => setForm({ ...form, density })} options={['compact', 'comfortable', 'spacious'].map((value) => ({ value }))} /></div>
              </div>
              <Label className="mb-0 mt-1">{t('generate.form.target')}</Label>
              <Segmented label={t('generate.form.target')} value={form.target} onChange={(target) => setForm({ ...form, target: target as 'desktop' | 'mobile' | 'both' })} options={[{ value: 'desktop' as const, label: <Monitor size={12} />, title: t('generate.form.desktopTitle') }, { value: 'mobile' as const, label: <Smartphone size={12} />, title: t('generate.form.phoneTitle') }, { value: 'both' as const, label: t('generate.form.both'), title: t('generate.form.bothTitle') }]} />
              <Button primary className="w-full" disabled={!form.page.trim() || !form.brief.trim() || job != null} onClick={run}>{job != null ? t('generate.form.generating') : t('generate.form.generatePage')}</Button>
            </>
          )}
        </div>
        <Label className="mb-0 flex h-10 shrink-0 items-center border-b border-line px-5">{t('generate.sidebar.screens')} <span className="ml-1.5 font-normal text-ink-3">{shown.length}</span><button onClick={blank} disabled={selected === 'none'} title={t('generate.sidebar.newTitle')} className={`ml-auto ${linkCls}`}>{t('generate.ui.new')}</button></Label>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {hist.error && <ErrorRow message={hist.error} onRetry={hist.reload} />}
          {hist.loading && !hist.data && <SkeletonRows n={5} />}
          {hist.data && shown.length === 0 && <p className="p-3 text-[13px] text-ink-3">{hist.data.length ? t('generate.sidebar.noGenerationsInProject') : t('generate.sidebar.noGenerations')}</p>}
          {shown.map((g) => {
            const arch = asNotes(g.notes).direction?.archetype?.name;
            const grouped = batchSize(g) > 1;
            return (
              <button key={g.id} onClick={() => { setMode(g.page ? 'pages' : 'look'); setForm((f) => ({ ...f, project: g.project_id ?? null, concept: g.concept_id ?? null })); setSelected(g.id); }}
                className={`flex h-9 w-full items-center gap-2 px-5 text-left text-[13px] ${selectedGen?.id === g.id ? rowCls(true) : grouped ? 'border-l-2 border-line-strong hover:bg-raised/60' : rowCls(false)}`}>
                {<span className="text-ink-3">#{shortId(g.id)}</span>}
                {g.page && <span className="shrink-0 rounded-full border border-line px-2 text-[12px] text-ink-3">{g.page}</span>}
                {g.target === 'mobile' && <Smartphone size={12} className="shrink-0 text-ink-3" aria-label={t('generate.sidebar.mobile')} />}
                {conceptOf(g)?.identity === g.id && <Fingerprint size={12} className="shrink-0 text-accent" aria-label={t('generate.sidebar.projectIdentity')} />}
                <span className="truncate">{g.label ?? (g.brief || g.created_at)}</span>
                {arch && <span className="ml-auto shrink-0 text-[12px] text-ink-2">{arch}</span>}
                {(g.detect_count ?? 0) > 0 && <span title={t('generate.sidebar.finishIssues')} className={`${arch ? '' : 'ml-auto'} text-[12px] text-ink-3`}>{g.detect_count}</span>}
                {g.verdict && <Dot status={g.verdict} />}
              </button>
            );
          })}
        </div>
        </>)}
        </div>
      </aside>)}
      {job != null && selected == null ? (
        <Running job={j} key={job} />
      ) : selectedGen ? (
        <Result id={selectedGen.id} counterpart={counterpart} onMakeCounterpart={onMakeCounterpart} onVerdict={hist.reload} siblings={siblings} comparePool={comparePool} compare={compare} comparing={comparing} setCompare={setCompare} onSelect={setSelected} onLoad={load} archetypes={archetypes.data ?? []} onAlternative={alternative} onRefine={refine} onEdit={edit} onTokens={applyTokens} busy={job != null} project={projectOf(selectedGen)} concept={conceptOf(selectedGen)} onIdentity={setIdentity} onPageOnLook={pageOnLook}
          onDelete={(g, wholePage) => void removeScreen(g, wholePage)}
          onRegenerate={(g) => void addPage(g.page?.trim() || t('projectNav.mainScreen'), g.request?.brief ?? g.brief ?? '', g.target === 'mobile' ? 'mobile' : 'desktop')}
          onMove={moveTo}
          nav={!me.admin && project ? bar : undefined}
          top={!me.admin && project ? banners : undefined} />
      ) : !me.admin && project && concept ? (
        <div className="flex min-w-0 flex-1 flex-col">
          {banners}
          <div className="flex h-12 shrink-0 items-center border-b border-line bg-canvas px-4">{bar}</div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-2xl">
              {concept.identity == null ? (
                <>
                  <h2 className="mb-1 text-[16px] font-semibold text-ink">{t('generate.concept.startTitle', { name: concept.name })}</h2>
                  <p className="mb-4 text-[13px] text-ink-2">{t(appBrief ? 'generate.concept.startHintSameApp' : 'generate.concept.startHint')}</p>
                  <PromptBox key={concept.id} fixed={{ project: project.id, concept: concept.id }} initialText={appBrief} />
                </>
              ) : (
                <p className="text-center text-[13px] text-ink-2">{t('generate.empty.hint')}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 flex-1 place-items-center dots">
          <div className="max-w-md rounded-lg border border-line bg-surface px-8 py-6 text-center shadow-soft">
            <div className="mb-2 text-[16px] font-semibold text-ink">{t('generate.empty.title')}</div>
            <p className="text-[13px] text-ink-2">{t('generate.empty.hint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const tagGet = (tags: string, key: string): string | null => tags.split(',').map((t) => t.trim()).find((t) => t.startsWith(`${key}:`))?.slice(key.length + 1).trim() ?? null;
const tagSet = (tags: string, key: string, value: string | null): string => tags.split(',').map((t) => t.trim()).filter((t) => t && !t.startsWith(`${key}:`)).concat(value === null ? [] : [`${key}:${value}`]).join(', ');
// A control with its visible label above.
const field = (label: string, control: ReactNode) => <div className="flex flex-col gap-1"><span className="text-[12px] text-ink-3">{label}</span>{control}</div>;
const TAG_KEYS = ['kind', 'theme', 'tone', 'decoration', 'accent'];
// One Segmented per key; 'auto' = tag absent. Unknown tags (older briefs) are kept and shown read-only.
function StyleTags({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const extra = value.split(',').map((t) => t.trim()).filter((t) => t && !TAG_KEYS.includes(t.split(':')[0]));
  const labelFor = (key: string) => ({ kind: t('generate.styleTags.kind'), theme: t('generate.styleTags.theme'), tone: t('generate.styleTags.tone'), decoration: t('generate.styleTags.decoration'), accent: t('generate.styleTags.accent') } as Record<string, string>)[key] ?? key[0].toUpperCase() + key.slice(1);
  const row = (key: string, options: { value: string; title?: string }[], fallback: string) => (
    field(labelFor(key), <div><Segmented label={key} value={tagGet(value, key) ?? fallback} onChange={(v) => onChange(tagSet(value, key, v === 'auto' ? null : v))} options={options} /></div>)
  );
  const opts = (...vs: string[]) => vs.map((v) => ({ value: v }));
  return (
    <div className="flex flex-col gap-2" aria-label={t('generate.styleTags.label')}>
      {row('kind', [{ value: 'business', title: t('generate.styleTags.kindBusiness') }, { value: 'consumer', title: t('generate.styleTags.kindConsumer') }, { value: 'game', title: t('generate.styleTags.kindGame') }], 'business')}
      {row('theme', opts('auto', 'light', 'dark'), 'auto')}
      {row('tone', opts('auto', 'serious', 'neutral', 'playful'), 'auto')}
      {row('decoration', [...opts('auto', 'none', 'light'), { value: 'rich', title: t('generate.styleTags.decorationRich') }], 'auto')}
      {row('accent', opts('auto', 'neon', 'warm', 'cool', 'pastel', 'primaries'), 'auto')}
      {extra.length > 0 && <span className="text-[12px] text-ink-3">{extra.join(', ')}</span>}
    </div>
  );
}

function Result({ id, counterpart, onMakeCounterpart, onVerdict, siblings, comparePool, compare, comparing, setCompare, onSelect, onLoad, archetypes, onAlternative, onRefine, onEdit, onTokens, busy, project, concept, onIdentity, onPageOnLook, onRegenerate, onMove, onDelete, nav, top }: { id: string; counterpart: Generation | null; onMakeCounterpart: (() => void) | null; onVerdict: () => void; siblings: Generation[]; comparePool: Generation[]; compare: boolean; comparing: boolean; setCompare: (v: boolean) => void; onSelect: (id: string) => void; onLoad: (r: Partial<GenerateRequest>, seed?: number, project?: string | null, concept?: string | null) => void; archetypes: Archetype[]; onAlternative: (id: string, archetype: string) => void; onRefine: (id: string, action: RefineAction, count: number) => void; onEdit: (id: string, body: EditRequest) => void; onTokens: (id: string, identity: EditRequest['identity']) => void; busy: boolean; project: Project | null; concept: Concept | null; onIdentity: (c: Concept, generation: string | null) => Promise<boolean>; onPageOnLook: (c: Concept, generation: string) => void; onRegenerate: (g: Generation) => void; onMove: (g: Generation, c: Concept) => void; onDelete: (g: Generation, wholePage: boolean) => void; nav?: ReactNode; top?: ReactNode }) {
  // Other concepts of the project: a mockup can be moved there as-is.
  const moveTargets = (project?.concepts ?? []).filter((c) => c.id !== concept?.id);
  const [moveOpen, setMoveOpen] = useState(false);
  const { me } = useApp();
  const d = useAsync(() => api.generation(id), [id]);
  const [wide, setWide] = useState(concept?.identity == null);
  const [pair, setPair] = useState<string[]>([]);
  const shownSiblings = comparing ? comparePool : siblings;
  // Seed the pair when compare turns on (hooks stay above the early returns below).
  useEffect(() => {
    const cur = d.data?.id;
    if (comparing && pair.length === 0 && cur) setPair([cur, ...shownSiblings.map((s) => s.id).filter((sid) => sid !== cur)].slice(0, 2));
  }, [comparing, d.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- seed only when compare turns on or the data arrives
  const [preview, setPreview] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const post = () => frame.current?.contentWindow?.postMessage({ studioTokens: preview }, '*');
  useEffect(post, [preview]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPreview(''), [id]);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useDismiss<HTMLDivElement>(moreOpen, () => setMoreOpen(false));
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => { if (concept?.identity != null) setWide(false); }, [concept?.identity]);
  useEffect(() => { strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [siblings.length, id]);
  const [siblingHtml, setSiblingHtml] = useState<Record<string, string>>({});
  const siblingIds = shownSiblings.map((s) => s.id).join(',');
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [d.data]);

  useEffect(() => {
    if (shownSiblings.length <= 1) return;
    const missing = shownSiblings.filter((s) => siblingHtml[s.id] == null);
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (s) => {
        const data = await api.generation(s.id);
        return [s.id, data.html ?? ''] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      setSiblingHtml((prev) => {
        const next = { ...prev };
        for (const [sid, html] of entries) next[sid] = html;
        return next;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [siblingIds, siblingHtml]);

  if (d.error) return <div className="flex-1"><ErrorRow message={d.error} onRetry={d.reload} /></div>;
  if (!d.data) return <div className="flex-1"><SkeletonRows n={4} h="h-24" /></div>;
  const g = d.data;
  const mobile = g.target === 'mobile';
  const w = mobile ? 390 : 1440;
  const scale = boxW ? Math.min(1, boxW / w) : 1;
  // The iframe shows its own background while a new srcDoc loads: use the mockup's canvas, not white, so switching screens does not flash.
  const canvas = [asNotes(g.notes).direction?.identity?.canvas].find((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c));
  // Compare mode shows exactly two variants: the picked pair, filled with the current one then the first siblings.
  const pairIds = pair.filter((p) => shownSiblings.some((s) => s.id === p)).slice(0, 2);
  // Click a picked thumbnail to drop it; click another to add it, replacing the older pick when two are picked.
  const togglePair = (sid: string) => setPair(pairIds.includes(sid) ? pairIds.filter((p) => p !== sid) : [...pairIds, sid].slice(-2));

  return (
    <>
      <section className="flex h-[75vh] min-w-0 shrink-0 flex-col lg:h-auto lg:flex-1 lg:shrink">
        {top}
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4">
          {nav ? <div className="min-w-0 flex-1">{nav}</div> : (
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{g.page?.trim() || t('projectNav.mainScreen')}{me.admin && <span className="ml-2 font-normal text-ink-3">{g.label ?? (g.notes as { direction?: { label?: string } } | null)?.direction?.label ?? `#${shortId(g.id)}`}</span>}</span>
          )}
          <HelpButton section="rework" className="shrink-0" />
          {comparePool.length > 1 && (
            <Button className="h-8" primary={compare} aria-pressed={compare} onClick={() => setCompare(!compare)} title={t('result.compareSide')}><Columns3 size={16} /> {t('result.compareSide')}</Button>
          )}
          {counterpart && (
            <button onClick={() => onSelect(counterpart.id)} className="inline-flex h-8 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-[12px] font-medium text-ink hover:border-accent hover:text-accent">
              {mobile ? <Monitor size={14} /> : <Smartphone size={14} />} {t(mobile ? 'result.seeDesktop' : 'result.seeMobile')}
            </button>
          )}
          {/* Split button: Pack, and the screen's other actions under the arrow. */}
          <div ref={moreRef} className="relative flex shrink-0">
          <Button className="h-8 rounded-r-none" primary={!(concept && concept.identity == null)} onClick={() => { location.href = concept?.identity != null ? `/api/concepts/${concept.id}/pack.zip` : `/api/generations/${g.id}/pack.zip`; }} disabled={busy || !g.html}
            title={`${t('result.exportHintStart')} ${t('result.uiPack')} ${t('result.exportHintMiddle', { extra: concept?.identity != null ? t('result.exportHintLookExtra') : '' })} ${t('result.skillsPath')} ${t('result.exportHintEnd')}`}><Download size={16} /> {t('result.downloadPackShort')}</Button>
            <Button className={`h-8 w-8 rounded-l-none !px-0 ${concept && concept.identity == null ? 'border-l-0' : 'border-l-accent-ink/30'}`} primary={!(concept && concept.identity == null)} onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} aria-label={t('result.more')} title={t('result.more')}><ChevronDown size={16} /></Button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 flex w-64 flex-col rounded-lg border border-line bg-surface p-1 shadow-soft" onClick={() => setMoreOpen(false)}>
                <button className={menuItemCls} disabled={busy || !g.html} onClick={() => setShareOpen(true)}><Share2 size={14} /> {t('share.open')}</button>
                <button className={menuItemCls} disabled={busy || !g.html} onClick={() => { location.href = `/api/generations/${g.id}/showcase.png`; }} title={t('result.showcaseTitle')}><ImageDown size={14} /> {t('result.showcase')}</button>
                {g.page?.trim() && siblings.length > 1 && <span className="my-1 h-px bg-line" />}
                {g.page?.trim() && siblings.length > 1 && <button className={`${menuItemCls} text-bad`} disabled={busy} onClick={() => onDelete(g, true)} title={t('result.deletePageTitle', { n: siblings.length })}><Trash2 size={14} /> {t('result.deletePage')}</button>}
                {me.admin && <span className="px-2 pb-1 pt-2 text-[11px] text-ink-3" title={t('result.modelSkillVersion')}>{g.model} · {g.skill_version?.slice(0, 8)}</span>}
              </div>
            )}
          </div>
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} g={g} project={project} concept={concept} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {shownSiblings.length > 1 && (
          <aside className={`shrink-0 border-b border-line bg-canvas lg:flex lg:flex-col lg:border-b-0 lg:border-r ${wide ? 'lg:w-[220px]' : 'lg:w-[96px]'}`}>
            <div className="flex h-10 shrink-0 items-center gap-2 px-3">
              {wide && <span className={`${labelCls} truncate`} title={g.page?.trim() || t('projectNav.mainScreen')}>{comparing ? t('result.pickTwo') : `${t('result.compare')} · ${g.page?.trim() || t('projectNav.mainScreen')}`}</span>}
              <span className="rounded-full bg-accent/10 px-2 text-[12px] font-semibold text-accent">{shownSiblings.length}</span>
              <button onClick={() => setWide(!wide)} aria-label={t(wide ? 'result.hideLabels' : 'result.showLabels')} title={t(wide ? 'result.hideLabels' : 'result.showLabels')} className="ml-auto grid h-7 w-7 place-items-center rounded-md text-accent hover:bg-accent/10">{wide ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}</button>
            </div>
            <div ref={strip} className="flex gap-3 overflow-x-auto px-3 pb-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
              {shownSiblings.map((s) => {
                const html = siblingHtml[s.id] ?? (s.id === g.id ? g.html : '');
                const current = comparing ? pairIds.includes(s.id) : s.id === g.id;
                const sc = wide ? 0.125 : 62 / 1440;
                const thumbW = wide ? 180 : 62;
                return (
                  <button
                    key={s.id}
                    onClick={() => (comparing ? togglePair(s.id) : onSelect(s.id))}
                    aria-current={current}
                    title={comparing ? t(pairIds.includes(s.id) ? 'result.removeFromCompare' : 'result.addToCompare') : s.label ?? `#${shortId(s.id)}`}
                    className={`${wide ? 'w-[196px] p-1.5' : 'w-[72px] p-1'} shrink-0 rounded-lg border-2 bg-surface text-left transition ${current ? 'border-accent ring-4 ring-accent/15 shadow-soft' : 'border-line hover:border-accent/50 hover:shadow-soft'}`}
                  >
                    <div className={`relative ${wide ? 'h-[104px] w-[180px]' : 'h-[40px] w-[62px]'} overflow-hidden rounded-md border border-line bg-white`}>
                      {html && (
                        <iframe title={s.label ?? `#${shortId(s.id)}`} srcDoc={previewDoc(html)} sandbox="allow-scripts"
                          className={thumbCls(s.target === 'mobile')} style={{ transform: `scale(${sc})`, marginLeft: s.target === 'mobile' ? (thumbW - 390 * sc) / 2 : undefined }} />
                      )}
                      {wide ? (
                        <>
                          {concept?.identity === s.id && (
                            <span title={t('result.conceptReference')} className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-ok px-1.5 py-0.5 text-[10px] font-semibold text-canvas shadow-soft">
                              <Fingerprint size={10} />
                              {t('result.conceptReference')}
                            </span>
                          )}
                          {current && (
                            <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink shadow-accent">
                              {comparing ? <Columns3 size={10} /> : <Check size={10} />}
                              {comparing ? pairIds.indexOf(s.id) + 1 : t('result.viewing')}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {concept?.identity === s.id && <span className="absolute left-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-ok text-canvas"><Fingerprint size={10} /></span>}
                          {current && <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-accent-ink">{comparing ? <Columns3 size={10} /> : <Check size={10} />}</span>}
                        </>
                      )}
                    </div>
                    {wide && (
                      <div className="mt-1.5 flex items-center gap-2 px-0.5 text-[12px]">
                        <span className={`truncate font-medium ${current ? 'text-accent' : 'text-ink'}`}>{comparing && (s.page?.trim() ?? '') !== (g.page?.trim() ?? '') ? s.page?.trim() || t('projectNav.mainScreen') : s.page?.trim() ? t('result.tryN', { n: shownSiblings.length - shownSiblings.indexOf(s) }) : s.label ?? `#${shortId(s.id)}`}</span>
                        {me.admin && <span title={t('generate.sidebar.finishIssues')} className="ml-auto text-[12px] text-ink-3">{s.detect_count ?? 0}</span>}
                        {me.admin && s.verdict && <Dot status={s.verdict} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        )}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Floating actions, bottom-right. A look variant becomes the concept reference when a page is added on it. */}
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-3">
          {concept?.identity === g.id && (
            <FloatPill icon={<Fingerprint size={20} />} label={<>{t('result.conceptReference')} <X size={16} /></>} title={t('result.unvalidate')} className="bg-ok text-canvas shadow-soft ring-ok/20"
              onClick={async () => { if (await confirmDialog(t('result.unvalidateConfirm'), t('result.unvalidate'), false)) onIdentity(concept, null); }} />
          )}
          {!busy && concept && !g.page && concept.identity !== g.id && (concept.identity != null || (!counterpart && !onMakeCounterpart)) && (
            <FloatPill icon={<Check size={20} strokeWidth={2.5} />} label={t('result.addPageOnLook')} title={t('result.addPageOnLookTitle')} onClick={() => onPageOnLook(concept, g.id)} />
          )}
          {!busy && concept && g.page && concept.identity != null && g.request?.identity != null && String(g.request.identity) !== concept.identity && (
            <FloatPill icon={<Sparkles size={20} />} label={t('result.regenerate')} title={t('result.regenerateTitle')} onClick={() => onRegenerate(g)} />
          )}
          {!busy && moveTargets.length > 0 && (
            <div className="relative">
              {moveOpen && (
                <div className="absolute bottom-14 right-0 flex min-w-48 flex-col rounded-lg border border-line bg-surface p-1 shadow-soft">
                  <span className="px-3 py-1.5 text-[12px] text-ink-3">{t('result.moveToConcept')}</span>
                  {moveTargets.map((c) => (
                    <button key={c.id} onClick={() => { setMoveOpen(false); onMove(g, c); }} className="rounded-md px-3 py-2 text-left text-[13px] text-ink hover:bg-accent hover:text-accent-ink">{c.name}</button>
                  ))}
                </div>
              )}
              <FloatPill icon={<FolderInput size={20} />} label={t('result.moveToConcept')} title={t('result.moveToConceptTitle')} onClick={() => setMoveOpen((o) => !o)} />
            </div>
          )}
        </div>
        {g.html && <button onClick={() => void box.current?.requestFullscreen()} aria-label={t('result.fullscreen')} title={t('result.fullscreen')} className={`absolute right-6 top-6 z-10 grid h-11 w-11 place-items-center rounded-full border border-line bg-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-surface))] text-ink-2 shadow-soft opacity-65 transition hover:text-ink hover:opacity-100 focus-visible:opacity-100`}><Maximize2 size={18} /></button>}
        <button onClick={() => onDelete(g, false)} disabled={busy} aria-label={t('result.deleteScreen')} title={t('result.deleteScreen')} className={`absolute bottom-6 left-6 z-10 grid h-11 w-11 place-items-center rounded-full border border-bad/40 bg-surface text-bad shadow-soft hover:bg-bad hover:text-canvas disabled:pointer-events-none ${floatFade}`}><Trash2 size={18} /></button>
        <div ref={box} className="dots bg-canvas min-h-0 flex-1 overflow-auto p-3">
          {comparing ? (
            <Compare pair={pairIds.flatMap((pid) => shownSiblings.filter((s) => s.id === pid))} currentId={g.id} html={{ ...siblingHtml, [g.id]: g.html ?? '' }} reference={concept?.identity ?? null} boxW={boxW} canvas={canvas}
              onPick={(sid) => onSelect(sid)} onOpen={(sid) => { onSelect(sid); setCompare(false); }} />
          ) : g.html ? (
            // Scaled down to fit the column (CSS transform keeps the layout box at full width, hence the sized wrapper).
            <div className={`mx-auto ${mobile ? 'rounded-[28px] border-[6px] border-ink-3' : 'h-full min-h-[600px]'} overflow-hidden`} style={mobile ? { width: w * scale + 12, height: 844 * scale + 12 } : { width: 1440 * scale }}>
              {/* Sandbox: scripts only (Tailwind CDN). Never allow-same-origin. */}
              <iframe ref={frame} title={t('result.generatedUi')} srcDoc={previewDoc(g.html)} sandbox="allow-scripts" className="origin-top-left rounded-md border border-line bg-canvas shadow-soft"
                style={{ ...(mobile ? { width: w, height: 844 } : { width: 1440, height: `${100 / scale}%` }), maxWidth: 'none', transform: `scale(${scale})`, background: canvas }} onLoad={post} />
            </div>
          ) : (
            <EmptyState title={t('result.noHtml')} />
          )}
        </div>
        </div>
        </div>
      </section>
      <Direction g={g} key={g.id} siblings={siblings} onVerdict={onVerdict} onLoad={onLoad} archetypes={archetypes} onAlternative={onAlternative} onRefine={onRefine} onEdit={onEdit} onPreview={setPreview} onTokens={onTokens} busy={busy} comparing={comparing} onLeaveCompare={() => setCompare(false)} />
    </>
  );
}

// Buttons floating over the mockup stay see-through until hovered or focused.
// Side-by-side compare of two variants: live iframes at the same zoom, scrolling one column scrolls the other.
// The iframe reports its content height (studioHeight) so the column, not the iframe, scrolls; 900/844 until it does.
type Zoom = 'fit' | 50 | 100 | 150;
function Compare({ pair, currentId, html, reference, boxW, canvas, onPick, onOpen }: { pair: Generation[]; currentId: string; html: Record<string, string>; reference: string | null; boxW: number; canvas?: string; onPick: (id: string) => void; onOpen: (id: string) => void }) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [pan, setPan] = useState(true);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  // Drag over the pan overlay scrolls its column; the onScroll mirror moves the other one.
  const panDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const sc = e.currentTarget.parentElement?.parentElement;
    if (!sc) return;
    drag.current = { x: e.clientX, y: e.clientY, left: sc.scrollLeft, top: sc.scrollTop };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const panMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current; const sc = e.currentTarget.parentElement?.parentElement;
    if (!d || !sc) return;
    sc.scrollLeft = d.left - (e.clientX - d.x); sc.scrollTop = d.top - (e.clientY - d.y);
  };
  const panUp = () => { drag.current = null; };
  const [heights, setHeights] = useState<Record<string, number>>({});
  const frames = useRef<Record<string, HTMLIFrameElement | null>>({});
  const scrollers = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const h = (e.data as { studioHeight?: unknown } | null)?.studioHeight;
      if (typeof h !== 'number') return;
      const id = Object.keys(frames.current).find((k) => frames.current[k]?.contentWindow === e.source);
      // A page sized to its viewport (html/body height:100%) echoes the frame height back; that is not content.
      if (id && h !== frames.current[id]?.offsetHeight) setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
    };
    addEventListener('message', on);
    return () => removeEventListener('message', on);
  }, []);
  const colW = Math.floor((boxW - 12) / 2);
  // Both frames get the taller document's height: same sheet size on both sides (a short page shows its own
  // background to the bottom instead of blank canvas), and neither side clamps the mirrored scroll position.
  const maxH = Math.max(...pair.map((p) => Math.max(heights[p.id] ?? 0, p.target === 'mobile' ? 844 : 900)));
  // Mirror the scroll position onto the other column; the mirrored event finds equal values and stops.
  const sync = (from: string) => (e: React.UIEvent<HTMLDivElement>) => {
    const a = e.currentTarget;
    for (const [k, b] of Object.entries(scrollers.current)) {
      if (k !== from && b && (b.scrollTop !== a.scrollTop || b.scrollLeft !== a.scrollLeft)) { b.scrollTop = a.scrollTop; b.scrollLeft = a.scrollLeft; }
    }
  };
  return (
    <div className="flex h-full min-h-[600px] flex-col gap-2">
      <div className="flex h-8 shrink-0 items-center gap-3">
        <span className={labelCls}>{t('result.zoom')}</span>
        <Segmented<Zoom> value={zoom} label={t('result.zoom')} onChange={setZoom} options={[{ value: 'fit', label: t('result.zoomFit') }, { value: 50, label: '50\u00a0%' }, { value: 100, label: '100\u00a0%' }, { value: 150, label: '150\u00a0%' }]} />
        <Button className="h-7 text-[12px]" primary={pan} aria-pressed={pan} onClick={() => setPan(!pan)} title={t('result.panHint')}><Hand size={14} /> {t('result.pan')}</Button>
        <span className="text-[12px] text-ink-3">{t('result.syncScrollHint')}</span>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        {[0, 1].map((i) => pair[i]).map((s, i) => s ? ((() => {
          const current = s.id === currentId;
          const mobile = s.target === 'mobile';
          const w = mobile ? 390 : 1440;
          const scale = zoom === 'fit' ? Math.min(1, (colW - 14) / w) : zoom / 100;
          // Two tries of one page are numbered; two different pages (pool compare) show their names.
          const samePage = (pair[0]?.page?.trim() ?? '') === (pair[1]?.page?.trim() ?? '');
          const name = s.page?.trim() ? (samePage ? t('result.tryN', { n: i + 1 }) : s.page.trim()) : s.label ?? `#${shortId(s.id)}`;
          return (
            <div key={s.id} style={{ width: colW }} className={`flex shrink-0 flex-col rounded-lg border-2 bg-surface p-1.5 transition ${current ? 'border-accent ring-4 ring-accent/15 shadow-soft' : 'border-line'}`}>
              <div className="flex h-9 shrink-0 items-center gap-2 px-1">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-ink">{i + 1}</span>
                <button onClick={() => onPick(s.id)} aria-current={current} title={t('result.pickThisOne')} className={`min-w-0 flex-1 truncate text-left text-[13px] font-semibold hover:text-accent ${current ? 'text-accent' : 'text-ink'}`}>{name}</button>
                {reference === s.id && (
                  <span title={t('result.conceptReference')} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok px-1.5 py-0.5 text-[10px] font-semibold text-canvas"><Fingerprint size={10} /> {t('result.conceptReference')}</span>
                )}
                {current && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink"><Check size={10} /> {t('result.viewing')}</span>
                )}
                <Button className="h-7 shrink-0 text-[12px]" onClick={() => onOpen(s.id)} title={t('result.open')}>{t('result.open')}</Button>
              </div>
              {html[s.id] ? (
                <div ref={(el) => { scrollers.current[s.id] = el; }} onScroll={sync(s.id)} className="min-h-0 flex-1 overflow-auto rounded-md border border-line bg-canvas">
                  <div className="relative overflow-hidden" style={{ width: w * scale, height: maxH * scale }}>
                    {/* Sandbox: scripts only (Tailwind CDN). Never allow-same-origin. */}
                    <iframe ref={(el) => { frames.current[s.id] = el; }} title={name} srcDoc={previewDoc(html[s.id])} sandbox="allow-scripts" scrolling="no" className="origin-top-left bg-canvas"
                      style={{ width: w, height: maxH, maxWidth: 'none', transform: `scale(${scale})`, background: canvas }} />
                    {pan && <div className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" onPointerDown={panDown} onPointerMove={panMove} onPointerUp={panUp} onPointerCancel={panUp} />}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-[12px] text-ink-3">…</div>
              )}
            </div>
          );
        })()) : (
          <div key={`empty-${i}`} style={{ width: colW }} className="flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-line text-[13px] text-ink-3">{t('result.pickOneMore')}</div>
        ))}
      </div>
    </div>
  );
}
const floatFade = 'opacity-50 transition hover:opacity-100 focus-visible:opacity-100';

/** Round icon button over the mockup; its label slides out on hover or keyboard focus. */
function FloatPill({ icon, label, title, onClick, className = 'bg-accent text-accent-ink shadow-accent ring-accent/20' }: { icon: ReactNode; label: ReactNode; title: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} title={title} className={`group inline-flex h-11 items-center rounded-full text-[13px] font-medium ring-4 ${className} ${floatFade}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center">{icon}</span>
      <span className="inline-flex max-w-0 items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[260px] group-hover:pr-4 group-focus-visible:max-w-[260px] group-focus-visible:pr-4">{label}</span>
    </button>
  );
}

/** Screenshot → JPEG data URL, longest side at most 1600 px, so 5 of them fit the request limit. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}

// Ready-made skins: only the keys a mockup already has are applied, so they stay live edits.
const PALETTES: { name: string; tokens: Record<string, string | number> }[] = [
  { name: 'Cyber', tokens: { canvas: '#020803', surface: '#06120a', border: '#143520', text: '#b8ffc4', muted: '#63b87a', accent: '#22ff66', accent2: '#00e5ff', font: 'JetBrains Mono', mono: 'JetBrains Mono', radius: 0 } },
  { name: 'Synthwave', tokens: { canvas: '#120024', surface: '#1d0038', border: '#3b1a5c', text: '#f5e6ff', muted: '#a678c9', accent: '#ff2bd6', accent2: '#00f0ff', font: 'Space Grotesk', radius: 6 } },
  { name: 'Nord', tokens: { canvas: '#2e3440', surface: '#3b4252', border: '#4c566a', text: '#eceff4', muted: '#d8dee9', accent: '#88c0d0', font: 'Inter', radius: 8 } },
  { name: 'Solarized', tokens: { canvas: '#fdf6e3', surface: '#eee8d5', border: '#d3cbb7', text: '#002b36', muted: '#4c5f66', accent: '#268bd2', font: 'IBM Plex Sans', mono: 'IBM Plex Mono', radius: 4 } },
  { name: 'Paper', tokens: { canvas: '#f7f3ea', surface: '#fffdf7', border: '#d9d2c4', text: '#111111', muted: '#5f5a50', accent: '#8b1e2d', font: 'Source Serif 4', radius: 2 } },
  { name: 'Forest', tokens: { canvas: '#eef2ec', surface: '#f7faf5', border: '#cfd8cc', text: '#1f2a20', muted: '#5b6b5a', accent: '#3f6b2e', font: 'Nunito Sans', radius: 12 } },
  { name: 'Midnight', tokens: { canvas: '#0b1220', surface: '#111a2e', border: '#24334d', text: '#e6edf7', muted: '#8fa3c0', accent: '#ffb020', font: 'Manrope', radius: 10 } },
  { name: 'Mono', tokens: { canvas: '#f5f5f5', surface: '#ffffff', border: '#d4d4d4', text: '#111111', muted: '#595959', accent: '#000000', font: 'Inter', radius: 0 } },
];

// Google Fonts monospace families offered in the mono font picker (the mockup's current one is always listed too).
const MONO_FONTS = ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Space Mono', 'Roboto Mono', 'Source Code Pro', 'DM Mono', 'Geist Mono'];

const SWATCHES =['canvas', 'surface', 'border', 'text', 'muted', 'accent'];

function Group({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="border-t border-line py-2">
      <summary className={labelCls}>{title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function ShareDialog({ open, onClose, g, project, concept }: { open: boolean; onClose: () => void; g: Generation; project: Project | null; concept: Concept | null }) {
  const { toast } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [expiry, setExpiry] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scope = concept?.identity != null ? { concept_id: concept.id } : { generation_id: g.id };
  const matches = (s: Share) => (concept?.identity != null ? s.concept_id === concept.id : s.generation_id === g.id);
  const load = async () => {
    try {
      const list = await api.shares();
      setShares(list.filter(matches));
    } catch {
      // ignore
    }
  };
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    setUrl(null);
    setError(null);
    setCopied(false);
    void load();
  }, [open, g.id, concept?.id, concept?.identity]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await api.createShare({ ...scope, expires_days: expiry === '' ? undefined : Number(expiry) });
      const fullUrl = location.origin + res.url;
      setUrl(fullUrl);
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };
  const revoke = async (s: Share) => {
    if (!(await confirmDialog(t('share.revokeConfirm'), t('share.revoke')))) return;
    try {
      await api.revokeShare(s.id);
      void load();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(520px,94vw)] rounded-lg bg-surface p-0 text-ink shadow-soft backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold">{t('share.title')}</h2>
            <p className="text-[13px] text-ink-2">{concept?.identity != null ? t('share.scopeProject', { name: `${project?.name ?? ''} · ${concept.name}` }) : t('share.scopeScreen', { name: g.label ?? g.page ?? '#' + g.id })}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')} className="text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>
        <p className="text-[13px] text-ink-2">{t('share.hint')}</p>
        <div className="flex gap-1.5">
          <select value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label={t('share.expiry')} className={`${inputCls} flex-1`}>
            <option value="">{t('share.never')}</option>
            <option value="7">{t('share.days7')}</option>
            <option value="30">{t('share.days30')}</option>
          </select>
          <Button primary onClick={() => void create()} disabled={!g.html || creating}><Link size={16} /> {t('share.create')}</Button>
        </div>
        {error && <p className="text-[12px] text-bad">{error}</p>}
        {url && (
          <div className="flex flex-col gap-2 rounded-md border border-accent/40 bg-accent/5 p-3">
            <div className="flex gap-1.5">
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label={t('share.copy')} className={`${inputCls} font-mono`} />
              <Button onClick={() => void copy()}><Copy size={16} /> {copied ? t('share.copied') : t('share.copy')}</Button>
            </div>
            <p className="text-[12px] text-ink-3">{t('share.onceNote')}</p>
          </div>
        )}
        {shares.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-line pt-3">
            <div className={labelCls}>{t('share.active')}</div>
            {shares.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-[12px] text-ink-2">
                <span className="truncate">{fmtAgo(s.created_at)} · {s.expired ? <span className="text-bad">{t('share.expired')}</span> : s.expires_at ? t('share.expires', { date: fmtDate(s.expires_at) }) : t('share.noExpiry')}</span>
                <button onClick={() => void revoke(s)} className="ml-auto shrink-0 text-ink-3 hover:text-ink text-[12px]">{t('share.revoke')}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}

function Direction({ g, siblings, onVerdict, onLoad, archetypes, onAlternative, onRefine, onEdit, onPreview, onTokens, busy, comparing, onLeaveCompare }: { g: Generation; siblings: Generation[]; onVerdict: () => void; onLoad: (r: Partial<GenerateRequest>, seed?: number, project?: string | null, concept?: string | null) => void; archetypes: Archetype[]; onAlternative: (id: string, archetype: string) => void; onRefine: (id: string, action: RefineAction, count: number) => void; onEdit: (id: string, body: EditRequest) => void; onPreview: (css: string) => void; onTokens: (id: string, identity: EditRequest['identity']) => void; busy: boolean; comparing: boolean; onLeaveCompare: () => void }) {
  const { toast, me } = useApp();
  const [rightOpen, setRightOpen] = usePersisted('studio.right', true);
  const rightShown = rightOpen && !comparing;
  const n = asNotes(g.notes);
  const dir = n.direction;
  const idn = dir?.identity ?? {};
  const [tokens, setTokens] = useState<Record<string, unknown>>(idn);
  const [layout, setLayout] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(g.verdict ?? null);
  const [note, setNote] = useState(g.verdict_note ?? '');
  const [saved, setSaved] = useState(g.verdict != null);
  const save = async (v: Verdict, n: string) => {
    setVerdict(v);
    try { await api.setVerdict(g.id, v, n); setSaved(true); onVerdict(); } catch (e) { toast(`Failed: ${(e as Error).message}`); }
  };
  const [action, setAction] = useState<RefineAction>('bolder');
  const [count, setCount] = useState(1);
  const [alt, setAlt] = useState('');
  const pick = () => {
    const others = siblings.filter((s) => s.id !== g.id).map((s) => s.label ?? `#${shortId(s.id)}`).join(', ');
    save('good', `Preferred over ${others}${note ? `: ${note}` : ''}`);
  };

  // Opening a generation loads its request into the form.
  useEffect(() => { if (g.request) onLoad(g.request, typeof n.seed === 'number' ? n.seed : undefined, g.project_id ?? null, g.concept_id ?? null); }, [g.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tokStr = (k: string) => (typeof tokens[k] === 'string' ? (tokens[k] as string) : '');
  const set = (k: string, v: unknown) => setTokens({ ...tokens, [k]: v });
  const changed = Object.keys(tokens).filter((k) => tokens[k] !== undefined && tokens[k] !== idn[k]);
  // Colours, fonts and radius of a contract-following mockup apply instantly; anything else goes through the model.
  const liveChanged = changed.filter((k) => LIVE_KEYS.includes(k));
  const fxChanged = changed.filter((k) => FX_KEYS.includes(k));
  const aiChanged = changed.filter((k) => !LIVE_KEYS.includes(k) && !FX_KEYS.includes(k));
  // Effects apply on any mockup; colours, fonts and radius only on one following the tokens contract.
  const instant = [...(g.live ? liveChanged : []), ...fxChanged];
  const liveOk = instant.length > 0 && (!g.live || liveChanged.every((k) => idn[k] != null && tokens[k] != null));
  const aiPayload = g.live ? aiChanged : changed.filter((k) => !FX_KEYS.includes(k));
  const only = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, tokens[k]] as [string, unknown])) as EditRequest['identity'];
  const resetKeys = (live: boolean) => setTokens({ ...tokens, ...Object.fromEntries(Object.keys(tokens).filter((k) => (LIVE_KEYS.includes(k) || FX_KEYS.includes(k)) === live).map((k) => [k, idn[k]] as [string, unknown])) } as typeof tokens);
  useEffect(() => onPreview((g.live ? tokenCss(changed.length ? tokens : {}) : '') + effectsCss(tokens)), [tokens, g.live]); // eslint-disable-line react-hooks/exhaustive-deps
  const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const monoOptions = [tokStr('mono'), ...MONO_FONTS].filter((f, i, a) => f !== '' && a.indexOf(f) === i);
  const fontOptions = [tokStr('font'), ...(dir?.archetype?.fonts ?? [])].filter((f, i, a) => f !== '' && a.indexOf(f) === i);
  const list = steps(g.notes);
  const invented = strList(n.invented);
  const issues = findings(g.notes);
  const read = strList(n.files_read);

  return (
    <aside className={`flex w-full shrink-0 flex-col bg-canvas ${rightShown ? 'lg:w-[300px] xl:w-[340px]' : 'lg:w-11'}`}>
      {!rightShown && <button onClick={() => (comparing ? onLeaveCompare() : setRightOpen(true))} aria-label={t('generate.panel.expand')} title={t('generate.panel.expand')} className="hidden h-10 w-full items-center justify-center border-b border-line text-accent hover:bg-accent/10 lg:flex"><PanelRightOpen size={18} /></button>}
      <div className={`flex min-h-0 flex-1 flex-col ${rightShown ? '' : 'lg:hidden'}`}>
      <button onClick={() => setRightOpen(false)} aria-label={t('generate.panel.collapse')} title={t('generate.panel.collapse')} className="hidden h-8 shrink-0 items-center justify-start gap-1.5 border-b border-line px-3 text-[12px] font-medium text-accent hover:bg-accent/10 lg:flex"><PanelRightClose size={16} /></button>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <Label className="flex items-baseline gap-2">{me.admin ? t('result.direction') : t('result.style')}{dir?.archetype?.name && <span className="text-sm font-semibold text-ink">{(() => { const a = archetypes.find((x) => x.name === dir.archetype?.name); return a ? look(a).name : dir.archetype.name; })()}</span>}</Label>
        {me.admin && n.truncated && <p className="mb-2 text-[13px] text-warn">{t('result.htmlTruncated')}</p>}
        {me.admin && n.refine && <p className="mb-2 text-[12px] text-ink-2">{t('result.refinedFrom', { from: n.refine.from, action: n.refine.action, change: String(n.refine.change ?? n.refine.move) })}</p>}
        {me.admin && n.edit && <p className="mb-2 text-[12px] text-ink-2">{t('result.editedFrom', { from: n.edit.from, changes: [...Object.keys(n.edit.changes ?? {}), n.edit.layout ? t('result.layoutPrefix', { layout: n.edit.layout }) : ''].filter(Boolean).join(' · '), change: n.edit.change ? ` — ${n.edit.change}` : '' })}</p>}
        {dir?.archetype?.name ? (
          <>
            {me.admin && <p className="text-[13px] text-ink-2">{dir.archetype.feel}</p>}
            {me.admin && dir.structure?.name && <p className="mt-1 text-[12px] text-accent" title={dir.structure.regions}>{t('result.structure', { name: dir.structure.name })}</p>}
          </>
        ) : <p className="text-[13px] text-ink-3">{t('result.noDirection')}</p>}
        {dir?.identity && (
          <details open className="group mt-5 border-t border-line pt-4">
            <summary className={`${labelCls} flex cursor-pointer list-none items-center gap-1.5`}><ChevronRight size={14} className="text-accent transition group-open:rotate-90" />{t('result.liveSection')} <span onClick={(e) => e.preventDefault()}><Hint>{t('result.liveSectionHint')}</Hint></span></summary>
            <div className="mt-2 flex flex-col gap-2">
            <span className="text-[12px] font-medium text-ink">{t('result.palettes')}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTES.map((p) => {
                const active = Object.entries(p.tokens).every(([k, v]) => idn[k] == null || tokens[k] === v);
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={active}
                    className={`flex h-8 items-center gap-1.5 rounded-sm border px-2 text-left ${active ? 'border-accent bg-accent/10 text-accent' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'}`}
                    onClick={() => setTokens({ ...tokens, ...Object.fromEntries(Object.entries(p.tokens).filter(([k]) => idn[k] != null)) })}
                  >
                    <span className="size-3 rounded-full border border-line" style={{ backgroundColor: String(p.tokens.canvas) }} />
                    <span className="size-3 rounded-full border border-line" style={{ backgroundColor: String(p.tokens.surface) }} />
                    <span className="size-3 rounded-full border border-line" style={{ backgroundColor: String(p.tokens.text) }} />
                    <span className="size-3 rounded-full border border-line" style={{ backgroundColor: String(p.tokens.accent) }} />
                    <span className="text-[12px]">{p.name}</span>
                  </button>
                );
              })}
            </div>
            <hr className="my-1 border-line" />
            <div className="flex flex-wrap gap-2">
              {SWATCHES.filter((k) => tokStr(k) !== '').map((k) => (
                <div key={k} title={`${k} ${tokStr(k)}`} className="flex flex-col items-center gap-1">
                  {isHex(tokStr(k)) ? (
                    <input type="color" aria-label={k} value={tokStr(k)} onChange={(e) => set(k, e.target.value)} className="size-7 cursor-pointer rounded-sm border border-line bg-transparent p-0" />
                  ) : (
                    <span className="size-7 rounded-sm border border-line" style={{ background: tokStr(k) }} />
                  )}
                  <span className="text-[11px] text-ink-3">{t(`result.swatch.${k}` as Parameters<typeof t>[0])}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {tokStr('accent2') !== '' ? (
                <>
                  <input type="color" aria-label="accent2" value={tokStr('accent2')} onChange={(e) => set('accent2', e.target.value)} className="size-5 cursor-pointer rounded-sm border border-line-strong bg-transparent p-0" />
                  <span className="font-mono text-[12px] text-ink-3">accent2 {tokStr('accent2')}</span>
                  <button onClick={() => set('accent2', idn.accent2 ? null : undefined)} className={linkCls}>{t('result.remove')}</button>
                </>
              ) : (
                <button onClick={() => set('accent2', tokStr('accent'))} className={linkCls} title={t('result.accent2Title')}>{t('result.addAccent2')}</button>
              )}
            </div>
            <hr className="my-1 border-line" />
            <label className="flex items-center justify-between gap-2 text-[12px] text-ink-2">{t('result.radiusPx')}
              <input type="number" min={0} max={32} value={typeof tokens.radius === 'number' ? tokens.radius : ''} onChange={(e) => set('radius', e.target.value === '' ? undefined : Number(e.target.value))} className={`${inputCls} !w-20`} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-ink-2">{t('result.font')}
              <select value={tokStr('font')} onChange={(e) => set('font', e.target.value)} className={inputCls}>
                {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-ink-2">{t('result.monoFont')}
              <select value={tokStr('mono')} onChange={(e) => set('mono', e.target.value)} className={inputCls}>
                {monoOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <hr className="my-1 border-line" />
            <span className="text-[12px] font-medium text-ink">{t('result.effects')}</span>
            <label className="flex items-center gap-2 text-[12px] text-ink-2">{t('result.effect.glow')}
              <input type="range" min={0} max={10} value={typeof tokens.glow === 'number' ? tokens.glow : 0} onChange={(e) => { const v = Number(e.target.value); set('glow', v > 0 ? v : idn.glow ? null : undefined); }} className="flex-1 accent-accent" />
              <span className="w-5 text-right font-mono text-ink-3">{typeof tokens.glow === 'number' ? tokens.glow : 0}</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TOGGLE_FX.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={tokens[k] === true}
                  className={`h-8 rounded-sm border px-2.5 text-[12px] ${tokens[k] === true ? 'border-accent bg-accent/10 text-accent' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'}`}
                  onClick={() => set(k, tokens[k] === true ? (idn[k] ? null : undefined) : true)}
                >
                  {t(`result.effect.${k}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
            {!g.live && <p className="text-[12px] text-ink-2">{t('result.liveUnavailable')}</p>}
            {(g.live || fxChanged.length > 0) && (
              <div className="flex items-center gap-1.5">
                <Button primary className="h-7 px-2.5 text-[12px]" onClick={() => onTokens(g.id, only(instant))} disabled={busy || !liveOk} title={t('result.applyLiveTitle')}><Check size={14} /> {t('result.applyLive')}</Button>
                {instant.length > 0 && (
                  <>
                    <button onClick={() => resetKeys(true)} className={linkCls}>{t('result.reset')}</button>
                    <span className="text-[12px] text-ink-3">{instant.join(', ')}</span>
                  </>
                )}
              </div>
            )}
            </div>
          </details>
        )}
        <details open className="group mt-3 border-t border-line pt-3">
          <summary className={`${labelCls} flex cursor-pointer list-none items-center gap-1.5`}><ChevronRight size={14} className="text-accent transition group-open:rotate-90" />{t('result.aiSection')} <span onClick={(e) => e.preventDefault()}><Hint>{t('result.aiSectionHint')}</Hint></span></summary>
          <div className="mt-2 flex flex-col gap-2">
          {dir?.identity && (
            <>
              <div className="flex flex-col gap-1.5">
                {field(t('result.theme'), <Segmented label={t('result.theme')} value={tokStr('theme') || null} onChange={(v) => set('theme', v)} options={['light', 'dark'].map((value) => ({ value }))} />)}
                {field(t('result.density'), <Segmented label={t('result.density')} value={tokStr('density') || null} onChange={(v) => set('density', v)} options={['compact', 'comfortable', 'spacious'].map((value) => ({ value }))} />)}
              </div>
              <div className="flex flex-col gap-1.5">
                {field(t('result.tone'), <Segmented label={t('result.tone')} value={tokStr('tone') || null} onChange={(v) => set('tone', v)} options={['serious', 'neutral', 'playful'].map((value) => ({ value }))} />)}
                {field(t('result.decoration'), <Segmented label={t('result.decoration')} value={tokStr('decoration') || null} onChange={(v) => set('decoration', v)} options={['none', 'light', 'rich'].map((value) => ({ value }))} />)}
              </div>
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">{t('result.rearrange')}
                <textarea rows={2} value={layout} onChange={(e) => setLayout(e.target.value)} maxLength={500} placeholder={t('result.layoutPlaceholder')} className={areaCls} />
              </label>
              <div className="flex items-center gap-1.5">
                <Button primary className="h-7 px-2.5 text-[12px]" onClick={() => onEdit(g.id, { identity: only(aiPayload), layout: layout.trim() || undefined })} disabled={busy || !g.html || (aiPayload.length === 0 && !layout.trim())} title={t('result.applyTitle')}><Sparkles size={14} /> {t('result.apply')}</Button>
                {aiChanged.length > 0 && (
                  <>
                    <button onClick={() => resetKeys(false)} className={linkCls}>{t('result.reset')}</button>
                    <span className="text-[12px] text-ink-3">{aiChanged.join(', ')}</span>
                  </>
                )}
              </div>
            </>
          )}
          <div className="text-[12px] text-ink-2">{t('result.versions')}</div>
          {me.admin && (
            <div className="flex gap-1.5">
              <select value={alt} onChange={(e) => setAlt(e.target.value)} aria-label={t('result.anotherStyle')} className={`${inputCls} flex-1`}>
                <option value="">{t('result.tryAnotherStyleEllipsis')}</option>
                {archetypes.filter((a) => a.name !== dir?.archetype?.name).map((a) => <option key={a.id} value={a.id} title={look(a).desc}>{look(a).name}</option>)}
              </select>
              <Button onClick={() => onAlternative(g.id, alt)} disabled={busy || !alt} title={t('result.addVariantTitle')}><Plus size={16} /> {t('result.addVariant')}</Button>
            </div>
          )}
          <div className="flex gap-1.5">
            <select value={action} onChange={(e) => setAction(e.target.value as RefineAction)} aria-label={t('result.refineAction')} className={`${inputCls} flex-1`}>
              {REFINE_ACTIONS.map((a) => <option key={a} value={a}>{a} · {REFINE_HINTS[a]}</option>)}
            </select>
            {me.admin && <Segmented label={t('result.versions')} value={count} onChange={setCount} options={[1, 2, 3].map((value) => ({ value }))} />}
            <Button onClick={() => onRefine(g.id, action, count)} disabled={busy || !g.html} title={t('result.versionsTitle')}><Wand2 size={16} /> {t('result.versions')}</Button>
          </div>
          </div>
        </details>
        {me.admin && typeof n.seed === 'number' && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-2">
            {t('result.seedValue', { seed: n.seed })}
          </div>
        )}
        {me.admin && n.usage && (
          <div className="mt-1 text-[12px] text-ink-3">
            {t('result.usage', {
              prompt: fmtK(n.usage.prompt),
              cached: fmtK(n.usage.cached),
              out: fmtK(n.usage.completion),
              seconds: n.usage.seconds,
              planner: n.usage.planner ? t('result.usagePlanner', { prompt: fmtK(n.usage.planner.prompt), out: fmtK(n.usage.planner.completion) }) : '',
              cost: g.cost != null ? ` · $${g.cost < 0.1 ? g.cost.toFixed(4) : g.cost.toFixed(2)}` : ''
            })}
          </div>
        )}
        {g.request?.brief && (
          <details className="mt-5 border-t border-line pt-4">
            <summary className="cursor-pointer text-[12px] text-ink-2 hover:text-ink">{t('result.showBrief')}</summary>
            <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-2">{g.request.brief}</p>
            <div className="mt-2 text-[12px] text-ink-3">
              {[g.request.users, g.request.data_objects?.join(', '), g.request.style_tags?.join(', '), g.request.density].filter(Boolean).join(' · ')}
            </div>
          </details>
        )}
        {me.admin && (
        <Group title={t('result.internals')}>
          <div className="border-l-2 border-line pl-3">
          {dir?.direction && <p className="mb-2 text-[13px] text-ink-2">{dir.direction}</p>}
          <Group title={t('result.methodSteps')}>
            {list.length === 0 && <p className="text-[13px] text-ink-3">{t('result.noNotes')}</p>}
            <ol className="flex flex-col gap-2">
              {list.map((s, i) => (
                <li key={i}>
                  <div className="text-[13px] font-medium">{i + 1}. {s.title}</div>
                  <p className="text-[13px] text-ink-2">{s.note}</p>
                </li>
              ))}
            </ol>
          </Group>
          {invented.length > 0 && (
            <Group title={t('result.invented')}><ul className="list-disc pl-4 text-[13px] text-warn">{invented.map((x, i) => <li key={i}>{x}</li>)}</ul></Group>
          )}
          {issues.length > 0 && (
            <Group title={tn('result.finishIssues', issues.length)}>
              <ul className="flex flex-col gap-1 text-[13px]">
                {issues.map((d, i) => (
                  <li key={i} title={d.why} className={d.severity === 'advisory' ? 'text-ink-3' : 'text-bad'}>
                    <span className="font-mono font-medium">{d.rule}</span>: {d.detail}
                  </li>
                ))}
              </ul>
            </Group>
          )}
          {read.length > 0 && (
            <Group title={t('result.skillFilesRead')}>
              <div className="flex flex-wrap gap-1">
                {read.map((f, i) => <span key={i} className="rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[12px] text-ink-2">{f}</span>)}
              </div>
            </Group>
          )}
          </div>
        </Group>
        )}
      </div>
      {me.admin && (
      <div className="flex flex-col gap-2 border-t border-line bg-canvas p-3">
          <details>
            <summary className={labelCls}>{t('result.review')}</summary>
            <div className="mt-2 flex flex-col gap-2">
              {siblings.length > 1 && <Button onClick={pick}>{t('result.pickThisOne')}</Button>}
              <Segmented label={t('result.verdict')} value={verdict} onChange={(v) => save(v, note)} options={(['good', 'mixed', 'bad'] as const).map((value) => ({ value }))} />
              <input value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} onBlur={() => verdict && save(verdict, note)}
                onKeyDown={(e) => e.key === 'Enter' && verdict && save(verdict, note)} placeholder={t('result.verdictPlaceholder')} className={inputCls} />
              <div className="flex h-4 items-center gap-1 text-[12px] text-ink-2">
                {saved ? <><Check size={12} className="text-ok" /> {t('result.savedWithSkill', { version: g.skill_version?.slice(0, 8) ?? '' })}</> : verdict ? t('result.notSavedYet') : t('result.pickVerdictToRecord')}
              </div>
            </div>
          </details>
      </div>
      )}
      </div>
    </aside>
  );
}
