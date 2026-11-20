// The home prompt box in two steps: a free description, then a horizontal setup stepper for project, style and options.
import { Fragment, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Folder, Loader2, Lock, Maximize2, Pencil, Plus, Sparkles } from 'lucide-react';
import { api, type Archetype } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useApp } from './AppContext';
import { t, tn, fmtAgo, look as lookText } from '../i18n';
import { ImageZoom } from './ui';

const EXAMPLES = [
  t('prompt.exampleCrm'),
  t('prompt.exampleHabit'),
  t('prompt.exampleDrones'),
] as const;

type Step = 'prompt' | 'setup';
type Theme = 'auto' | 'light' | 'dark';
type Target = 'auto' | 'desktop' | 'mobile';

function MiniWindow({ dark }: { dark: boolean }) {
  const colors = dark
    ? { background: '#111318', bar: '#262a33', line: '#3a3f4b' }
    : { background: '#ffffff', bar: '#e5e7eb', line: '#d1d5db' };

  return (
    <div className="relative h-full w-full" style={{ background: colors.background }}>
      <div className="absolute inset-x-0 top-0 h-[16%]" style={{ background: colors.bar }} />
      <div className="absolute bottom-[10%] left-[8%] top-[24%] w-[20%] rounded-sm" style={{ background: colors.bar }} />
      <div className="absolute bottom-[10%] right-[8%] top-[24%] flex w-[52%] flex-col justify-between">
        <div className="h-[8%] w-full rounded-sm" style={{ background: colors.line }} />
        <div className="h-[8%] w-[85%] rounded-sm" style={{ background: colors.line }} />
        <div className="h-[8%] w-[70%] rounded-sm" style={{ background: colors.line }} />
      </div>
      <div className="absolute bottom-[10%] right-[8%] h-[16%] w-[16%] rounded-sm bg-accent" />
    </div>
  );
}

// onSetup tells the page the setup stepper is open (the home hides its lists meanwhile).
// `fixed`: start inside that (empty) concept of an existing project (the studio's empty concept).
// `initialText`: the app is already described (another concept of the project): open straight on the style step.
export function PromptBox({ onSetup, fixed, initialText }: { onSetup?: (open: boolean) => void; fixed?: { project: string; concept: string }; initialText?: string } = {}) {
  const { toast, refreshStatus } = useApp();
  const [step, setStep] = useState<Step>(initialText ? 'setup' : 'prompt');
  const [setupStep, setSetupStep] = useState(initialText ? 2 : 1);
  useEffect(() => onSetup?.(step === 'setup'), [step, onSetup]);
  const [text, setText] = useState(initialText?.slice(0, 2000) ?? '');
  const [look, setLook] = useState(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('look') ?? '');
  const [theme, setTheme] = useState<Theme>('auto');
  const [target, setTarget] = useState<Target>('auto');
  const [variants, setVariants] = useState(() =>
    new URLSearchParams(location.hash.split('?')[1] ?? '').get('look') ? 1 : 3
  );
  const [project, setProject] = useState(fixed?.project ?? '');
  const [allProjects, setAllProjects] = useState(false);
  const [starting, setStarting] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<Archetype | null>(null);

  const archetypes = useAsync(api.archetypes, []);
  const projects = useAsync(api.projects, []);
  const sortedProjects = (projects.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const activeProjects = sortedProjects.filter((p) => !p.archived).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const visibleProjects = allProjects
    ? activeProjects
    : activeProjects.slice(0, 8).concat(activeProjects.filter((p) => String(p.id) === project && !activeProjects.slice(0, 8).includes(p)));

  const canContinue = text.trim().length > 0;
  const canSubmit = canContinue && !starting;

  const setupSteps = [
    { id: 1, label: t('prompt.stepProject') },
    { id: 2, label: t('prompt.stepStyle') },
    { id: 3, label: t('prompt.stepOptions') },
  ];

  function chooseLook(nextLook: string) {
    setLook(nextLook);
    setVariants(nextLook ? 1 : 3);
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setStarting(true);

    try {
      const chosen = sortedProjects.find((p) => p.id === project);
      const concept = fixed && project === fixed.project ? fixed.concept : chosen?.concepts.find((c) => c.identity == null)?.id;
      const result = await api.start({
        text: text.trim(),
        variants,
        project: project || undefined,
        concept: project ? concept : undefined,
        look: look || undefined,
        theme,
        target,
      });
      void refreshStatus();
      location.hash = `#/generate?job=${result.job_id}&project=${result.project_id}&concept=${result.concept_id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('prompt.somethingWentWrong');
      toast(t('prompt.startFailed', { message }));
      setStarting(false);
    }
  }

  const primaryButtonClass = (enabled: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-ink shadow-accent transition ${
      enabled ? 'hover:-translate-y-0.5' : 'cursor-not-allowed opacity-50'
    }`;

  if (step === 'prompt') {
    return (
      <div>
        <div className="rounded-lg border border-line bg-surface shadow-soft focus-within:border-accent">
          <textarea
            autoFocus
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                if (canContinue) {
                  setSetupStep(1);
                  setStep('setup');
                }
              }
            }}
            aria-label={t('prompt.describeApp')}
            style={{ outline: 'none' }}
            placeholder={t('prompt.placeholder')}
            className="w-full resize-none bg-transparent p-5 text-[15px] text-ink placeholder:text-ink-3"
          />
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <span className="text-[12px] text-ink-3">{text.length} / 2000</span>
            <button
              type="button"
              onClick={() => {
                if (canContinue) {
                  setSetupStep(1);
                  setStep('setup');
                }
              }}
              disabled={!canContinue}
              className={primaryButtonClass(canContinue)}
            >
              <ArrowRight className="h-4 w-4" />
              {t('prompt.continue')}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setText(example)}
              className="rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-2 transition hover:border-line-strong hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface p-4">
        <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-wrap text-[14px] text-ink-2">
          {text}
        </p>
        <button
          type="button"
          onClick={() => setStep('prompt')}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-ink-2 transition hover:text-ink"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('prompt.edit')}
        </button>
      </div>

      <ol aria-label={t('prompt.steps')} className="mt-5 flex items-center gap-3">
        {setupSteps.map((s, index) => {
          const isCurrent = setupStep === s.id;
          const isDone = setupStep > s.id;
          const isReached = setupStep >= s.id;
          const circleClass = `flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
            isCurrent ? 'bg-accent text-accent-ink' : isDone ? 'bg-raised text-accent' : 'border border-line text-ink-3'
          }`;
          const labelClass = `text-[13px] ${isCurrent ? 'font-medium text-ink' : 'text-ink-2'}`;

          return (
            <Fragment key={s.id}>
              <li className="flex items-center">
                {isReached ? (
                  <button
                    type="button"
                    onClick={() => setSetupStep(s.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <span className={circleClass}>{isDone ? <Check className="h-3.5 w-3.5" /> : s.id}</span>
                    <span className={labelClass}>{s.label}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className={circleClass}>{s.id}</span>
                    <span className={labelClass}>{s.label}</span>
                  </span>
                )}
              </li>
              {index < setupSteps.length - 1 && <li aria-hidden="true" className="h-px flex-1 bg-line" />}
            </Fragment>
          );
        })}
      </ol>

      <section className="mt-5 min-h-[280px]">
        {setupStep === 1 && (
          <div>
            <h3 id="project-heading" className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
              {t('prompt.project')}
            </h3>
            <div role="radiogroup" aria-labelledby="project-heading" className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={project === ''}
                onClick={() => setProject('')}
                className={`flex items-center gap-3 rounded-md border bg-surface p-3 text-left transition ${
                  project === '' ? 'border-accent ring-2 ring-accent/30' : 'border-dashed border-line hover:border-line-strong'
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent/10">
                  <Plus className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">{t('prompt.newProjectShort')}</div>
                  <div className="truncate text-[12px] text-ink-3">{t('prompt.newProjectDesc')}</div>
                </div>
              </button>
              {visibleProjects.map((p) => {
                const value = String(p.id);
                const disabled = !p.concepts.some((c) => c.identity == null) && p.id !== fixed?.project;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={project === value}
                    disabled={disabled}
                    onClick={() => setProject(value)}
                    title={disabled ? t('prompt.lookValidatedHint') : undefined}
                    className={`flex items-center gap-3 rounded-md border bg-surface p-3 text-left transition ${
                      project === value ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-raised">
                      <Folder className="h-5 w-5 text-ink-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                        {disabled && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2 text-[11px] text-ink-3">
                            <Lock size={11} />
                            {t('prompt.lookValidated')}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[12px] text-ink-3">
                        {tn('prompt.screensN', p.generations)} · {fmtAgo(p.created_at)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {activeProjects.length > 8 && !allProjects && (
              <button
                type="button"
                onClick={() => setAllProjects(true)}
                className="mt-3 text-[13px] text-ink-2 hover:text-ink underline-offset-4 hover:underline"
              >
                {t('prompt.showAllProjects', { n: activeProjects.length })}
              </button>
            )}
            <p className="mt-3 text-[12.5px] text-ink-3">{t('prompt.projectHint')}</p>
          </div>
        )}

        {setupStep === 2 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 id="style-heading" className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                  {t('prompt.style')}
                </h3>
                <a href="#/styles" className="text-accent hover:underline">
                  {t('prompt.seeStyles')}
                </a>
              </div>
              <p className="mb-3 text-[12.5px] text-ink-3">{t('prompt.styleNote')}</p>
              <div aria-labelledby="style-heading" className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                <button
                  type="button"
                  aria-pressed={look === ''}
                  onClick={() => chooseLook('')}
                  className={`overflow-hidden rounded-md border text-left transition ${
                    look === '' ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <div className="flex aspect-[16/10] items-center justify-center bg-raised">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div className="truncate px-2.5 py-2 text-[12.5px] font-medium text-ink">
                    {t('prompt.proposeLooks')}
                    <span className="block truncate text-[11.5px] font-normal text-ink-3">{t('prompt.proposeLooksHint')}</span>
                  </div>
                </button>
                {(archetypes.data ?? []).map((a) => (
                  <div key={a.id} className="group relative">
                    <button
                      type="button"
                      aria-pressed={look === a.id}
                      onClick={() => chooseLook(a.id)}
                      title={lookText(a).desc}
                      className={`h-full w-full overflow-hidden rounded-md border text-left transition ${
                        look === a.id ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      {failedImages.has(a.id) ? (
                        <div className="aspect-[16/10] w-full bg-raised" />
                      ) : (
                        <img
                          src={`/styles/${a.id}.jpg`}
                          alt=""
                          loading="lazy"
                          className="aspect-[16/10] w-full object-cover object-top bg-raised"
                          onError={() =>
                            setFailedImages((prev) => {
                              if (prev.has(a.id)) return prev;
                              const next = new Set(prev);
                              next.add(a.id);
                              return next;
                            })
                          }
                        />
                      )}
                      <div className="truncate px-2.5 py-2 text-[12.5px] font-medium text-ink">
                        {lookText(a).name}
                      </div>
                    </button>
                    {!failedImages.has(a.id) && (
                      <button
                        type="button"
                        onClick={() => setZoom(a)}
                        aria-label={t('prompt.zoomStyle', { name: lookText(a).name })}
                        title={t('prompt.zoomStyle', { name: lookText(a).name })}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-black/55 text-white opacity-0 transition hover:bg-black/75 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Maximize2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <ImageZoom
                src={zoom ? `/styles/${zoom.id}.jpg` : null}
                title={zoom ? lookText(zoom).name : undefined}
                text={zoom ? lookText(zoom).desc : undefined}
                onClose={() => setZoom(null)}
              />
            </div>
          )}

        {setupStep === 3 && (
          <div className="grid gap-6 md:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-6">
              <section>
                <h3 id="theme-heading" className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                  {t('prompt.theme')}
                </h3>
                <div role="radiogroup" aria-labelledby="theme-heading" className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { value: 'auto', label: t('prompt.themeAuto'), desc: t('prompt.themeAutoDesc') },
                      { value: 'light', label: t('prompt.themeLight'), desc: t('prompt.themeLightDesc') },
                      { value: 'dark', label: t('prompt.themeDark'), desc: t('prompt.themeDarkDesc') },
                    ] as const
                  ).map((option) => {
                    const selected = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTheme(option.value)}
                        className={`overflow-hidden rounded-md border text-left transition ${
                          selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-raised">
                          <MiniWindow dark={option.value === 'dark'} />
                          {option.value === 'auto' && (
                            <div
                              className="absolute inset-0"
                              style={{ clipPath: 'polygon(55% 0, 100% 0, 100% 100%, 45% 100%)' }}
                            >
                              <MiniWindow dark />
                            </div>
                          )}
                        </div>
                        <div className="px-2.5 py-2">
                          <div className="text-[13px] font-medium text-ink">{option.label}</div>
                          <div className="text-[11.5px] text-ink-3">{option.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-ink-3">{t('prompt.themeHint')}</p>
              </section>
              <section>
                <h3 id="target-heading" className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                  {t('prompt.target')}
                </h3>
                <div role="radiogroup" aria-labelledby="target-heading" className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { value: 'auto', label: t('prompt.targetAuto'), desc: t('prompt.targetAutoDesc') },
                      { value: 'desktop', label: t('prompt.targetDesktop'), desc: t('prompt.targetDesktopDesc') },
                      { value: 'mobile', label: t('prompt.targetMobile'), desc: t('prompt.targetMobileDesc') },
                    ] as const
                  ).map((option) => {
                    const selected = target === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTarget(option.value)}
                        className={`overflow-hidden rounded-md border text-left transition ${
                          selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-raised">
                          {option.value === 'desktop' && <MiniWindow dark={false} />}
                          {option.value === 'mobile' && (
                            <div className="absolute left-1/2 top-1/2 h-[64px] w-9 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-ink-3 bg-surface">
                              <div className="mx-auto mt-1 h-1 w-3 rounded bg-ink-3" />
                            </div>
                          )}
                          {option.value === 'auto' && (
                            <>
                              <MiniWindow dark={false} />
                              <div className="absolute left-[70%] top-1/2 h-[64px] w-9 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-ink-3 bg-surface">
                                <div className="mx-auto mt-1 h-1 w-3 rounded bg-ink-3" />
                              </div>
                            </>
                          )}
                        </div>
                        <div className="px-2.5 py-2">
                          <div className="text-[13px] font-medium text-ink">{option.label}</div>
                          <div className="text-[11.5px] text-ink-3">{option.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-ink-3">{t('prompt.targetHint')}</p>
              </section>
              <section>
                <h3 id="variants-heading" className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
                  {t('prompt.variants')}
                </h3>
                <div role="radiogroup" aria-labelledby="variants-heading" className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((n) => {
                    const selected = variants === n;
                    const screens =
                      n === 3
                        ? [
                            { rotate: -8, offset: -56 },
                            { rotate: 0, offset: 0 },
                            { rotate: 8, offset: 56 },
                          ]
                        : n === 2
                          ? [
                              { rotate: -5, offset: -36 },
                              { rotate: 5, offset: 36 },
                            ]
                          : [{ rotate: 0, offset: 0 }];
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setVariants(n)}
                        className={`overflow-hidden rounded-md border text-left transition ${
                          selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-raised">
                          {screens.map((screen, index) => (
                            <div
                              key={index}
                              className="absolute left-1/2 top-1/2 h-[52px] w-20 overflow-hidden rounded-md shadow-soft border border-line bg-surface"
                              style={{
                                transform: `translate(-50%, -50%) rotate(${screen.rotate}deg) translateX(${screen.offset}px)`,
                              }}
                            >
                              <div className="h-1 w-full bg-accent" />
                            </div>
                          ))}
                        </div>
                        <div className="px-2.5 py-2">
                          <div className="text-[13px] font-medium text-ink">{tn('prompt.variantsN', n)}</div>
                          <div className="text-[11.5px] text-ink-3">
                            {n === 1 ? t('prompt.variants1Desc') : t('prompt.variantsManyDesc')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-ink-3">{t('prompt.variantsHint')}</p>
              </section>
            </div>
            <aside className="self-start rounded-lg border border-line bg-surface p-4 md:sticky md:top-4">
              {(() => {
                const selectedArchetype = archetypes.data?.find((a) => a.id === look);
                const projectName =
                  sortedProjects.find((p) => String(p.id) === project)?.name ?? t('prompt.newProjectShort');
                const themeLabel =
                  theme === 'auto' ? t('prompt.themeAuto') : theme === 'light' ? t('prompt.themeLight') : t('prompt.themeDark');
                const targetLabel =
                  target === 'auto' ? t('prompt.targetAuto') : target === 'desktop' ? t('prompt.targetDesktop') : t('prompt.targetMobile');
                return (
                  <>
                    <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">{t('prompt.summary')}</h3>
                    <div className="mt-3">
                      {look && !failedImages.has(look) ? (
                        <img
                          src={`/styles/${look}.jpg`}
                          alt=""
                          className="aspect-[16/10] w-full rounded-md bg-raised object-cover object-top"
                          onError={() =>
                            setFailedImages((prev) => {
                              if (prev.has(look)) return prev;
                              const next = new Set(prev);
                              next.add(look);
                              return next;
                            })
                          }
                        />
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center rounded-md bg-raised">
                          <Sparkles className="h-5 w-5 text-accent" />
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] text-ink">
                          {selectedArchetype ? lookText(selectedArchetype).name : t('prompt.proposeLooks')}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSetupStep(2)}
                          className="text-[11.5px] text-accent hover:underline"
                        >
                          {t('prompt.change')}
                        </button>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[12px] text-ink-3">{t('prompt.project')}</dt>
                        <dd className="flex items-center gap-2 text-[12.5px] text-ink">
                          <span className="truncate">{projectName}</span>
                          <button
                            type="button"
                            onClick={() => setSetupStep(1)}
                            className="text-[11.5px] text-accent hover:underline"
                          >
                            {t('prompt.change')}
                          </button>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[12px] text-ink-3">{t('prompt.theme')}</dt>
                        <dd className="text-[12.5px] text-ink">{themeLabel}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[12px] text-ink-3">{t('prompt.target')}</dt>
                        <dd className="text-[12.5px] text-ink">{targetLabel}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[12px] text-ink-3">{t('prompt.screens')}</dt>
                        <dd className="text-[12.5px] text-ink">{variants}</dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-[12px] text-ink-3">{t('prompt.summaryNext')}</p>
                  </>
                );
              })()}
            </aside>
          </div>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <button
          type="button"
          onClick={() => {
            if (setupStep === 1) setStep('prompt');
            else setSetupStep(setupStep - 1);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-ink-2 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('prompt.back')}
        </button>
        <div className="flex items-center gap-2">
          {setupStep < 3 ? (
            <>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={starting}
                className="text-[13px] text-ink-2 hover:text-ink underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
                {tn('prompt.generateNowN', variants)}
              </button>
              <button
                type="button"
                onClick={() => setSetupStep(setupStep + 1)}
                className={primaryButtonClass(true)}
              >
                {t('prompt.next')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className={primaryButtonClass(canSubmit)}
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {starting ? t('prompt.starting') : tn('prompt.generateN', variants)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
