// My account screen for signed-in users in multi-user mode.
import { useEffect, useState, type ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useApp } from '../components/AppContext';
import { Button, ErrorRow, Label, SkeletonRows, confirmDialog, inputCls } from '../components/ui';
import { t, tn, fmtDate, fmtAgo, lang } from '../i18n';

type Tab = 'profile' | 'security' | 'usage';

const initialTab = (): Tab => {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '').get('tab');
  return q === 'security' || q === 'usage' ? q : 'profile';
};

const device = (ua: string | null): string => {
  if (!ua) return t('account.unknownDevice');
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : null;
  if (browser && os) return `${browser} · ${os}`;
  return browser ?? os ?? t('account.unknownDevice');
};

const isMobile = (ua: string | null): boolean => !!ua && /Android|iPhone|iPad/.test(ua);

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-[13px] text-ink-3">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Account() {
  const { toast, signOut } = useApp();
  const acc = useAsync(api.account, []);
  const sessions = useAsync(api.sessions, []);
  const usage = useAsync(api.usage, []);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [deletePass, setDeletePass] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busyChange, setBusyChange] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [busyRevokeOthers, setBusyRevokeOthers] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState(false);

  useEffect(() => {
    if (acc.data) setNameValue(acc.data.name ?? '');
  }, [acc.data]);

  const change = async () => {
    setBusyChange(true);
    setChangeError(null);
    try {
      await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirmPass('');
      toast(t('account.passwordChanged'));
      sessions.reload();
    } catch (e) {
      setChangeError((e as Error).message);
    } finally {
      setBusyChange(false);
    }
  };

  const saveName = async () => {
    setBusyName(true);
    setNameError(null);
    try {
      await api.setName(nameValue.trim());
      toast(t('account.nameSaved'));
      acc.reload();
    } catch (e) {
      setNameError((e as Error).message);
    } finally {
      setBusyName(false);
    }
  };

  const remove = async () => {
    if (!(await confirmDialog(t('account.deleteConfirm')))) return;
    setBusyDelete(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(deletePass);
      signOut();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setBusyDelete(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await api.revokeSession(id);
      sessions.reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const revokeOthers = async () => {
    setBusyRevokeOthers(true);
    try {
      const r = await api.revokeOtherSessions();
      toast(tn('account.revoked', r.revoked));
      sessions.reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusyRevokeOthers(false);
    }
  };

  const months = usage.data
    ? Array.from({ length: 6 }, (_, i) => {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return {
          key,
          label: d.toLocaleDateString(undefined, { month: 'short' }),
          long: d.toLocaleDateString(lang, { month: 'long', year: 'numeric' }),
          value: usage.data?.by_month.find((b) => b.month === key)?.generations ?? 0
        };
      })
    : [];
  const maxMonth = Math.max(0, ...months.map((m) => m.value));
  const noUsage = months.length > 0 && months.every((m) => m.value === 0);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: t('account.tabProfile') },
    { id: 'security', label: t('account.tabSecurity') },
    { id: 'usage', label: t('account.tabUsage') }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-[28px] font-bold tracking-tight">{t('account.title')}</h1>
        <p className="mt-1 text-[14px] text-ink-2">{acc.data?.email ?? ''}</p>

        {acc.error && (
          <div className="mt-6">
            <ErrorRow message={acc.error} onRetry={acc.reload} />
          </div>
        )}
        {acc.loading && !acc.data && (
          <div className="mt-6">
            <SkeletonRows n={5} />
          </div>
        )}

        {acc.data && (
          <>
            <div role="tablist" aria-label={t('account.tabs')} className="mt-8 flex border-b border-line">
              {tabs.map((tb) => (
                <button
                  key={tb.id}
                  role="tab"
                  aria-selected={tab === tb.id}
                  onClick={() => setTab(tb.id)}
                  className={`px-1 pb-2.5 mr-6 text-[14px] ${
                    tab === tb.id ? 'border-b-2 border-accent text-ink font-medium' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'profile' && (
                <div className="space-y-5">
                  <Card title={t('account.profile')}>
                    <div className="flex flex-col gap-3">
                      <div>
                        <Label>{t('account.name')}</Label>
                        <input
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          className={inputCls}
                          aria-label={t('account.name')}
                        />
                        {acc.data?.name == null && (
                          <p className="mt-1 text-[11px] text-ink-3">{t('account.nameMissing')}</p>
                        )}
                      </div>
                      {nameError && <ErrorRow message={nameError} onRetry={saveName} />}
                      <div className="flex justify-end">
                        <Button
                          onClick={saveName}
                          disabled={busyName || !nameValue.trim() || nameValue.trim() === (acc.data?.name ?? '')}
                        >
                          {t('account.saveName')}
                        </Button>
                      </div>
                    </div>
                    <dl className="mt-4 flex flex-col gap-2 text-[13px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-3">{t('account.email')}</dt>
                        <dd className="font-mono text-[12px]">{acc.data.email}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-3">{t('account.role')}</dt>
                        <dd>{acc.data.admin ? t('account.roleAdmin') : t('account.roleMember')}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-3">{t('account.memberSince')}</dt>
                        <dd>{fmtDate(acc.data.created_at)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={signOut}>{t('account.signOut')}</Button>
                    </div>
                  </Card>

                  <Card title={t('account.dangerZone')} hint={t('account.dangerZoneHint')}>
                    {acc.data.admin ? (
                      <p className="text-[13px] text-ink-3">{t('account.adminCannotDelete')}</p>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); remove(); }} className="flex flex-col gap-3">
                        <p className="text-[13px] text-ink-2">{t('account.deleteHint')}</p>
                        <div>
                          <Label>{t('account.password')}</Label>
                          <input
                            type="password"
                            value={deletePass}
                            onChange={(e) => setDeletePass(e.target.value)}
                            autoComplete="current-password"
                            className={inputCls}
                            aria-label={t('account.password')}
                          />
                        </div>
                        {deleteError && <p className="text-[12px] text-bad">{deleteError}</p>}
                        <div className="flex justify-end">
                          <Button type="submit" disabled={busyDelete || !deletePass} className="!border-bad !text-bad">
                            {t('account.deleteAccount')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </Card>
                </div>
              )}

              {tab === 'security' && (
                <div className="space-y-5">
                  <Card title={t('account.changePassword')} hint={t('account.changePasswordHint')}>
                    <form onSubmit={(e) => { e.preventDefault(); change(); }} className="flex flex-col gap-3">
                      <div>
                        <Label>{t('account.currentPassword')}</Label>
                        <input
                          type="password"
                          value={current}
                          onChange={(e) => setCurrent(e.target.value)}
                          autoComplete="current-password"
                          className={inputCls}
                          aria-label={t('account.currentPassword')}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label>{t('account.newPassword')}</Label>
                          <input
                            type="password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            autoComplete="new-password"
                            className={inputCls}
                            aria-label={t('account.newPassword')}
                          />
                        </div>
                        <div>
                          <Label>{t('account.confirmPassword')}</Label>
                          <input
                            type="password"
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            autoComplete="new-password"
                            className={inputCls}
                            aria-label={t('account.confirmPassword')}
                          />
                        </div>
                      </div>
                      {changeError && <p className="text-[12px] text-bad">{changeError}</p>}
                      <div className="flex justify-end">
                        <Button type="submit" primary disabled={busyChange || next.length < 8 || next !== confirmPass}>
                          {t('account.changePassword')}
                        </Button>
                      </div>
                    </form>
                  </Card>

                  <Card title={t('account.sessions')} hint={t('account.sessionsHint')}>
                    {sessions.error && <ErrorRow message={sessions.error} onRetry={sessions.reload} />}
                    {sessions.loading && !sessions.data && <SkeletonRows n={3} />}
                    {sessions.data && (
                      <>
                        <ul className="divide-y divide-line">
                          {sessions.data.map((s) => (
                            <li key={s.id} className="flex items-center gap-3 py-3">
                              {isMobile(s.user_agent) ? (
                                <Smartphone size={16} className="shrink-0 text-ink-3" />
                              ) : (
                                <Monitor size={16} className="shrink-0 text-ink-3" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[13px] text-ink">{device(s.user_agent)}</span>
                                  {s.current && (
                                    <span className="rounded-sm bg-raised px-1.5 py-0.5 text-[11px] font-medium text-accent">
                                      {t('account.thisDevice')}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 text-[12px] text-ink-3">
                                  {t('account.lastSeen', { when: fmtAgo(s.last_seen ?? s.created_at) })} ·{' '}
                                  {t('account.signedIn', { when: fmtDate(s.created_at) })}
                                </div>
                              </div>
                              {!s.current && (
                                <button type="button" onClick={() => revoke(s.id)} className="text-[13px] text-ink-3 hover:text-bad">
                                  {t('account.revoke')}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                        {sessions.data.length > 1 && (
                          <div className="mt-4 flex justify-end">
                            <Button disabled={busyRevokeOthers} onClick={revokeOthers}>
                              {t('account.revokeOthers')}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                </div>
              )}

              {tab === 'usage' && (
                <div className="space-y-5">
                  {usage.error && <ErrorRow message={usage.error} onRetry={usage.reload} />}
                  {usage.loading && !usage.data && <SkeletonRows n={4} />}
                  {usage.data && (
                    <>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-lg border border-line bg-surface p-4">
                          <div className="text-[12px] text-ink-3">{t('account.thisMonthScreens')}</div>
                          <div className="mt-1 text-[26px] font-semibold text-ink tabular-nums">{usage.data.month.generations}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface p-4">
                          <div className="text-[12px] text-ink-3">{t('account.thisMonthProjects')}</div>
                          <div className="mt-1 text-[26px] font-semibold text-ink tabular-nums">{usage.data.month.projects}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface p-4">
                          <div className="text-[12px] text-ink-3">{t('account.totalScreens')}</div>
                          <div className="mt-1 text-[26px] font-semibold text-ink tabular-nums">{usage.data.total.generations}</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface p-4">
                          <div className="text-[12px] text-ink-3">{t('account.totalProjects')}</div>
                          <div className="mt-1 text-[26px] font-semibold text-ink tabular-nums">{usage.data.total.projects}</div>
                        </div>
                      </div>

                      <Card title={t('account.screensPerMonth')} hint={t('account.screensPerMonthHint')}>
                        {noUsage ? (
                          <p className="text-[13px] text-ink-3">{t('account.noUsageYet')}</p>
                        ) : (
                          <>
                            <div className="flex h-40 items-end gap-2 border-b border-line">
                              {months.map((mo, i) => {
                                const isCurrent = i === months.length - 1;
                                const label = tn('account.screensIn', mo.value, { month: mo.long });
                                return (
                                  <div
                                    key={mo.key}
                                    tabIndex={0}
                                    title={label}
                                    aria-label={label}
                                    className="relative flex h-full flex-1 items-end justify-center rounded focus:outline-none focus:ring-2 focus:ring-accent hover:opacity-80"
                                  >
                                    {isCurrent && (
                                      <span className="absolute bottom-full mb-1 text-[12px] text-ink-2 tabular-nums">{mo.value}</span>
                                    )}
                                    {mo.value > 0 ? (
                                      <div
                                        className="w-full max-w-[44px] rounded-t-[4px] bg-accent"
                                        style={{ height: `${Math.max(2, (mo.value / maxMonth) * 100)}%` }}
                                      />
                                    ) : (
                                      <div className="h-px w-full max-w-[44px] bg-line" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-2 flex gap-2">
                              {months.map((mo) => (
                                <div key={mo.key} className="flex-1 text-center text-[12px] text-ink-3">
                                  {mo.label}
                                </div>
                              ))}
                            </div>
                            <table className="sr-only">
                              <caption>{t('account.perMonth')}</caption>
                              <thead>
                                <tr>
                                  <th scope="col">{t('account.month')}</th>
                                  <th scope="col">{t('account.screens')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {months.map((mo) => (
                                  <tr key={mo.key}>
                                    <th scope="row">{mo.long}</th>
                                    <td>{mo.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        )}
                      </Card>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
