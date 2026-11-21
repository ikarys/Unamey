// Visual universes: three concrete worlds for the product, proposed before any screen; the chosen one steers generation.
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Dices, Loader2 } from 'lucide-react';
import { api, type Universe } from '../api';
import { useJob } from '../hooks/useJob';
import { t } from '../i18n';
import { useApp } from './AppContext';

type Mode = 'safer' | 'bolder';

export function UniversePicker({ text, value, onChange }: { text: string; value: Universe | null; onChange: (u: Universe | null) => void }) {
  const { toast } = useApp();
  const [jobId, setJobId] = useState<string | null>(null);
  const [options, setOptions] = useState<Universe[]>([]);
  const [steer, setSteer] = useState('');
  const job = useJob(jobId, (j) => {
    if (j.status === 'failed') toast(t('universe.failed', { message: j.error ?? '' }));
    else setOptions(j.result?.universes ?? []);
    setJobId(null);
  });
  const busy = jobId !== null || (job !== null && job.status !== 'done' && job.status !== 'failed');

  async function propose(mode?: Mode) {
    try {
      const avoid = options.map((u) => u.name);
      setJobId(await api.universes({ text, steer: steer.trim() || undefined, mode, avoid: avoid.length ? avoid : undefined }));
    } catch (e) {
      toast(t('universe.failed', { message: (e as Error).message }));
    }
  }

  return (
    <section className="mb-6">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">{t('universe.title')}</h3>
      <p className="mb-3 mt-1 text-[12.5px] text-ink-3">{t('universe.note')}</p>
      {options.length === 0 ? (
        <button type="button" disabled={busy} onClick={() => void propose()} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-[13px] font-medium text-ink hover:border-line-strong disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4 text-accent" />}
          {busy ? t('universe.thinking') : t('universe.propose')}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {options.map((u) => {
              const picked = value?.name === u.name;
              return (
                <button key={u.name} type="button" aria-pressed={picked} onClick={() => onChange(picked ? null : u)}
                  className={`flex flex-col gap-2 overflow-hidden rounded-md border p-3 text-left transition ${picked ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong'}`}>
                  <div className="flex h-10 overflow-hidden rounded" aria-hidden>
                    {u.palette.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">{picked && <Check className="h-4 w-4 text-accent" />}{u.name}</div>
                  <div className="text-[12px] italic text-ink-3">{u.metaphor}</div>
                  <div className="text-[12.5px] text-ink-2">{u.pitch}</div>
                  <div className="text-[11.5px] text-ink-3">{u.materials.join(' · ')}</div>
                  <div className="text-[11.5px] text-ink-3"><span className="font-medium text-ink-2">{t('universe.risk')}</span> {u.risk}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={steer} maxLength={300} onChange={(e) => setSteer(e.target.value)} placeholder={t('universe.steer')} aria-label={t('universe.steer')}
              className="h-9 min-w-[16rem] flex-1 rounded-md border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-3" />
            <button type="button" disabled={busy} onClick={() => void propose('safer')} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] text-ink hover:border-line-strong disabled:opacity-50"><ArrowLeft className="h-4 w-4" />{t('universe.safer')}</button>
            <button type="button" disabled={busy} onClick={() => void propose()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] text-ink hover:border-line-strong disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}{t('universe.reroll')}</button>
            <button type="button" disabled={busy} onClick={() => void propose('bolder')} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] text-ink hover:border-line-strong disabled:opacity-50">{t('universe.bolder')}<ArrowRight className="h-4 w-4" /></button>
          </div>
        </>
      )}
    </section>
  );
}
