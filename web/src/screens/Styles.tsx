// The style catalogue: one section per look with an example screen (same product for every look,
// so only the style changes). Examples are static images in public/styles/, made by `just style-examples`.
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { api, type Archetype } from '../api';
import { useAsync } from '../hooks/useAsync';
import { ErrorRow, ImageZoom } from '../components/ui';
import { t, look } from '../i18n';

function Example({ id, name, onZoom }: { id: string; name: string; onZoom: () => void }) {
  const [missing, setMissing] = useState(false);
  return missing ? (
    <div className="grid aspect-[16/10] w-full place-items-center rounded-md border border-line bg-raised text-ink-3"><ImageOff className="h-6 w-6" /></div>
  ) : (
    <button type="button" onClick={onZoom} className="block w-full cursor-zoom-in" aria-label={t('styles.zoom', { name })}>
      <img src={`/styles/${id}.jpg`} alt={t('styles.exampleAlt', { name })} loading="lazy" onError={() => setMissing(true)}
        className="aspect-[16/10] w-full rounded-md border border-line object-cover object-top shadow-soft transition hover:shadow-lg" />
    </button>
  );
}

function Section({ a, flip }: { a: Archetype; flip: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <section id={a.id} className={`flex scroll-mt-6 flex-col items-center gap-8 py-10 md:flex-row ${flip ? 'md:flex-row-reverse' : ''}`}>
      <div className="w-full md:w-3/5"><Example id={a.id} name={look(a).name} onZoom={() => setZoomed(true)} /></div>
      <div className="w-full md:w-2/5">
        <h3 className="text-[20px] font-semibold tracking-tight text-ink">{look(a).name}</h3>
        <p className="mt-3 text-[14px] leading-6 text-ink-2">{look(a).desc}</p>
        <a href={`#/?look=${a.id}`} className="mt-5 inline-flex h-10 items-center rounded-md bg-accent px-4 font-semibold text-accent-ink shadow-accent hover:-translate-y-0.5">{t('styles.useThisStyle')}</a>
      </div>
      <ImageZoom src={zoomed ? `/styles/${a.id}.jpg` : null} title={look(a).name} text={look(a).desc} onClose={() => setZoomed(false)} />
    </section>
  );
}

export function Styles() {
  const { data, error, reload } = useAsync(api.archetypes, []);
  const groups: [string, string, Archetype[]][] = [
    [t('styles.workTools'), t('styles.workToolsSub'), (data ?? []).filter((a) => a.kind !== 'consumer')],
    [t('styles.playful'), t('styles.playfulSub'), (data ?? []).filter((a) => a.kind === 'consumer')]
  ];
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <h1 className="text-[28px] font-bold tracking-tight text-ink">{t('styles.title')}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-ink-2">{t('styles.subtitle')}</p>
        {error && <div className="mt-6"><ErrorRow message={error} onRetry={reload} /></div>}
        {groups.map(([title, sub, list]) => list.length > 0 && (
          <div key={title} className="mt-12">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{title}</h2>
            <p className="mt-1 text-[13px] text-ink-3">{sub}</p>
            <div className="divide-y divide-line">{list.map((a, i) => <Section key={a.id} a={a} flip={i % 2 === 1} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
