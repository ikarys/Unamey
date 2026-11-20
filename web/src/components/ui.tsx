import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle, Info, RotateCw, X } from 'lucide-react';
import { t } from '../i18n';

/** Closes a dropdown on a click outside the returned ref's element or on Escape. */
export function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

export const inputCls =
  'h-9 w-full rounded-md border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent';
export const areaCls = `${inputCls} h-auto resize-y py-2`;
export const linkCls = 'text-accent hover:underline';
export const labelCls = 'text-[13px] font-semibold text-ink';

// Info icon with a bubble on hover or keyboard focus; `up` opens it above (for panels pinned at the bottom).
export function Hint({ children, up }: { children: React.ReactNode; up?: boolean }) {
  return (
    <span className="group/hint relative inline-flex align-middle">
      <button type="button" aria-label={t('ui.moreInfo')} className="text-ink-3 hover:text-ink"><Info size={14} /></button>
      <span role="tooltip" className={`pointer-events-none invisible absolute left-0 z-30 w-56 rounded-md border border-line bg-surface p-2.5 text-[12px] font-normal leading-snug text-ink-2 opacity-0 shadow-soft transition group-hover/hint:visible group-hover/hint:opacity-100 group-focus-within/hint:visible group-focus-within/hint:opacity-100 ${up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
        {children}
      </span>
    </span>
  );
}

export const Label = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`${labelCls} mb-1.5 ${className}`}>{children}</div>
);

export function Header({ title, summary, children }: { title: string; summary?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-6">
      <h1 className="text-[16px] font-semibold">{title}</h1>
      {summary && <span className="text-[13px] text-ink-3">{summary}</span>}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}

export function Button({ primary, className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      {...p}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium transition disabled:cursor-not-allowed ${
        primary ? 'border-accent bg-accent text-accent-ink shadow-accent enabled:hover:brightness-110 disabled:opacity-50 disabled:shadow-none' : 'border-accent/40 bg-accent/10 text-accent enabled:hover:border-accent enabled:hover:bg-accent/20 disabled:opacity-50'
      } ${className}`}
    />
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T | null; options: { value: T; label?: React.ReactNode; title?: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} title={o.title} onClick={() => onChange(o.value)}
          className={`inline-flex h-7 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-sm px-2 text-[13px] ${value === o.value ? 'bg-accent font-semibold text-accent-ink shadow-accent' : 'text-ink-2 hover:bg-raised hover:text-ink'}`}>
          {o.label ?? o.value}
        </button>
      ))}
    </div>
  );
}

export function Chips({ tags, onRemove, max }: { tags: string[]; onRemove?: (t: string) => void; max?: number }) {
  const shown = max ? tags.slice(0, max) : tags;
  return (
    <span className={`flex gap-1 ${max ? "overflow-hidden" : "flex-wrap"}`}>
      {shown.map((tag) => (
        <span key={tag} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-line px-2 text-[12px] text-ink-2" title={tag}>
          {tag}
          {onRemove && (
            <button aria-label={t('ui.removeTag', { tag })} onClick={() => onRemove(tag)} className="text-ink-3 hover:text-ink"><X size={12} /></button>
          )}
        </span>
      ))}
      {max && tags.length > max && <span className="inline-flex h-6 items-center text-[12px] text-ink-3">+{tags.length - max}</span>}
    </span>
  );
}

const TONE: Record<string, string> = {
  queued: 'bg-warn', running: 'bg-info', done: 'bg-ok', failed: 'bg-bad', good: 'bg-ok', mixed: 'bg-warn', bad: 'bg-bad'
};
export const Dot = ({ status, title }: { status: string; title?: string }) => (
  <span title={title ?? status} className={`inline-block size-1.5 shrink-0 rounded-full ${TONE[status] ?? 'bg-ink-3'}`} />
);

const OP: Record<string, string> = {
  create: 'text-ok border-ok/40', update: 'text-info border-info/40', attach: 'text-ink-2 border-line-strong', retire: 'text-bad border-bad/40'
};
export const Badge = ({ kind }: { kind: string }) => (
  <span className={`inline-flex h-5 shrink-0 items-center rounded-sm border px-1.5 text-[12px] ${OP[kind] ?? OP.attach}`}>{kind}</span>
);

export const SkeletonRows = ({ n = 8, h = 'h-[30px]' }: { n?: number; h?: string }) => (
  <div className="flex flex-col gap-1 p-2" aria-busy="true">
    {Array.from({ length: n }, (_, i) => <div key={i} className={`skeleton ${h}`} />)}
  </div>
);

export function ErrorRow({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-2 flex h-8 items-center gap-2 text-[13px] text-bad">
      <AlertCircle size={16} className="shrink-0" />
      <span className="truncate">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto inline-flex items-center gap-1 hover:underline"><RotateCw size={14} /> {t('ui.retry')}</button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
      <div className={labelCls}>{title}</div>
      {children && <div className="max-w-sm text-[13px] text-ink-3">{children}</div>}
    </div>
  );
}

export const Toast = ({ msg }: { msg: string | null }) =>
  msg && (
    <div role="status" className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full border border-line bg-surface px-4 py-2 text-[13px] shadow-soft">
      {msg}
    </div>
  );

// Selected-row treatment shared by every list: 2px accent bar + accent-tinted background.
export const rowCls = (on: boolean) =>
  `border-l-2 ${on ? 'border-accent bg-accent/8' : 'border-transparent hover:bg-raised/60'}`;

/** A large view of an image in a native modal <dialog> (Esc closes); a click on the backdrop or the close button closes too. */
export function ImageZoom({ src, title, text, onClose }: { src: string | null; title?: string; text?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (src && !dialog.open) dialog.showModal();
    if (!src && dialog.open) dialog.close();
  }, [src]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto max-h-[92vh] w-[min(1400px,94vw)] overflow-visible bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {src && (
        <div className="relative rounded-lg bg-surface p-3 shadow-soft">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-surface text-ink shadow-soft hover:text-accent"
          >
            <X size={18} />
          </button>
          <img src={src} alt={title ?? ''} className="max-h-[78vh] w-full rounded-md object-contain object-top" />
          {title && (
            <div className="px-1 pt-3">
              <div className="text-[15px] font-semibold text-ink">{title}</div>
              {text && <p className="mt-1 text-[13px] text-ink-2">{text}</p>}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

/** A styled replacement for window.confirm: a native modal <dialog>, resolves true on confirm, false on cancel / Esc / backdrop click. Destructive by default (red confirm button); pass danger = false for an accent one. */
export function confirmDialog(message: string, confirmLabel = t('common.confirm'), danger = true): Promise<boolean> {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
      setTimeout(() => {
        root.unmount();
        div.remove();
      }, 0);
    };

    root.render(<ConfirmBox message={message} confirmLabel={confirmLabel} danger={danger} done={done} />);
  });
}

function ConfirmBox({ message, confirmLabel, danger, done }: { message: string; confirmLabel: string; danger: boolean; done: (v: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={() => done(false)}
      onClick={(e) => {
        if (e.target === e.currentTarget) done(false);
      }}
      className="m-auto w-[min(420px,92vw)] rounded-lg bg-surface p-0 text-ink shadow-soft backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-5 p-5">
        <p className="text-[14px] leading-relaxed text-ink">{message}</p>
        <div className="flex justify-end gap-2">
          <Button autoFocus onClick={() => done(false)}>{t('common.cancel')}</Button>
          {danger
            ? <button type="button" onClick={() => done(true)} className="inline-flex h-9 items-center rounded-md border border-bad bg-bad px-3 text-[13px] font-medium text-white transition hover:brightness-110">{confirmLabel}</button>
            : <Button primary onClick={() => done(true)}>{confirmLabel}</Button>}
        </div>
      </div>
    </dialog>
  );
}
