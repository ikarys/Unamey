import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { api, shortId, type Job, type JobSort } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { useApp } from '../../components/AppContext';
import { Button, Dot, EmptyState, ErrorRow, Header, Label, Segmented, SkeletonRows, inputCls } from '../../components/ui';
import { ArrowDown, ArrowUp, ArrowUpDown, Copy } from 'lucide-react';

type StatusFilter = 'all' | 'running' | 'queued' | 'failed' | 'done';

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  return now;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function formatCost(cost: number | null): string {
  return cost == null ? '—' : `$${cost.toFixed(2)}`;
}

// The API sends UTC as "YYYY-MM-DD HH:MM:SS" without a zone.
function toMs(iso: string): number {
  return new Date(`${iso.replace(' ', 'T')}Z`).getTime();
}

function displayDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(toMs(iso));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function relativeTime(iso: string, now: number): string {
  const then = toMs(iso);
  if (Number.isNaN(then)) return '';

  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;

  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;

  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

function jobDuration(j: Job, now: number): string {
  const start = toMs(j.created_at);
  if (Number.isNaN(start)) return '—';

  if (j.status === 'queued') return 'waiting';
  if (j.status === 'running') return formatDuration(Math.max(0, (now - start) / 1000));

  if (j.finished_at) {
    const end = toMs(j.finished_at);
    if (!Number.isNaN(end)) return formatDuration(Math.max(0, (end - start) / 1000));
  }

  return '—';
}

// Live jobs report progress as plain text or as pipeline JSON ({phase, variant, variants, files, ...}); finished jobs show nothing.
function progressText(j: Job): string {
  if (j.status !== 'running' && j.status !== 'queued') return '';
  try {
    const p = JSON.parse(j.progress) as { phase?: string; variant?: number; variants?: number; files?: number };
    if (typeof p.phase !== 'string') return j.progress;
    const parts = [p.phase];
    if (p.variants && p.variants > 1) parts.push(`variant ${p.variant ?? 1}/${p.variants}`);
    if (p.files) parts.push(`${p.files} files`);
    return parts.join(' · ');
  } catch {
    return j.progress;
  }
}

function StatusPill({ status }: { status: Job['status'] }) {
  const cls =
    status === 'running'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : status === 'queued'
        ? 'border-line bg-raised text-ink-2'
        : status === 'done'
          ? 'border-ok/40 bg-ok/10 text-ok'
          : 'border-bad/40 bg-bad/10 text-bad';

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {status === 'running' && <Dot status="running" />}
      {status}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-ink-3">{label}</div>
      <div className="mt-0.5 text-[13px] text-ink">{children}</div>
    </div>
  );
}

const PER = 50;

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className = '',
  align = 'left'
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
  align?: 'left' | 'right';
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`${className} ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 text-xs font-medium ${active ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
      >
        {label}
        <Icon size={12} className={active ? undefined : 'text-ink-3 opacity-50'} />
      </button>
    </th>
  );
}

export function Jobs() {
  const { toast } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState<JobSort>('created');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const pageAsync = useAsync(
    () => api.searchJobs({ q: debouncedQ, status, kind, sort, dir, page, per: PER }),
    [debouncedQ, status, kind, sort, dir, page],
    3000
  );

  const now = useNow(true);

  const detail = useAsync<Job | null>(
    () => (open == null ? Promise.resolve(null) : api.job(open)),
    [open],
    open ? 2000 : 0
  );

  const data = pageAsync.data;
  const counts = data?.counts ?? { all: 0, queued: 0, running: 0, done: 0, failed: 0 };
  const last24h = data?.last24h ?? { jobs: 0, failed: 0, seconds: 0, prompt: 0, cached: 0, out: 0, cost: null };
  const kinds = data?.kinds ?? [];
  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER));

  useEffect(() => {
    if (data && page > pages) setPage(pages);
  }, [data, page, pages]);

  const tokenTotal = last24h.prompt + last24h.out;
  const cachePct = last24h.prompt > 0 ? Math.round((last24h.cached / last24h.prompt) * 100) : 0;

  const toggle = (id: string) => setOpen(open === id ? null : id);
  const clearFilters = () => {
    setQ('');
    setDebouncedQ('');
    setStatus('all');
    setKind('all');
    setPage(1);
  };

  const handleSort = (s: JobSort) => {
    if (s === sort) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(s);
      setDir(s === 'account' || s === 'kind' || s === 'status' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const summary = `${counts.running} running · ${counts.queued} queued · ${last24h.failed} failed in the last 24 h`;
  const generationIds = detail.data?.result?.generation_ids;
  const selectedError = detail.data?.error ?? null;
  const logText = detail.data?.log || (detail.loading ? 'Loading log...' : detail.error ?? '(empty log)');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title="Jobs" summary={summary} />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          {pageAsync.loading && !pageAsync.data ? (
            <SkeletonRows n={8} />
          ) : pageAsync.error ? (
            <ErrorRow message={pageAsync.error} onRetry={pageAsync.reload} />
          ) : !pageAsync.data ? null : counts.all === 0 && debouncedQ === '' && kind === 'all' ? (
            <EmptyState title="No jobs yet">Jobs appear when someone generates a mockup.</EmptyState>
          ) : jobs.length === 0 ? (
            <div className="mt-6 flex items-center justify-between gap-3 rounded border border-line bg-surface p-4 text-[13px] text-ink-3">
              <span>No jobs match these filters.</span>
              <Button onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded border border-line bg-surface p-3">
                  <Label>Jobs</Label>
                  <div className="mt-1 text-2xl font-mono tabular-nums">{last24h.jobs}</div>
                </div>
                <div className="rounded border border-line bg-surface p-3">
                  <Label>LLM time</Label>
                  <div className="mt-1 text-2xl font-mono tabular-nums">{formatDuration(last24h.seconds)}</div>
                </div>
                <div className="rounded border border-line bg-surface p-3">
                  <Label>Tokens</Label>
                  <div className="mt-1 text-2xl font-mono tabular-nums">{formatTokens(tokenTotal)}</div>
                  <div className="mt-1 text-[11px] text-ink-3">{cachePct}% from cache</div>
                </div>
                <div className="rounded border border-line bg-surface p-3">
                  <Label>Cost</Label>
                  <div className="mt-1 text-2xl font-mono tabular-nums">{formatCost(last24h.cost)}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-72">
                  <Label>Search</Label>
                  <input
                    type="search"
                    className={inputCls}
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Account name or email, kind, job ID"
                    aria-label="Search jobs"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Segmented
                    label="Status"
                    value={status}
                    onChange={(v) => {
                      setStatus(v as StatusFilter);
                      setPage(1);
                    }}
                    options={[
                      { value: 'all', label: `All (${counts.all})` },
                      { value: 'running', label: `Running (${counts.running})` },
                      { value: 'queued', label: `Queued (${counts.queued})` },
                      { value: 'failed', label: `Failed (${counts.failed})` },
                      { value: 'done', label: `Done (${counts.done})` }
                    ]}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Label>Kind</Label>
                  <select className={inputCls} value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}>
                    <option value="all">All kinds</option>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[860px] text-[13px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-3">
                      <SortHeader
                        label="Status"
                        active={sort === 'status'}
                        dir={dir}
                        onClick={() => handleSort('status')}
                        className="py-2 pr-4"
                      />
                      <SortHeader
                        label="Job"
                        active={sort === 'kind'}
                        dir={dir}
                        onClick={() => handleSort('kind')}
                        className="py-2 pr-4"
                      />
                      <SortHeader
                        label="Account"
                        active={sort === 'account'}
                        dir={dir}
                        onClick={() => handleSort('account')}
                        className="py-2 pr-4"
                      />
                      <SortHeader
                        label="Started"
                        active={sort === 'created'}
                        dir={dir}
                        onClick={() => handleSort('created')}
                        className="py-2 pr-4"
                      />
                      <SortHeader
                        label="Duration"
                        active={sort === 'duration'}
                        dir={dir}
                        onClick={() => handleSort('duration')}
                        className="py-2 pr-4"
                      />
                      <SortHeader
                        label="LLM"
                        active={sort === 'llm_time'}
                        dir={dir}
                        onClick={() => handleSort('llm_time')}
                        className="py-2 pr-4"
                      />
                      <SortHeader
                        label="Cost"
                        active={sort === 'cost'}
                        dir={dir}
                        onClick={() => handleSort('cost')}
                        className="py-2 pr-4 text-right"
                        align="right"
                      />
                      <th className="py-2">
                        <span className="sr-only">Progress</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <Fragment key={j.id}>
                        <tr
                          tabIndex={0}
                          role="button"
                          aria-expanded={open === j.id}
                          onClick={() => toggle(j.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') toggle(j.id);
                          }}
                          className={`cursor-pointer border-t border-line transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                            open === j.id ? 'bg-raised/60' : 'hover:bg-raised'
                          }`}
                        >
                          <td className="py-2.5 pr-4 align-middle">
                            <StatusPill status={j.status} />
                          </td>
                          <td className="py-2.5 pr-4 align-middle">
                            <span className="font-medium">{j.kind}</span>{' '}
                            <span className="font-mono text-[11px] text-ink-3">#{shortId(j.id)}</span>
                          </td>
                          <td className="py-2.5 pr-4 align-middle">
                            <a
                              href={`#/admin/users?u=${j.owner.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium hover:text-accent hover:underline"
                            >
                              {j.owner.name ?? j.owner.email}
                            </a>
                            {j.owner.name && <div className="mt-0.5 text-[11px] text-ink-3">{j.owner.email}</div>}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 align-middle text-ink-2 tabular-nums">
                            <div>{displayDateTime(j.created_at)}</div>
                            <div className="text-[11px] text-ink-3">{relativeTime(j.created_at, now)}</div>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-4 align-middle text-ink-2 tabular-nums">{jobDuration(j, now)}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 align-middle text-ink-2 tabular-nums">
                            {j.llm.calls === 0 ? (
                              '—'
                            ) : (
                              <>
                                <div>{j.llm.calls} calls · {formatDuration(j.llm.seconds)}</div>
                                <div className="text-[11px] text-ink-3">
                                  {formatTokens(j.llm.prompt)} in · {formatTokens(j.llm.out)} out
                                </div>
                              </>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right align-middle font-mono tabular-nums">
                            {formatCost(j.llm.cost)}
                          </td>
                          <td className="py-2.5 align-middle">
                            <div
                              className={`max-w-[16rem] truncate ${j.error ? 'text-bad' : 'text-ink-2'}`}
                              title={j.error ?? progressText(j)}
                            >
                              {j.error ?? progressText(j)}
                            </div>
                          </td>
                        </tr>
                        {open === j.id && (
                          <tr>
                            <td colSpan={8} className="border-t border-line bg-canvas px-4 py-4">
                              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                                <Fact label="Job ID">
                                  <span className="flex items-center gap-1 font-mono text-[12px]">
                                    {j.id}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(j.id);
                                        toast('Job ID copied');
                                      }}
                                      className="rounded p-0.5 text-ink-3 hover:text-accent"
                                      aria-label="Copy job ID"
                                      title="Copy job ID"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </span>
                                </Fact>
                                <Fact label="Account">
                                  <a href={`#/admin/users?u=${j.owner.id}`} className="text-accent hover:underline">
                                    {j.owner.name ?? j.owner.email}
                                  </a>
                                </Fact>
                                <Fact label="Created">{displayDateTime(j.created_at)}</Fact>
                                <Fact label="Finished">{displayDateTime(j.finished_at)}</Fact>
                                <Fact label="Duration">{jobDuration(j, now)}</Fact>
                                <Fact label="LLM calls">{j.llm.calls}</Fact>
                                <Fact label="LLM time">{formatDuration(j.llm.seconds)}</Fact>
                                <Fact label="Prompt tokens">{formatTokens(j.llm.prompt)}</Fact>
                                <Fact label="Cached tokens">{formatTokens(j.llm.cached)}</Fact>
                                <Fact label="Output tokens">{formatTokens(j.llm.out)}</Fact>
                                <Fact label="Cost">{formatCost(j.llm.cost)}</Fact>
                              </div>

                              {(selectedError ?? j.error) && (
                                <div className="mt-4 rounded border border-bad/40 bg-bad/10 p-3 text-[13px] text-bad">
                                  {selectedError ?? j.error}
                                </div>
                              )}

                              {generationIds && generationIds.length > 0 && (
                                <div className="mt-4">
                                  <div className="text-[11px] font-medium text-ink-3">Generations</div>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {generationIds.map((id) => (
                                      <span key={id} className="font-mono text-[12px] text-ink-2">
                                        #{shortId(id)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <pre className="mt-4 max-h-80 overflow-auto rounded border border-line bg-canvas p-3 font-mono text-[11px] leading-4 text-ink-2">
                                {logText}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > 0 && (
                <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-ink-3">
                  <span>
                    Showing {(page - 1) * PER + 1}–{Math.min(page * PER, total)} of {total} jobs
                  </span>
                  <div className="flex items-center gap-3">
                    <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Previous
                    </Button>
                    <span>Page {page} of {pages}</span>
                    <Button disabled={page * PER >= total} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
