import { useEffect, useState } from 'react';
import { api, type Me, type User } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { useApp } from '../../components/AppContext';
import { Button, ErrorRow, EmptyState, Header, Label, SkeletonRows, confirmDialog } from '../../components/ui';
import { Ban, ChevronLeft, Copy, RotateCcw, Trash2 } from 'lucide-react';

type UserActionsState = {
  busy: string | null;
  suspend: (u: User) => Promise<void>;
  reactivate: (u: User) => Promise<void>;
  remove: (u: User) => Promise<void>;
};

function parseSelectedUser(): string | null {
  const query = location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get('u');
}

function useSelectedUser(): string | null {
  const [selected, setSelected] = useState<string | null>(parseSelectedUser);

  useEffect(() => {
    const onHashChange = () => setSelected(parseSelectedUser());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return selected;
}

function useUserActions(reload: () => void): UserActionsState {
  const { toast } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  async function suspend(u: User) {
    const ok = await confirmDialog(`Suspend ${u.email}? They are signed out and cannot sign in until reactivated.`, 'Suspend');
    if (!ok) return;
    setBusy(u.id);
    try {
      await api.setUserDisabled(u.id, true);
      toast(`Suspended ${u.email}`);
      await reload();
    } catch (e) {
      toast(String((e as Error).message));
    } finally {
      setBusy(null);
    }
  }

  async function reactivate(u: User) {
    setBusy(u.id);
    try {
      await api.setUserDisabled(u.id, false);
      toast(`Reactivated ${u.email}`);
      await reload();
    } catch (e) {
      toast(String((e as Error).message));
    } finally {
      setBusy(null);
    }
  }

  async function remove(u: User) {
    const ok = await confirmDialog(`Delete ${u.email} and all their projects, generations and share links? This cannot be undone.`, 'Delete');
    if (!ok) return;
    const wasDetail = parseSelectedUser() != null;
    setBusy(u.id);
    try {
      await api.deleteUser(u.id);
      toast(`Deleted ${u.email}`);
      if (wasDetail) {
        location.hash = '#/admin/users';
      }
      await reload();
    } catch (e) {
      toast(String((e as Error).message));
    } finally {
      setBusy(null);
    }
  }

  return { busy, suspend, reactivate, remove };
}

function UserActions({ u, me, actions }: { u: User; me: Me; actions: UserActionsState }) {
  const isSelf = u.id === me.id;
  const canAct = !isSelf && !u.admin;
  const isBusy = actions.busy === u.id;

  return (
    <div className="flex justify-end gap-2">
      {!canAct ? (
        <span className="text-xs text-ink-3">—</span>
      ) : (
        <>
          <Button
            onClick={() => (u.disabled ? actions.reactivate(u) : actions.suspend(u))}
            disabled={isBusy}
            aria-label={`${u.disabled ? 'Reactivate' : 'Suspend'} ${u.email}`}
          >
            {u.disabled ? <RotateCcw size={14} /> : <Ban size={14} />}
            {u.disabled ? 'Reactivate' : 'Suspend'}
          </Button>
          <Button
            className="!border-bad/40 !bg-bad/10 !text-bad enabled:hover:!border-bad enabled:hover:!bg-bad/20"
            onClick={() => actions.remove(u)}
            disabled={isBusy}
            aria-label={`Delete ${u.email}`}
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </>
      )}
    </div>
  );
}

function buildActivityMonths(byMonth: { month: string; generations: number }[]) {
  const now = new Date();
  const values = new Map<string, number>();
  for (const m of byMonth) {
    values.set(m.month, m.generations);
  }

  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = new Date(y, m - 1).toLocaleString('en', { month: 'short' });
    months.push({ key, label, value: values.get(key) ?? 0 });
  }

  return months;
}

function UserDetail({ u, me, actions }: { u: User; me: Me; actions: UserActionsState }) {
  const { toast } = useApp();
  const d = useAsync(() => api.userDetail(u.id), [u.id]);
  const detail = d.data;
  const isSelf = u.id === me.id;

  const lastActive = detail
    ? detail.sessions.reduce<string | null>((max, s) => {
        if (!s.last_seen) return max;
        if (!max || s.last_seen > max) return s.last_seen;
        return max;
      }, null)
    : null;

  const months = detail ? buildActivityMonths(detail.usage.by_month) : [];
  const maxGenerations = months.reduce((max, m) => Math.max(max, m.value), 0);
  const allZero = months.every((m) => m.value === 0);

  return (
    <div>
      <a href="#/admin/users" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-accent">
        <ChevronLeft size={14} />
        All users
      </a>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center">
            <h2 className="text-[18px] font-semibold">{u.name ?? u.email}</h2>
            {isSelf && (
              <span className="ml-2 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                you
              </span>
            )}
            {u.admin && (
              <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                admin
              </span>
            )}
            <span
              className={`ml-2 rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                u.disabled ? 'border-bad/40 bg-bad/10 text-bad' : 'border-ok/40 bg-ok/10 text-ok'
              }`}
            >
              {u.disabled ? 'Suspended' : 'Active'}
            </span>
          </div>
          {u.name && <p className="mt-1 text-[13px] text-ink-3">{u.email}</p>}
          <p className="mt-1 text-[13px] text-ink-3">
            Joined {u.created_at.slice(0, 10)}
            {lastActive ? ` · Last active ${lastActive.slice(0, 16)}` : ''}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
            Account ID <code className="font-mono text-ink-2">{u.id}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(u.id);
                toast('Account ID copied');
              }}
              className="rounded p-0.5 text-ink-3 hover:text-accent"
              aria-label="Copy account ID"
              title="Copy account ID"
            >
              <Copy size={12} />
            </button>
          </p>
        </div>
        <UserActions u={u} me={me} actions={actions} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-line bg-surface p-3">
          <Label>Generations this month</Label>
          <div className="mt-1 text-2xl font-mono tabular-nums">{u.generations_month}</div>
        </div>
        <div className="rounded border border-line bg-surface p-3">
          <Label>Generations in total</Label>
          <div className="mt-1 text-2xl font-mono tabular-nums">{u.generations_total}</div>
        </div>
        <div className="rounded border border-line bg-surface p-3">
          <Label>Projects</Label>
          <div className="mt-1 text-2xl font-mono tabular-nums">{detail ? detail.usage.total.projects : '—'}</div>
        </div>
        <div className="rounded border border-line bg-surface p-3">
          <Label>Cost this month</Label>
          <div className="mt-1 text-2xl font-mono tabular-nums">
            {u.cost_month == null ? '—' : `$${u.cost_month.toFixed(2)}`}
          </div>
        </div>
      </div>

      {d.loading && !detail ? (
        <div className="mt-8">
          <SkeletonRows n={4} />
        </div>
      ) : d.error ? (
        <ErrorRow message={d.error} onRetry={d.reload} />
      ) : detail ? (
        <>
          <section className="mt-8">
            <Label>Activity</Label>
            {allZero ? (
              <p className="mt-2 text-xs text-ink-3">No generations in the last 12 months.</p>
            ) : (
              <div className="mt-3 flex h-28 items-end gap-1.5">
                {months.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex h-20 w-full items-end">
                      {m.value > 0 ? (
                        <div
                          className="w-full rounded-sm bg-accent"
                          style={{ height: `${(m.value / maxGenerations) * 100}%`, minHeight: '2px' }}
                          title={`${m.key}: ${m.value} generations`}
                        />
                      ) : (
                        <div className="h-px w-full bg-line" title={`${m.key}: 0 generations`} />
                      )}
                    </div>
                    <span className="text-[10px] text-ink-3">{m.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <Label>Projects</Label>
            {detail.projects.length === 0 ? (
              <p className="mt-2 text-xs text-ink-3">No projects yet.</p>
            ) : (
              <table className="mt-3 w-full text-[13px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4 text-right">Concepts</th>
                    <th className="py-2 pr-4 text-right">Generations</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.projects.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="py-2 pr-4">
                        <span className="font-medium">{p.name}</span>
                        {p.archived && (
                          <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                            archived
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{p.concepts.length}</td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{p.generations}</td>
                      <td className="py-2 text-ink-2 tabular-nums" title={p.created_at}>
                        {p.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mt-8">
            <Label>Sessions</Label>
            {detail.sessions.length === 0 ? (
              <p className="mt-2 text-xs text-ink-3">No active sessions.</p>
            ) : (
              <table className="mt-3 w-full text-[13px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-ink-3">
                    <th className="py-2 pr-4">Device</th>
                    <th className="py-2 pr-4">Signed in</th>
                    <th className="py-2">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sessions.map((s) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="py-2 pr-4">
                        <span className="block max-w-[24rem] truncate" title={s.user_agent ?? 'Unknown'}>
                          {s.user_agent ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-ink-2 tabular-nums">{s.created_at.slice(0, 16)}</td>
                      <td className="py-2 text-ink-2 tabular-nums">
                        {s.last_seen ? s.last_seen.slice(0, 16) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mt-8">
            <Label>Recent jobs</Label>
            {detail.jobs.length === 0 ? (
              <p className="mt-2 text-xs text-ink-3">No jobs yet.</p>
            ) : (
              <>
                <table className="mt-3 w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-3">
                      <th className="py-2 pr-4">Started</th>
                      <th className="py-2 pr-4">Kind</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.jobs.slice(0, 10).map((j) => (
                      <tr key={j.id} className="border-t border-line">
                        <td className="py-2 pr-4 text-ink-2 tabular-nums whitespace-nowrap">
                          {j.created_at.slice(0, 16)}
                        </td>
                        <td className="py-2 pr-4">{j.kind}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                              j.status === 'failed'
                                ? 'border-bad/40 bg-bad/10 text-bad'
                                : j.status === 'done'
                                  ? 'border-ok/40 bg-ok/10 text-ok'
                                  : 'border-accent/40 bg-accent/10 text-accent'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="py-2 break-words">
                          {j.error ? (
                            <span className="text-bad">{j.error}</span>
                          ) : (
                            <span className="text-ink-2">{j.progress || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.jobs.length > 10 && (
                  <p className="mt-2 text-xs text-ink-3">
                    Showing the 10 most recent of {detail.jobs.length === 50 ? '50+' : detail.jobs.length} jobs.
                  </p>
                )}
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export function Users() {
  const { me } = useApp();
  const { data, error, loading, reload } = useAsync(api.users, []);
  const actions = useUserActions(reload);
  const selected = useSelectedUser();

  const accounts = data ?? [];
  const suspendedCount = accounts.filter((u) => u.disabled).length;
  const totalCost = accounts.reduce((sum, u) => sum + (u.cost_month ?? 0), 0);
  const maxCost = accounts.reduce((max, u) => Math.max(max, u.cost_month ?? 0), 0);
  const summary = `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}${suspendedCount > 0 ? ` · ${suspendedCount} suspended` : ''} · $${totalCost.toFixed(2)} this month`;
  const selectedUser = selected && data ? data.find((u) => u.id === selected) ?? null : null;
  const headerSummary = me.multi_user && data ? (selected ? (selectedUser ? selectedUser.email : undefined) : summary) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title="Users" summary={headerSummary} />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-6">
          {!me.multi_user ? (
            <EmptyState title="Accounts are off">
              <p className="text-sm text-ink-2">
                The studio runs in single-user mode. Start it with STUDIO_ORIGIN set (`just multi-user` in dev) to sign people up and manage them here.
              </p>
            </EmptyState>
          ) : loading && !data ? (
            <SkeletonRows n={5} />
          ) : error ? (
            <ErrorRow message={error} onRetry={reload} />
          ) : !data ? null : selected ? (
            selectedUser ? (
              <UserDetail u={selectedUser} me={me} actions={actions} />
            ) : (
              <EmptyState title="No such account">
                <a href="#/admin/users" className="text-sm text-accent hover:underline">
                  Back to users
                </a>
              </EmptyState>
            )
          ) : data.length === 0 ? (
            <EmptyState title="No accounts yet" />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-xs font-medium text-ink-3">
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2 pr-4 text-right">This month</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Cost this month</th>
                  <th className="py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => {
                  const isSelf = u.id === me.id;
                  return (
                    <tr key={u.id} className="border-t border-line">
                      <td className="py-2.5 pr-4 align-middle">
                        <div>
                          <a
                            href={`#/admin/users?u=${u.id}`}
                            className={
                              u.disabled
                                ? 'font-medium text-ink-3 hover:text-accent hover:underline'
                                : 'font-medium hover:text-accent hover:underline'
                            }
                          >
                            {u.name ?? u.email}
                          </a>
                          {isSelf && (
                            <span className="ml-2 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                              you
                            </span>
                          )}
                          {u.admin && (
                            <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                              admin
                            </span>
                          )}
                        </div>
                        {u.name && <div className="mt-0.5 text-[11px] text-ink-3">{u.email}</div>}
                      </td>
                      <td className="py-2.5 pr-4 align-middle">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${
                            u.disabled ? 'border-bad/40 bg-bad/10 text-bad' : 'border-ok/40 bg-ok/10 text-ok'
                          }`}
                        >
                          {u.disabled ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 align-middle text-ink-2 tabular-nums" title={u.created_at}>
                        {u.created_at.slice(0, 10)}
                      </td>
                      <td className="py-2.5 pr-4 text-right align-middle font-mono tabular-nums">{u.generations_month}</td>
                      <td className="py-2.5 pr-4 text-right align-middle font-mono tabular-nums">{u.generations_total}</td>
                      <td className="py-2.5 pr-4 text-right align-middle">
                        <div className="font-mono tabular-nums">
                          {u.cost_month == null ? '—' : `$${u.cost_month.toFixed(2)}`}
                        </div>
                        {u.cost_month != null && maxCost > 0 && (
                          <div className="ml-auto mt-1 h-1 w-16 rounded bg-line">
                            <div className="h-full rounded bg-accent" style={{ width: `${(u.cost_month / maxCost) * 100}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 align-middle">
                        <UserActions u={u} me={me} actions={actions} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
