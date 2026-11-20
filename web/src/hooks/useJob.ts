import { useEffect, useRef, useState } from 'react';
import { api, type Job } from '../api';

// Polls /api/jobs/:id every second while the job is queued/running; calls onDone once at the end.
export function useJob(id: string | null, onDone?: (j: Job) => void) {
  const [job, setJob] = useState<Job | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (id == null) { setJob(null); return; }
    let alive = true;
    const tick = async () => {
      try {
        const j = await api.job(id);
        if (!alive) return;
        setJob(j);
        if (j.status === 'done' || j.status === 'failed') { clearInterval(t); done.current?.(j); }
      } catch { /* transient; next tick retries */ }
    };
    const t = setInterval(tick, 1000);
    tick();
    return () => { alive = false; clearInterval(t); };
  }, [id]);
  return job;
}
