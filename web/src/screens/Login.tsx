import { useState } from 'react';
import { api } from '../api';
import { Button, Label, inputCls } from '../components/ui';
import { t } from '../i18n';

// Multi-user mode only: email + password sign in / sign up.
export function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      if (mode === 'signin') await api.login(email.trim(), password);
      else await api.signup(name.trim(), email.trim(), password);
      location.hash = '#/generate'; onDone();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const toggle = () => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); };
  return (
    <div className="flex h-full items-center justify-center">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="w-[360px] rounded border border-line bg-surface p-5">
        <h1 className="mb-1 flex items-center gap-2 text-[15px] font-bold tracking-tight text-ink"><img src="/icon-192.png" width="22" height="22" alt="" className="h-[22px] w-[22px] rounded" />Unamey</h1>
        <p className="mb-4 text-[12px] text-ink-2">{mode === 'signin' ? t('login.signInSubtitle') : t('login.createAccountSubtitle')}</p>
        {mode === 'signup' && (
          <div className="mb-3">
            <Label>{t('login.name')}</Label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputCls} aria-label={t('login.name')} />
          </div>
        )}
        <Label>{t('login.email')}</Label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputCls} aria-label={t('login.email')} autoFocus />
        <div className="mt-3">
          <Label>{t('login.password')}</Label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className={inputCls} aria-label={t('login.password')} />
          {mode === 'signup' && <p className="mt-1 text-[11px] text-ink-3">{t('login.passwordMin')}</p>}
        </div>
        {error && <p className="mt-2 text-[11px] text-bad">{error}</p>}
        <div className="mt-4 flex justify-end"><Button primary disabled={busy || !email.includes('@') || password.length < 8 || (mode === 'signup' && !name.trim())}>{mode === 'signin' ? t('login.signIn') : t('login.createAccount')}</Button></div>
        <button type="button" onClick={toggle} className="mt-3 text-[11px] text-ink-2 hover:text-ink underline">
          {mode === 'signin' ? t('login.noAccount') : t('login.haveAccount')}
        </button>
      </form>
    </div>
  );
}
