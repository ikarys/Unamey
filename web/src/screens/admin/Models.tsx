import { useEffect, useState } from 'react';
import { api, type ModelRef, type Price, type ProviderView, type Routing, type SettingsBody } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { useApp } from '../../components/AppContext';
import { Button, ErrorRow, Header, Label, Segmented, SkeletonRows, areaCls, inputCls, labelCls } from '../../components/ui';
import { ArrowUp, KeyRound, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';

type Tab = 'providers' | 'routes';

type Panel =
  | { kind: 'connection'; providerId: string | null }
  | { kind: 'model'; providerId: string; modelId: string | null };

type ConnDraft = {
  id: string | null;
  name: string;
  base_url: string;
  api_key: string;
  keyTouched: boolean;
  parallel: number;
};

type ModelDraft = {
  providerId: string;
  modelId: string;
  isNew: boolean;
  input: string;
  cached: string;
  output: string;
  extras: string;
};

const key = (r: ModelRef) => `${r.provider}/${r.model}`;
const parse = (v: string): ModelRef => {
  const i = v.indexOf('/');
  return { provider: v.slice(0, i), model: v.slice(i + 1) };
};

const refValue = (r: ModelRef) => (r.provider && r.model ? key(r) : '');

const priceNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toBodyProvider = (p: ProviderView) => ({
  id: p.id,
  name: p.name,
  base_url: p.base_url,
  parallel: p.parallel,
  models: p.models,
  prices: p.prices,
  extras: p.extras,
});

function ProviderList({
  providers,
  selectedId,
  onSelect,
  onAdd,
}: {
  providers: ProviderView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-line bg-surface">
      <div className="shrink-0 px-3 pb-2 pt-4">
        <div className={labelCls}>Providers</div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {providers.map((p) => {
          const selected = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`mb-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${
                selected ? 'bg-accent font-semibold text-accent-ink' : 'text-ink-2 hover:bg-raised'
              }`}
            >
              <span className="truncate">{p.name || p.id}</span>
              <span className="shrink-0 text-[12px] tabular-nums">{p.models.length}</span>
            </button>
          );
        })}
      </div>
      <div className="shrink-0 border-t border-line p-3">
        <Button className="w-full" onClick={onAdd}>
          <Plus size={14} />
          Add provider
        </Button>
      </div>
    </aside>
  );
}

function ModelTable({
  provider,
  active,
  routing,
  selectedModelId,
  fetchError,
  busy,
  onEditConnection,
  onFetch,
  onAddModel,
  onOpenModel,
}: {
  provider: ProviderView;
  active: ModelRef;
  routing: Routing;
  selectedModelId: string | null;
  fetchError: string;
  busy: boolean;
  onEditConnection: () => void;
  onFetch: () => void;
  onAddModel: () => void;
  onOpenModel: (modelId: string) => void;
}) {
  const gridCls =
    'grid grid-cols-[minmax(0,1fr)_72px_80px_72px_72px_minmax(160px,auto)] items-center gap-x-4 whitespace-nowrap';

  const roles = (modelId: string) => {
    const isActive = active.provider === provider.id && active.model === modelId;
    const isPlanner =
      routing.planner !== null && routing.planner.provider === provider.id && routing.planner.model === modelId;
    const fallbackIndex = routing.fallbacks.findIndex(
      (f) => f.provider === provider.id && f.model === modelId,
    );

    return (
      <span className="flex flex-wrap items-center gap-1">
        {isActive && (
          <span className="inline-flex items-center rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">
            Active
          </span>
        )}
        {isPlanner && (
          <span className="inline-flex items-center rounded-sm border border-line-strong px-1.5 py-0.5 text-[11px] text-ink-2">
            Planner
          </span>
        )}
        {fallbackIndex >= 0 && (
          <span className="inline-flex items-center rounded-sm border border-accent/40 px-1.5 py-0.5 text-[11px] text-accent">
            Fallback {fallbackIndex + 1}
          </span>
        )}
      </span>
    );
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-ink">{provider.name || provider.id}</h2>
          <p className="mt-1 truncate font-mono text-[12px] text-ink-2">
            {provider.base_url} · {provider.api_key_set ? 'key set' : 'no key'} · {provider.parallel} at a time
          </p>
        </div>
        <Button onClick={onEditConnection}>
          <Pencil size={14} />
          Edit connection
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <Label className="mb-0">Models</Label>
        <div className="flex gap-2">
          <Button onClick={onFetch} disabled={busy}>
            <RefreshCw size={14} />
            Fetch models
          </Button>
          <Button primary onClick={onAddModel} disabled={busy}>
            <Plus size={14} />
            Add model
          </Button>
        </div>
      </div>

      {provider.models.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-3">No models yet. Add one or fetch the list from the endpoint.</p>
      ) : (
        <div className="mt-3 w-full text-[13px]">
          <div className={`${gridCls} border-b border-line px-2 pb-2 text-[12px] text-ink-3`}>
            <span>Model</span>
            <span className="text-right">In $/M</span>
            <span className="text-right">Cached $/M</span>
            <span className="text-right">Out $/M</span>
            <span>Extras</span>
            <span>Role</span>
          </div>

          {provider.models.map((m) => {
            const price = provider.prices[m];
            const hasExtras = provider.extras[m] !== undefined;
            const selected = m === selectedModelId;

            return (
              <div
                key={m}
                role="button"
                tabIndex={0}
                onClick={() => onOpenModel(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpenModel(m);
                }}
                className={`${gridCls} cursor-pointer rounded-sm border-b border-line px-2 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  selected ? 'bg-accent/10 ring-1 ring-inset ring-accent' : 'hover:bg-raised'
                }`}
              >
                <span className="truncate font-mono text-[12px]" title={m}>
                  {m}
                </span>
                <span className="text-right tabular-nums">{price ? price.input_per_m : '—'}</span>
                <span className="text-right tabular-nums">{price ? price.cached_per_m : '—'}</span>
                <span className="text-right tabular-nums">{price ? price.output_per_m : '—'}</span>
                <span>{hasExtras ? 'set' : '—'}</span>
                {roles(m)}
              </div>
            );
          })}
        </div>
      )}

      {fetchError && <p className="mt-2 break-words text-xs text-bad">{fetchError}</p>}
    </section>
  );
}

function ConnectionPanel({
  draft,
  api_key_set,
  canRemove,
  saving,
  onChange,
  onForgetKey,
  onSave,
  onCancel,
  onRemove,
}: {
  draft: ConnDraft;
  api_key_set: boolean;
  canRemove: boolean;
  saving: boolean;
  onChange: (patch: Partial<ConnDraft>) => void;
  onForgetKey: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-line p-4">
        <div className={labelCls}>{draft.id ? 'Edit connection' : 'New provider'}</div>
        <button type="button" aria-label="Close" onClick={onCancel} className="text-ink-3 hover:text-ink">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <Label>Name</Label>
          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            aria-label="Provider name"
          />
        </div>

        <div>
          <Label>Base URL</Label>
          <input
            className={inputCls}
            value={draft.base_url}
            onChange={(e) => onChange({ base_url: e.target.value })}
            aria-label="Base URL"
          />
        </div>

        <div>
          <Label>
            <span className="inline-flex items-center gap-1.5">
              <KeyRound size={14} />
              API key
            </span>
          </Label>
          <input
            type="password"
            className={inputCls}
            value={draft.api_key}
            onChange={(e) => onChange({ api_key: e.target.value, keyTouched: true })}
            autoComplete="off"
            placeholder={api_key_set ? 'kept' : 'none (local endpoints need none)'}
            aria-label="API key"
          />
          {api_key_set && (
            <button
              type="button"
              onClick={onForgetKey}
              className="mt-1 text-xs text-bad hover:underline"
            >
              forget key
            </button>
          )}
        </div>

        <div>
          <Label>Variants at a time</Label>
          <select
            className={inputCls}
            value={draft.parallel}
            onChange={(e) => onChange({ parallel: Number(e.target.value) })}
            aria-label="Variants at a time"
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-3">1 for a local model, up to 3 with an API.</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-4">
        <div className="flex items-center gap-2">
          <Button primary onClick={onSave} disabled={saving}>
            Save
          </Button>
          <Button onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          {draft.id && (
            <button
              type="button"
              onClick={onRemove}
              disabled={saving || !canRemove}
              className="ml-auto inline-flex items-center gap-1 text-xs text-bad hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Remove provider
            </button>
          )}
        </div>
        {draft.id && !canRemove && <p className="mt-2 text-xs text-ink-3">Used by a route or the only provider: change Routes first.</p>}
      </div>
    </aside>
  );
}

function ModelPanel({
  draft,
  canDelete,
  saving,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  draft: ModelDraft;
  canDelete: boolean;
  saving: boolean;
  onChange: (patch: Partial<ModelDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-line bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-line p-4">
        <div className={`${labelCls} min-w-0 truncate ${draft.isNew ? '' : 'font-mono'}`}>{draft.isNew ? 'Add model' : draft.modelId}</div>
        <button type="button" aria-label="Close" onClick={onCancel} className="text-ink-3 hover:text-ink">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {draft.isNew && (
          <div>
            <Label>Model id</Label>
            <input
              className={`${inputCls} font-mono`}
              value={draft.modelId}
              autoFocus
              placeholder="e.g. deepseek/deepseek-v3.2"
              onChange={(e) => onChange({ modelId: e.target.value })}
            />
          </div>
        )}

        <div>
          <Label>Prices · $ per million tokens</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="mb-1 block text-[11px] text-ink-3">Input</span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                className={inputCls}
                value={draft.input}
                onChange={(e) => onChange({ input: e.target.value })}
                aria-label="Input price"
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-ink-3">Cached</span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                className={inputCls}
                value={draft.cached}
                onChange={(e) => onChange({ cached: e.target.value })}
                aria-label="Cached price"
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-ink-3">Output</span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                className={inputCls}
                value={draft.output}
                onChange={(e) => onChange({ output: e.target.value })}
                aria-label="Output price"
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-3">Empty = not priced.</p>
        </div>

        <div>
          <Label>Request extras</Label>
          <textarea
            rows={4}
            spellCheck={false}
            className={`${areaCls} font-mono text-[12px]`}
            placeholder="{}"
            value={draft.extras}
            onChange={(e) => onChange({ extras: e.target.value })}
            aria-label="Request extras"
          />
          <p className="mt-1 text-xs text-ink-3">
            {'For OpenRouter host pinning, e.g. {"provider": {"only": ["deepinfra"], "allow_fallbacks": false}}. Empty = nothing added.'}
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-4">
        <div className="flex items-center gap-2">
          <Button primary onClick={onSave} disabled={saving}>
            Save
          </Button>
          <Button onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          {!draft.isNew && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving || !canDelete}
              className="ml-auto inline-flex items-center gap-1 text-xs text-bad hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete model
            </button>
          )}
        </div>
        {!draft.isNew && !canDelete && <p className="mt-2 text-xs text-ink-3">Used by a route: change Routes first to delete it.</p>}
      </div>
    </aside>
  );
}

function RoutesTab({
  providers,
  active,
  routing,
  saving,
  onActiveChange,
  onRoutingChange,
  onSave,
}: {
  providers: ProviderView[];
  active: ModelRef;
  routing: Routing;
  saving: boolean;
  onActiveChange: (r: ModelRef) => void;
  onRoutingChange: (r: Routing) => void;
  onSave: () => void;
}) {
  const options = (extra?: ModelRef) =>
    providers.map((p) => {
      const ms =
        extra && p.id === extra.provider && !p.models.includes(extra.model)
          ? [extra.model, ...p.models]
          : p.models;

      return (
        <optgroup key={p.id} label={p.name || p.id}>
          {ms.map((m) => (
            <option key={m} value={`${p.id}/${m}`}>
              {m}
            </option>
          ))}
        </optgroup>
      );
    });

  const moveUp = (i: number) => {
    const f = [...routing.fallbacks];
    [f[i - 1], f[i]] = [f[i], f[i - 1]];
    onRoutingChange({ ...routing, fallbacks: f });
  };

  const remove = (i: number) =>
    onRoutingChange({ ...routing, fallbacks: routing.fallbacks.filter((_, j) => j !== i) });

  return (
    <section className="flex h-full flex-1 justify-center overflow-y-auto">
      <div className="flex w-full max-w-xl flex-col gap-4 p-6">
        <div>
          <Label>Active model</Label>
          <select
            className={inputCls}
            value={refValue(active)}
            onChange={(e) => onActiveChange(parse(e.target.value))}
            aria-label="Active model"
          >
            {options(active)}
          </select>
        </div>

        <div>
          <Label>Planner model</Label>
          <select
            className={inputCls}
            value={routing.planner ? key(routing.planner) : ''}
            onChange={(e) =>
              onRoutingChange({ ...routing, planner: e.target.value ? parse(e.target.value) : null })
            }
            aria-label="Planner model"
          >
            <option value="">Same as active</option>
            {options(routing.planner ?? undefined)}
          </select>
          <p className="mt-1 text-xs text-ink-3">
            Writes briefs and plans the looks; a cheaper model is enough. The active model writes the pages.
          </p>
        </div>

        <div>
          <Label>Fallbacks · tried in order when a model fails</Label>
          {routing.fallbacks.map((f, i) => (
            <div key={key(f)} className="mt-1 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px]" title={key(f)}>
                {i + 1}. {f.model}{' '}
                <span className="text-ink-3">
                  · {providers.find((p) => p.id === f.provider)?.name || f.provider}
                </span>
              </span>
              <Button disabled={i === 0} onClick={() => moveUp(i)} aria-label={`Move ${f.model} up`}>
                <ArrowUp size={14} />
              </Button>
              <Button onClick={() => remove(i)} aria-label={`Remove fallback ${f.model}`}>
                Remove
              </Button>
            </div>
          ))}

          {routing.fallbacks.length < 5 && (
            <select
              className={`${inputCls} mt-1.5`}
              value=""
              aria-label="Add a fallback"
              onChange={(e) => {
                const r = parse(e.target.value);
                if (e.target.value && !routing.fallbacks.some((f) => key(f) === key(r))) {
                  onRoutingChange({ ...routing, fallbacks: [...routing.fallbacks, r] });
                }
              }}
            >
              <option value="">Add a fallback…</option>
              {options()}
            </select>
          )}

          <p className="mt-1 text-xs text-ink-3">A model that errors is skipped for a minute, then tried again. Up to 5.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button primary onClick={onSave} disabled={saving}>
            Save routes
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Models() {
  const { toast, refreshStatus } = useApp();
  const s = useAsync(api.settings, []);

  const [tab, setTab] = useState<Tab>('providers');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [conn, setConn] = useState<ConnDraft | null>(null);
  const [model, setModel] = useState<ModelDraft | null>(null);
  const [routesActive, setRoutesActive] = useState<ModelRef>({ provider: '', model: '' });
  const [routesRouting, setRoutesRouting] = useState<Routing>({ planner: null, fallbacks: [] });
  const [fetchErr, setFetchErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = s.data;
    if (!d) return;

    setRoutesActive(d.active);
    setRoutesRouting(d.routing ?? { planner: null, fallbacks: [] });

    setSelectedProviderId((prev) => {
      if (prev && d.providers.some((p) => p.id === prev)) return prev;
      return d.providers[0]?.id ?? null;
    });
  }, [s.data]);

  const closePanel = () => {
    setPanel(null);
    setConn(null);
    setModel(null);
  };

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel]);

  const commit = async (edit: (b: SettingsBody) => void, msg: string): Promise<boolean> => {
    if (!s.data) return false;

    const body: SettingsBody = {
      providers: s.data.providers.map(toBodyProvider),
      active: s.data.active,
      routing: s.data.routing,
    };

    edit(body);

    try {
      await api.saveSettings(body);
      toast(msg);
      refreshStatus();
      s.reload();
      return true;
    } catch (e) {
      toast(String((e as Error).message));
      return false;
    }
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const openConnection = (providerId: string | null) => {
    if (!s.data) return;

    if (providerId === null) {
      setConn({
        id: null,
        name: '',
        base_url: 'http://127.0.0.1:8000/v1',
        api_key: '',
        keyTouched: false,
        parallel: 1,
      });
    } else {
      const p = s.data.providers.find((x) => x.id === providerId);
      if (!p) return;
      setConn({
        id: p.id,
        name: p.name,
        base_url: p.base_url,
        api_key: '',
        keyTouched: false,
        parallel: p.parallel,
      });
    }

    setPanel({ kind: 'connection', providerId });
  };

  const openModel = (providerId: string, modelId: string | null) => {
    if (!s.data) return;

    const p = s.data.providers.find((x) => x.id === providerId);
    if (!p) return;

    if (modelId === null) {
      setModel({
        providerId,
        modelId: '',
        isNew: true,
        input: '',
        cached: '',
        output: '',
        extras: '',
      });
    } else {
      const price = p.prices[modelId];
      setModel({
        providerId,
        modelId,
        isNew: false,
        input: price ? String(price.input_per_m) : '',
        cached: price ? String(price.cached_per_m) : '',
        output: price ? String(price.output_per_m) : '',
        extras: p.extras[modelId] ? JSON.stringify(p.extras[modelId], null, 2) : '',
      });
    }

    setPanel({ kind: 'model', providerId, modelId });
  };

  const saveConnection = () => {
    if (!conn || !s.data) return;

    void withBusy(async () => {
      const id = conn.id ?? `p${Date.now().toString(36)}`;
      const isNew = conn.id === null;

      const ok = await commit(
        (b) => {
          const existing = b.providers.find((p) => p.id === id);
          const provider = {
            id,
            name: conn.name,
            base_url: conn.base_url,
            parallel: conn.parallel,
            models: existing?.models ?? [],
            prices: existing?.prices ?? {},
            extras: existing?.extras ?? {},
            ...(conn.keyTouched ? { api_key: conn.api_key } : {}),
          };

          b.providers = existing
            ? b.providers.map((p) => (p.id === id ? provider : p))
            : [...b.providers, provider];
        },
        isNew ? 'Provider added' : 'Provider saved',
      );

      if (ok) {
        setSelectedProviderId(id);
        closePanel();
      }
    });
  };

  const removeProvider = (providerId: string) => {
    if (!s.data) return;

    void withBusy(async () => {
      const ok = await commit(
        (b) => {
          b.providers = b.providers.filter((p) => p.id !== providerId);
        },
        'Provider removed',
      );

      if (ok) {
        const remaining = (s.data?.providers ?? []).filter((p) => p.id !== providerId);
        setSelectedProviderId(remaining[0]?.id ?? null);
        closePanel();
      }
    });
  };

  const saveModel = () => {
    if (!model || !s.data) return;

    const id = model.modelId.trim();
    if (!id) {
      toast('Model id is required');
      return;
    }

    const provider = s.data.providers.find((p) => p.id === model.providerId);
    if (!provider) return;

    if (model.isNew && provider.models.includes(id)) {
      toast('Model already exists');
      return;
    }

    let extrasObj: object | undefined;
    if (model.extras.trim()) {
      try {
        const parsed: unknown = JSON.parse(model.extras);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          toast('Request extras must be a JSON object');
          return;
        }
        extrasObj = parsed as object;
      } catch {
        toast('Request extras are not valid JSON');
        return;
      }
    }

    const hasPrice =
      model.input.trim() !== '' || model.cached.trim() !== '' || model.output.trim() !== '';
    const price: Price | undefined = hasPrice
      ? {
          input_per_m: priceNum(model.input),
          cached_per_m: priceNum(model.cached),
          output_per_m: priceNum(model.output),
        }
      : undefined;

    void withBusy(async () => {
      const ok = await commit(
        (b) => {
          const p = b.providers.find((x) => x.id === model.providerId);
          if (!p) return;

          if (model.isNew && !p.models.includes(id)) {
            p.models = [...p.models, id];
          }

          if (price) {
            p.prices = { ...p.prices, [id]: price };
          } else {
            p.prices = Object.fromEntries(Object.entries(p.prices ?? {}).filter(([k]) => k !== id));
          }

          if (extrasObj) {
            p.extras = { ...p.extras, [id]: extrasObj };
          } else {
            p.extras = Object.fromEntries(Object.entries(p.extras ?? {}).filter(([k]) => k !== id));
          }
        },
        model.isNew ? 'Model added' : 'Model saved',
      );

      if (ok) closePanel();
    });
  };

  const deleteModel = (providerId: string, modelId: string) => {
    void withBusy(async () => {
      const ok = await commit(
        (b) => {
          const p = b.providers.find((x) => x.id === providerId);
          if (!p) return;

          p.models = p.models.filter((m) => m !== modelId);
          p.prices = Object.fromEntries(Object.entries(p.prices ?? {}).filter(([k]) => k !== modelId));
          p.extras = Object.fromEntries(Object.entries(p.extras ?? {}).filter(([k]) => k !== modelId));
        },
        'Model deleted',
      );

      if (ok) closePanel();
    });
  };

  const fetchModels = (providerId: string) => {
    if (!s.data) return;

    const p = s.data.providers.find((x) => x.id === providerId);
    if (!p) return;

    void withBusy(async () => {
      setFetchErr((e) => ({ ...e, [providerId]: '' }));

      try {
        const r = await api.fetchModels({ id: p.id, base_url: p.base_url });
        const ids = r.models.map((m) => m.trim()).filter(Boolean);

        const ok = await commit(
          (b) => {
            const bp = b.providers.find((x) => x.id === providerId);
            if (bp) {
              bp.models = [...new Set([...bp.models, ...ids])];
            }
          },
          `${ids.length} models`,
        );

        if (!ok) return;
      } catch (e) {
        setFetchErr((x) => ({ ...x, [providerId]: String((e as Error).message) }));
      }
    });
  };

  const saveRoutes = () => {
    void withBusy(async () => {
      await commit(
        (b) => {
          b.active = routesActive;
          b.routing = routesRouting;
        },
        'Routes saved',
      );
    });
  };

  const provider =
    s.data?.providers.find((p) => p.id === selectedProviderId) ?? s.data?.providers[0] ?? null;

  const providerInUse = (id: string) =>
    Boolean(
      s.data &&
        (s.data.active.provider === id ||
          s.data.routing?.planner?.provider === id ||
          s.data.routing?.fallbacks.some((f) => f.provider === id)),
    );

  const canRemoveProvider = Boolean(
    s.data && provider && s.data.providers.length > 1 && !providerInUse(provider.id),
  );

  const modelInUse = (providerId: string, modelId: string) =>
    Boolean(
      s.data &&
        ((s.data.active.provider === providerId && s.data.active.model === modelId) ||
          (s.data.routing?.planner?.provider === providerId &&
            s.data.routing?.planner?.model === modelId) ||
          s.data.routing?.fallbacks.some(
            (f) => f.provider === providerId && f.model === modelId,
          )),
    );

  const connProvider =
    panel?.kind === 'connection' && panel.providerId
      ? s.data?.providers.find((p) => p.id === panel.providerId)
      : undefined;

  const canDeleteModel =
    model && !model.isNew ? !modelInUse(model.providerId, model.modelId) : false;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      <Header title="Models">
        <Segmented
          label="Section"
          value={tab}
          options={[
            { value: 'providers', label: 'Providers' },
            { value: 'routes', label: 'Routes' },
          ]}
          onChange={setTab}
        />
        {s.data && (
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
            <span className={`size-1.5 rounded-full ${s.data.endpoint_ok ? 'bg-ok' : 'bg-bad'}`} />
            {s.data.endpoint_ok ? 'endpoint ok' : 'endpoint unreachable'}
          </span>
        )}
      </Header>

      {s.error && <ErrorRow message={s.error} onRetry={s.reload} />}

      {s.loading && !s.data ? (
        <div className="min-h-0 flex-1 p-6">
          <SkeletonRows n={6} />
        </div>
      ) : s.data ? (
        <div className="flex min-h-0 flex-1">
          {tab === 'providers' ? (
            <>
              <div className="flex min-w-0 flex-1 justify-center">
                <div className="flex w-full max-w-5xl border-x border-line">
                  <ProviderList
                    providers={s.data.providers}
                    selectedId={provider?.id ?? null}
                    onSelect={(id) => {
                      setSelectedProviderId(id);
                      closePanel();
                    }}
                    onAdd={() => openConnection(null)}
                  />
    
                  {provider ? (
                    <ModelTable
                      provider={provider}
                      active={s.data.active}
                      routing={s.data.routing}
                      selectedModelId={panel?.kind === 'model' ? panel.modelId : null}
                      fetchError={fetchErr[provider.id] ?? ''}
                      busy={busy}
                      onEditConnection={() => openConnection(provider.id)}
                      onFetch={() => fetchModels(provider.id)}
                      onAddModel={() => openModel(provider.id, null)}
                      onOpenModel={(modelId) => openModel(provider.id, modelId)}
                    />
                  ) : (
                    <section className="flex h-full min-w-0 flex-1 items-center justify-center p-6 text-[13px] text-ink-3">
                      No provider selected.
                    </section>
                  )}
                </div>
              </div>

              {panel?.kind === 'connection' && conn && (
                <ConnectionPanel
                  draft={conn}
                  api_key_set={connProvider?.api_key_set ?? false}
                  canRemove={canRemoveProvider}
                  saving={busy}
                  onChange={(patch) => setConn((c) => (c ? { ...c, ...patch } : c))}
                  onForgetKey={() =>
                    setConn((c) => (c ? { ...c, api_key: '', keyTouched: true } : c))
                  }
                  onSave={saveConnection}
                  onCancel={closePanel}
                  onRemove={() => {
                    if (conn.id) removeProvider(conn.id);
                  }}
                />
              )}

              {panel?.kind === 'model' && model && (
                <ModelPanel
                  draft={model}
                  canDelete={canDeleteModel}
                  saving={busy}
                  onChange={(patch) => setModel((m) => (m ? { ...m, ...patch } : m))}
                  onSave={saveModel}
                  onCancel={closePanel}
                  onDelete={() => deleteModel(model.providerId, model.modelId)}
                />
              )}
            </>
          ) : (
            <RoutesTab
              providers={s.data.providers}
              active={routesActive}
              routing={routesRouting}
              saving={busy}
              onActiveChange={setRoutesActive}
              onRoutingChange={setRoutesRouting}
              onSave={saveRoutes}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
