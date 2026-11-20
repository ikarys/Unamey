import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, api } from './api';
import { useAsync } from './hooks/useAsync';
import { AppContext } from './components/AppContext';
import { SCREENS, ShortcutsOverlay, TopBar, areaOf, visibleScreens, type ScreenId } from './components/Shell';
import { ErrorRow, Toast } from './components/ui';
import { HelpDrawer, type HelpSection } from './components/Help';
import { Generate } from './screens/Generate';
import { Home } from './screens/Home';
import { Styles } from './screens/Styles';
import { Gallery } from './screens/Gallery';
import { Models } from './screens/admin/Models';
import { Users } from './screens/admin/Users';
import { Jobs } from './screens/admin/Jobs';
import { Cache } from './screens/admin/Cache';
import { Account } from './screens/Account';
import { Login } from './screens/Login';

const fromHash = (): ScreenId | null => {
  const h = location.hash.replace('#/', '').split('?')[0];
  const id = h === 'admin' ? 'admin/models' : h || 'home';
  return SCREENS.some((s) => s.id === id) ? (id as ScreenId) : null;
};

const THEME_KEY = 'studio:theme';

export default function App() {
  const [route, setRoute] = useState<ScreenId | null>(fromHash);
  const [help, setHelp] = useState(false);
  const [guide, setGuide] = useState<HelpSection | null>(null);
  const [dark, setDark] = useState(() => (localStorage.getItem(THEME_KEY) ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark');
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const me = useAsync(() => api.me().catch((e) => (e instanceof ApiError && e.status === 401 ? 'anonymous' : Promise.reject(e))), []);
  const user = typeof me.data === 'object' ? me.data : null;
  const st = useAsync(() => (user ? api.status() : Promise.resolve(null)), [user], 3000);
  const screens = useMemo(() => (user ? visibleScreens(user) : []), [user]);

  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3000);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  useEffect(() => {
    const on = () => setRoute(fromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    const on = (e: Event) => setGuide((e as CustomEvent<HelpSection>).detail);
    addEventListener('studio:help', on);
    return () => removeEventListener('studio:help', on);
  }, []);

  useEffect(() => {
    if (!user) return;
    const on = () => me.reload();
    addEventListener('studio:unauthorized', on);
    return () => removeEventListener('studio:unauthorized', on);
  }, [user, me.reload]);

  const base = route ?? 'home';
  const screen: ScreenId = screens.some((s) => s.id === base) ? base : 'home';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || e.ctrlKey || e.metaKey) return;
      if (e.key === '?') setHelp((h) => !h);
      else if (e.key === 'Escape') { setHelp(false); setGuide(null); }
      else if (/^[1-9]$/.test(e.key)) {
        const areaScreens = screens.filter((s) => s.nav !== false && s.area === areaOf(screen));
        const target = areaScreens[+e.key - 1];
        if (target) location.hash = `#/${target.id}`;
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [screens, screen]);

  if (me.error) return <div className="p-4"><ErrorRow message={me.error} onRetry={me.reload} /></div>;
  if (!user) {
    return me.data === 'anonymous' ? (
      <div className="h-full">
        <Login onDone={me.reload} />
        <Toast msg={msg} />
      </div>
    ) : null;
  }

  return (
    <AppContext.Provider value={{ status: st.data, refreshStatus: st.reload, toast, me: user, signOut: async () => { await api.logout().catch(() => undefined); me.reload(); } }}>
      <div className="flex h-full flex-col">
        <TopBar current={screen} onHelp={() => setHelp((h) => !h)} dark={dark} onTheme={() => { localStorage.setItem(THEME_KEY, dark ? 'light' : 'dark'); setDark(!dark); }} />
        <main className="min-h-0 flex-1 overflow-hidden">
          {screen === 'home' && <Home />}
          {screen === 'generate' && <Generate />}
          {screen === 'gallery' && <Gallery />}
          {screen === 'styles' && <Styles />}
          {screen === 'admin/models' && <Models />}
          {screen === 'admin/users' && <Users />}
          {screen === 'admin/jobs' && <Jobs />}
          {screen === 'admin/cache' && <Cache />}
          {screen === 'account' && <Account />}
        </main>
      </div>
      {help && <ShortcutsOverlay onClose={() => setHelp(false)} />}
      {guide && <HelpDrawer section={guide} onClose={() => setGuide(null)} />}
      <Toast msg={msg} />
    </AppContext.Provider>
  );
}
