import { api, shortId, type CacheCall, type CacheJob, type CacheServer } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { Header, Label, SkeletonRows, ErrorRow, EmptyState } from '../../components/ui';

type TileProps = { label: string; value: string; detail: string; bar?: number | null };

const fmt = (n: number | null): string => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
};

const pct = (a: number | null, b: number | null): string =>
  a == null || b == null || b === 0 ? '—' : `${((a / b) * 100).toFixed(1)}%`;

const gb = (n: number | null): string => (n == null ? '—' : `${(n / 1_073_741_824).toFixed(1)} GB`);

const stats = (job: CacheJob) =>
  job.calls.reduce(
    (s, c: CacheCall) => ({
      prompt: s.prompt + c.prompt,
      cached: s.cached + c.cached,
      time: s.time + c.seconds,
      max: Math.max(s.max, c.prompt),
    }),
    { prompt: 0, cached: 0, time: 0, max: 0 },
  );

function Tile({ label, value, detail, bar }: TileProps) {
  return (
    <div className="rounded border border-line bg-surface p-3">
      <Label>{label}</Label>
      <div className="mt-1 text-2xl font-mono tabular-nums">{value}</div>
      {bar != null && (
        <div className="mt-2 h-1.5 rounded bg-line">
          <div
            className={`h-full rounded ${bar > 90 ? 'bg-bad' : 'bg-accent'}`}
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      )}
      <div className="mt-1 text-xs text-ink-3">{detail}</div>
    </div>
  );
}

export function Cache() {
  const { data, error, loading, reload } = useAsync(() => api.cache(), [], 5000);
  const server: CacheServer | null = data?.server ?? null;
  const jobs: CacheJob[] = data?.jobs ?? [];

  const tiles: TileProps[] = server
    ? [
        {
          label: 'Hit rate (since start)',
          value: pct(server.cached_tokens, server.prompt_tokens),
          detail: `${fmt(server.cached_tokens)} cached of ${fmt(server.prompt_tokens)} prompt tokens`,
        },
        {
          label: 'KV pool',
          value: pct(server.kv_used, server.kv_capacity),
          detail: `${fmt(server.kv_used)} / ${fmt(server.kv_capacity)} page groups`,
          bar:
            server.kv_used != null && server.kv_capacity != null && server.kv_capacity > 0
              ? (server.kv_used / server.kv_capacity) * 100
              : null,
        },
        {
          label: 'Host context',
          value: pct(server.host_used, server.host_capacity),
          detail: `${gb(server.host_used)} / ${gb(server.host_capacity)}`,
          bar:
            server.host_used != null && server.host_capacity != null && server.host_capacity > 0
              ? (server.host_used / server.host_capacity) * 100
              : null,
        },
        {
          label: 'Reuse path',
          value:
            server.checkpoint_selections != null &&
            server.root_selections != null &&
            server.checkpoint_selections + server.root_selections > 0
              ? pct(server.checkpoint_selections, server.checkpoint_selections + server.root_selections)
              : '—',
          detail: `${fmt(server.checkpoint_selections)} checkpoint · ${fmt(server.root_selections)} root`,
        },
      ]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title="Cache" summary="Prompt cache of the LLM server, refreshed every 5 s" />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
          {loading && !data ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorRow message={error} onRetry={reload} />
          ) : (
            <>
              <section>
                <Label>Server</Label>
                {server == null ? (
                  <p className="mt-2 text-xs text-ink-3">
                    The server exposes no cache metrics (/metrics); only ninfer does.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {tiles.map((t) => (
                        <Tile key={t.label} {...t} />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-3">
                      A full pool evicts the least reused entries first: prefixes shared between generations only survive when the pool has room.
                    </p>
                  </>
                )}
              </section>

              <section>
                <Label>Recent jobs</Label>
                {jobs.length === 0 ? (
                  <div className="mt-2">
                    <EmptyState title="No LLM calls yet" />
                  </div>
                ) : (
                  <table className="mt-2 w-full text-xs">
                    <thead>
                      <tr className="text-ink-3">
                        {['Job', 'Kind', 'Started', 'Calls', 'Prompt', 'Cached', 'Hit', 'Time', 'Per call'].map((h, i) => (
                          <th
                            key={h}
                            className={`py-1.5 pr-3 ${i === 1 || i === 2 || i === 8 ? 'text-left' : 'text-right font-mono tabular-nums'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => {
                        const s = stats(job);
                        const hit = s.prompt > 0 ? (s.cached / s.prompt) * 100 : null;
                        const cls = hit == null ? '' : hit >= 70 ? 'text-ok' : hit < 30 ? 'text-bad' : '';
                        return (
                          <tr key={job.id} className="border-t border-line">
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">#{shortId(job.id)}</td>
                            <td className="py-1.5 pr-3">{job.kind}</td>
                            <td className="py-1.5 pr-3">{job.created_at}</td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{job.calls.length}</td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmt(s.prompt)}</td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmt(s.cached)}</td>
                            <td className={`py-1.5 pr-3 text-right font-mono tabular-nums ${cls}`.trim()}>
                              {pct(s.cached, s.prompt)}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{s.time.toFixed(1)}s</td>
                            <td className="py-1.5 pr-3">
                              <div className="flex items-end gap-0.5">
                                {job.calls.map((c, i) => {
                                  const h = s.max > 0 ? Math.max(2, Math.min(24, (c.prompt / s.max) * 24)) : 2;
                                  const ch = c.prompt > 0 ? (c.cached / c.prompt) * h : 0;
                                  return (
                                    <div
                                      key={i}
                                      title={`prompt ${c.prompt} · cached ${c.cached} · out ${c.out} · ${c.seconds}s`}
                                      className="relative w-1.5 overflow-hidden rounded-sm bg-line"
                                      style={{ height: `${h}px` }}
                                    >
                                      <div className="absolute bottom-0 left-0 w-full bg-accent" style={{ height: `${ch}px` }} />
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
