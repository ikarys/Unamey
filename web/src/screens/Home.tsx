// Home screen: dashboard with projects and recent screens.
import { useEffect, useRef, useState } from 'react';
import { Folder, Sparkles } from 'lucide-react';
import { api, type Generation, type Project } from '../api';
import { useAsync } from '../hooks/useAsync';
import { ErrorRow } from '../components/ui';
import { PromptBox } from '../components/PromptBox';
import { previewDoc } from './Generate';
import { fmtAgo, t, tn } from '../i18n';

function projectThumbId(project: Project, generations: Generation[]): string | null {
  const identity = project.concepts.find((c) => c.identity !== null)?.identity;
  if (identity != null) return identity;
  const owned = generations.filter((generation) => generation.project_id === project.id);
  if (owned.length === 0) return null;
  return owned.reduce((best, generation) => (generation.id > best ? generation.id : best), owned[0].id);
}

function generationMobile(id: string | null, generations: Generation[]): boolean {
  if (id === null) return false;
  return generations.find((generation) => generation.id === id)?.target === 'mobile';
}

// Fits the 1440x900 (or 390x844 mobile) screen to the card's width (mobile: its height, centred).
function Thumb({ id, mobile }: { id: string; mobile: boolean }) {
  const { data, loading } = useAsync(() => api.generation(id), [id]);
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
      {loading ? <div className="skeleton h-full w-full" /> : !data?.html ? (
        <div className="flex h-full w-full items-center justify-center bg-raised text-ink-3"><Folder className="h-5 w-5" /></div>
      ) : box.w > 0 && (
        <iframe
          title={t('home.previewTitle', { id })}
          sandbox="allow-scripts"
          srcDoc={previewDoc(data.html)}
          className={`pointer-events-none absolute top-0 origin-top-left ${mobile ? 'h-[844px] w-[390px]' : 'left-0 h-[900px] w-[1440px]'}`}
          style={{ transform: `scale(${scale})`, left: mobile ? (box.w - 390 * scale) / 2 : 0 }}
        />
      )}
    </div>
  );
}

export function Home() {
  const [setup, setSetup] = useState(false);
  const projectsState = useAsync(api.projects, []);
  const generationsState = useAsync(api.generations, []);

  const { data: projectsData, error: projectsError, loading: projectsLoading, reload: reloadProjects } = projectsState;
  const { data: generationsData, error: generationsError, loading: generationsLoading, reload: reloadGenerations } = generationsState;

  const projects = (projectsData ?? []).filter((p) => !p.archived);
  const generations = generationsData ?? [];
  const loading = projectsLoading || generationsLoading;
  const error = projectsError ?? generationsError;
  const recent = [...generations].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
  const errorMessage = error ?? '';

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <div className="mb-8 flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton h-7 w-48 rounded-md" />
              <div className="skeleton h-4 w-72 rounded-md" />
            </div>
            <div className="skeleton h-10 w-32 rounded-md" />
          </div>
          <div className="skeleton mb-10 h-14 w-full rounded-lg" />
          <div className="mb-4 skeleton h-5 w-32 rounded-md" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-md border border-line bg-surface shadow-soft">
                <div className="skeleton h-[200px] w-full" />
                <div className="p-4">
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
          <ErrorRow
            message={errorMessage}
            onRetry={() => {
              void reloadProjects();
              void reloadGenerations();
            }}
          />
        </div>
      </div>
    );
  }

  if (projects.length === 0 && generations.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <div className="flex min-h-[60vh] items-center justify-center">
            {/* The setup stepper needs the page width; the narrow card only frames the prompt. */}
            <div className={`w-full rounded-lg border border-line bg-surface p-8 text-center shadow-soft ${setup ? '' : 'max-w-md'}`}>
              <Sparkles className="mx-auto h-6 w-6 text-accent" />
              <h2 className="mt-4 text-[18px] font-semibold text-ink">{t('home.emptyTitle')}</h2>
              <p className="mt-2 text-[14px] text-ink-2">{t('home.emptyHint')}</p>
              <div className="mt-6 text-left"><PromptBox onSetup={setSetup} /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="mb-12">
          <h1 className="text-[28px] font-bold tracking-tight text-ink">{t('home.title')}</h1>
          <p className="mb-5 mt-1 text-[14px] text-ink-2">{t('home.subtitle')}</p>
          <PromptBox onSetup={setSetup} />
        </div>

        {!setup && (<>
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-[15px] font-semibold text-ink">
              {t('home.projects')} <span className="text-ink-3">{projects.length}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const thumbId = projectThumbId(project, generations);
              const mobile = generationMobile(thumbId, generations);

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    location.hash = thumbId !== null ? `#/generate?id=${thumbId}` : `#/generate?project=${project.id}`;
                  }}
                  className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface text-left shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-t-md bg-raised">
                    {thumbId !== null ? (
                      <Thumb id={thumbId} mobile={mobile} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-3">
                        <Folder className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <div className="truncate font-semibold text-ink">{project.name}</div>
                    <div className="text-[12.5px] text-ink-2">
                      {tn('home.projectMeta', project.generations, { time: fmtAgo(project.created_at) })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">{t('home.recentScreens')}</h2>
            <button
              type="button"
              onClick={() => {
                location.hash = '#/gallery';
              }}
              className="text-[13px] font-medium text-accent hover:underline"
            >
              {t('home.viewAll')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {recent.map((generation) => (
              <button
                key={generation.id}
                type="button"
                onClick={() => {
                  location.hash = `#/generate?id=${generation.id}`;
                }}
                className="group flex flex-col overflow-hidden rounded-md border border-line bg-surface text-left shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-t-md bg-raised">
                  <Thumb id={generation.id} mobile={generation.target === 'mobile'} />
                </div>
                <div className="flex flex-col gap-0.5 p-3">
                  <div className="truncate text-[13px] font-medium text-ink">
                    {generation.label ?? generation.page ?? t('home.untitledScreen')}
                  </div>
                  <div className="text-[12px] text-ink-3">{fmtAgo(generation.created_at)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
        </>)}
      </div>
    </div>
  );
}
