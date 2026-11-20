import { useCallback, useEffect, useState } from 'react';

export interface Async<T> { data: T | null; error: string | null; loading: boolean; reload: () => void }

// Loads on mount and whenever deps change; `reload` refetches without clearing data.
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], intervalMs = 0): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [n, setN] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fnRef = useCallback(fn, deps);
  useEffect(() => {
    let alive = true;
    const run = () =>
      fnRef().then(
        (d) => alive && (setData(d), setError(null), setLoading(false)),
        (e) => alive && (setError(String(e.message ?? e)), setLoading(false))
      );
    run();
    const t = intervalMs ? setInterval(run, intervalMs) : undefined;
    return () => { alive = false; clearInterval(t); };
  }, [fnRef, n, intervalMs]);
  return { data, error, loading, reload: useCallback(() => setN((x) => x + 1), []) };
}
