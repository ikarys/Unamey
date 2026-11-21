// Typed fetch helpers for the studio HTTP API (docs/architecture.md, "HTTP API").
// Shapes beyond what the contract spells out are best-effort and normalised here.

export type Verdict = 'good' | 'mixed' | 'bad';

export const REFINE_ACTIONS = ['bolder', 'quieter', 'distill', 'typeset', 'colorize', 'layout'] as const;
export type RefineAction = (typeof REFINE_ACTIONS)[number];
export const REFINE_HINTS: Record<RefineAction, string> = {
  bolder: 'more contrast and hierarchy',
  quieter: 'calmer, less visual noise',
  distill: 'simpler, only the essentials',
  typeset: 'better typography',
  colorize: 'more meaningful colour',
  layout: 'better spacing and arrangement'
};

export interface Price { input_per_m: number; cached_per_m: number; output_per_m: number }
export interface ProviderView { id: string; name: string; base_url: string; api_key_set: boolean; parallel: number; models: string[]; prices: Record<string, Price>; extras: Record<string, object> }
export interface ModelRef { provider: string; model: string }
export interface Routing { planner: ModelRef | null; fallbacks: ModelRef[] }
export interface Settings { providers: ProviderView[]; active: ModelRef; routing: Routing; endpoint_ok: boolean }
export interface SettingsBody { providers: (Omit<ProviderView, 'api_key_set' | 'prices' | 'extras'> & { prices?: Record<string, Price>; extras?: Record<string, object>; api_key?: string })[]; active: ModelRef; routing: Routing }

export interface Status {
  endpoint_ok: boolean;
  model: string;
  // When the backend process started (RFC 3339).
  started_at: string;
  // Platform-wide counts, sent to admins only.
  jobs_running?: number;
  jobs_failed?: number;
  // The caller's running generation jobs, newest first, with where each result will land.
  my_jobs: { id: string; kind: string; target: { concept: string; page: string | null } | null }[];
}

export interface Me { id: string; admin: boolean; can_admin: boolean; multi_user: boolean }
export interface Account { email: string; name: string | null; admin: boolean; created_at: string }
export interface Session { id: string; user_agent: string | null; created_at: string; last_seen: string | null; current: boolean }
export interface ApiToken { id: string; name: string; created_at: string; last_used: string | null }
export interface Usage { month: { generations: number; projects: number }; total: { generations: number; projects: number }; by_month: { month: string; generations: number }[] }
export interface UserDetail { usage: Usage; projects: Project[]; sessions: Session[]; jobs: Job[] }
export interface User { id: string; email: string; name: string | null; admin: boolean; disabled: boolean; created_at: string; generations_month: number; generations_total: number; cost_month: number | null }

export interface Job {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: string;
  log: string;
  created_at: string;
  finished_at: string | null;
  // Last "error:" log line of a failed job.
  error: string | null;
  owner: { id: string; email: string; name: string | null };
  // Sum of the job's LLM calls; cost in dollars at each call's model price, null when a call was unpriced.
  llm: { calls: number; seconds: number; prompt: number; cached: number; out: number; cost: number | null; model: string | null };
  // Outcome of a finished job (from its final "result:" log line); only on GET /api/jobs/:id.
  result?: { generation_ids?: string[]; seed?: number; universes?: Universe[] } | null;
}

export type JobSort = 'created' | 'duration' | 'cost' | 'account' | 'tokens' | 'llm_time' | 'kind' | 'status';
export interface JobSearch { q: string; status: string; kind: string; sort: JobSort; dir: 'asc' | 'desc'; page: number; per: number }
// GET /api/admin/jobs: one page of every account's jobs. counts ignore the status filter; last24h ignores every filter.
export interface JobPage {
  jobs: Job[];
  total: number;
  page: number;
  per: number;
  counts: { all: number; queued: number; running: number; done: number; failed: number };
  kinds: string[];
  last24h: { jobs: number; failed: number; seconds: number; prompt: number; cached: number; out: number; cost: number | null };
}

export interface Generation {
  id: string;
  created_at: string;
  verdict?: Verdict | null;
  verdict_note?: string | null;
  brief?: string | null;
  request?: Partial<GenerateRequest> | null;
  model?: string;
  skill_version?: string;
  notes?: unknown;
  html?: string | null;
  live?: boolean;
  batch?: string | null;
  label?: string | null;
  detect_count?: number | null;
  archetype?: string | null;
  cost?: number | null;
  project_id?: string | null;
  concept_id?: string | null;
  page?: string | null;
  target?: 'desktop' | 'mobile';
  accent?: string | null;
  canvas?: string | null;
}
export interface Concept { id: string; name: string; identity: string | null; generations: number; created_at: string }
export interface Project { id: string; name: string; created_at: string; generations: number; archived: boolean; concepts: Concept[] }
export interface Share { id: string; generation_id: string | null; concept_id: string | null; created_at: string; expires_at: string | null; expired: boolean; label: string }
export interface GenerateRequest {
  brief: string; description?: string; colours?: string; users: string; data_objects: string[]; style_tags: string[]; density: string; variants?: number; seed?: number; archetype?: string; concept?: string; page?: string; target?: 'desktop' | 'mobile' | 'both'; pages?: string[]; looks?: string[]; /** Stored on page generations: the identity generation they were built on. */ identity?: string; /** The visual universe picked on the home page, replayed by Add variant. */ universe?: Universe;
}
export interface BriefDraft { brief: string; users: string; data_objects: string[]; style_tags: string[]; density: string; pages: string[]; looks: string[]; colours: string; description?: string }
/** The home flow: a free prompt, the look (archetype id, omitted = the planner proposes), 1-3 variants, theme, and an existing project + empty concept (omitted = new project). */
/** A visual world proposed before any screen: a metaphor, 5 hex colours (canvas, surface, text, accent, second accent) and materials. */
export interface Universe { name: string; metaphor: string; pitch: string; palette: string[]; materials: string[]; risk: string }
export interface StartRequest { universe?: Universe; text: string; look?: string; variants?: number; theme?: 'auto' | 'light' | 'dark'; target?: 'auto' | 'desktop' | 'mobile'; project?: string; concept?: string }
export interface Archetype { id: string; name: string; feel: string; kind: 'business' | 'consumer' }
export interface Identity { theme?: string; canvas?: string; surface?: string; border?: string; text?: string; muted?: string; accent?: string; accent2?: string | null; font?: string; mono?: string; radius?: number; density?: string; tone?: string; decoration?: string; glow?: number | null; scanlines?: true | null; caps?: true | null }
export interface EditRequest { identity?: Identity; layout?: string }

export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

export interface CacheServer { prompt_tokens: number | null; cached_tokens: number | null; checkpoint_selections: number | null; root_selections: number | null; kv_used: number | null; kv_capacity: number | null; host_used: number | null; host_capacity: number | null }
export interface CacheCall { seconds: number; prompt: number; cached: number; out: number }
export interface CacheJob { id: string; kind: string; status: string; created_at: string; calls: CacheCall[] }
export interface CacheView { server: CacheServer | null; jobs: CacheJob[] }

// An admin browsing as a member: the server then applies member rights.
export const VIEW_AS_KEY = 'studio:view-as';
export const viewingAsMember = () => localStorage.getItem(VIEW_AS_KEY) === 'member';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init?.headers);
    if (viewingAsMember()) headers.set('X-View-As', 'member');
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the studio server');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) dispatchEvent(new Event('studio:unauthorized'));
    let message = text.slice(0, 200);
    try {
      const body = JSON.parse(text) as { error?: unknown };
      if (typeof body.error === 'string') message = body.error;
    } catch {
      // Not JSON (proxy page, plain text): keep the raw text.
    }
    throw new ApiError(message || `${res.status} ${res.statusText}`, res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const jobId = (r: { job_id: string }) => r.job_id;

export const api = {
  status: () => req<Status>('/api/status'),
  me: () => req<Me>('/api/me'),
  account: () => req<Account>('/api/account'),
  setName: (name: string) => req<{ ok: true }>('/api/account/name', json('POST', { name })),
  changePassword: (current: string, next: string) => req<{ ok: true }>('/api/account/password', json('POST', { current, new: next })),
  deleteAccount: (password: string) => req<{ ok: true }>('/api/account/delete', json('POST', { password })),
  sessions: () => req<Session[]>('/api/account/sessions'),
  revokeSession: (id: string) => req<{ ok: true }>(`/api/account/sessions/${id}`, { method: 'DELETE' }),
  revokeOtherSessions: () => req<{ revoked: number }>('/api/account/sessions/revoke-others', json('POST', {})),
  apiTokens: () => req<ApiToken[]>('/api/account/tokens'),
  createApiToken: (name: string) => req<{ id: string; token: string }>('/api/account/tokens', json('POST', { name })),
  revokeApiToken: (id: string) => req<{ ok: true }>(`/api/account/tokens/${id}`, { method: 'DELETE' }),
  usage: () => req<Usage>('/api/account/usage'),
  login: (email: string, password: string) => req<{ ok: true }>('/api/login', json('POST', { email, password })),
  signup: (name: string, email: string, password: string) => req<{ ok: true }>('/api/signup', json('POST', { name, email, password })),
  logout: () => req<{ ok: true }>('/api/logout', { method: 'POST' }),
  users: () => req<User[]>('/api/users'),
  setUserDisabled: (id: string, disabled: boolean) => req<{ ok: true }>(`/api/users/${id}`, json('PUT', { disabled })),
  deleteUser: (id: string) => req<{ ok: true }>(`/api/users/${id}`, { method: 'DELETE' }),
  userDetail: (id: string) => req<UserDetail>(`/api/users/${id}`),
  cache: () => req<CacheView>('/api/cache'),
  settings: () => req<Settings>('/api/settings'),
  saveSettings: (s: SettingsBody) => req<Settings>('/api/settings', json('PUT', s)),
  fetchModels: (b: { id?: string; base_url: string; api_key?: string }) => req<{ models: string[] }>('/api/settings/models', json('POST', b)),
  jobs: () => req<Job[]>('/api/jobs'),
  job: (id: string) => req<Job>(`/api/jobs/${id}`),
  searchJobs: (s: JobSearch) =>
    req<JobPage>(`/api/admin/jobs?${new URLSearchParams(Object.entries(s).map(([k, v]) => [k, String(v)]))}`),
  briefHelper: (text: string, images: string[] = []) => req<{ job_id: string }>('/api/brief', json('POST', images.length > 0 ? { text, images } : { text })).then(jobId),
  universes: (r: { text: string; steer?: string; mode?: 'safer' | 'bolder'; avoid?: string[] }) => req<{ job_id: string }>('/api/universes', json('POST', r)).then(jobId),
  // The user flow: free prompt → framing agent → 3 looks in a new project.
  // `look`: an archetype id → one screen in that look; omitted → three looks picked from the prompt.
  start: (r: StartRequest) => req<{ job_id: string; project_id: string; concept_id: string }>('/api/start', json('POST', r)),
  generate: (r: GenerateRequest) =>
    req<{ job_id: string }>('/api/generate', json('POST', r)).then(jobId),
  generations: () => req<Generation[]>('/api/generations'),
  generation: (id: string) => req<Generation>(`/api/generations/${id}`),
  setVerdict: (id: string, verdict: Verdict, note: string) =>
    req<unknown>(`/api/generations/${id}/verdict`, json('POST', { verdict, note })),
  refine: (id: string, action: RefineAction, count: number) =>
    req<{ job_id: string }>(`/api/generations/${id}/refine`, json('POST', { action, count })).then(jobId),
  edit: (id: string, body: EditRequest) => req<{ job_id: string }>(`/api/generations/${id}/edit`, json('POST', body)).then(jobId),
  tokens: (id: string, identity: EditRequest['identity']) => req<{ id: string; from: string }>(`/api/generations/${id}/tokens`, json('POST', { identity })),
  moveGeneration: (id: string, concept: string) => req<{ ok: boolean }>(`/api/generations/${id}/move`, json('POST', { concept })),
  alternative: (id: string, archetype: string) => req<{ job_id: string }>(`/api/generations/${id}/alternative`, json('POST', { archetype })).then(jobId),
  deleteGenerations: (ids: string[]) => req<{ deleted: number }>('/api/generations/delete', json('POST', { ids })),
  projects: () => req<Project[]>('/api/projects'),
  createProject: (name: string) => req<{ id: string; name: string; concept: string }>('/api/projects', json('POST', { name })),
  renameProject: (id: string, name: string) => req<{ id: string; name: string }>(`/api/projects/${id}`, json('PUT', { name })),
  archiveProject: (id: string, archived: boolean) => req<{ id: string; archived: boolean }>(`/api/projects/${id}`, json('PUT', { archived })),
  deleteProject: (id: string) => req<{ unsorted: number }>(`/api/projects/${id}`, { method: 'DELETE' }),
  createConcept: (project: string, name?: string) => req<{ id: string; name: string }>(`/api/projects/${project}/concepts`, json('POST', name ? { name } : {})),
  renameConcept: (id: string, name: string) => req<unknown>(`/api/concepts/${id}`, json('PUT', { name })),
  deleteConcept: (id: string) => req<unknown>(`/api/concepts/${id}`, { method: 'DELETE' }),
  setIdentity: (concept: string, generation: string | null) => req<unknown>(`/api/concepts/${concept}/identity`, json('PUT', { generation })),
  shares: () => req<Share[]>('/api/shares'),
  createShare: (body: { generation_id?: string; concept_id?: string; expires_days?: number }) => req<{ id: string; url: string }>('/api/shares', json('POST', body)),
  revokeShare: (id: string) => req<{ ok: true }>(`/api/shares/${id}`, { method: 'DELETE' }),
  archetypes: () => req<Archetype[]>('/api/archetypes'),
};

/** Short display form of a UUID v7 id: its random tail (the head is a timestamp, shared by close ids). */
export const shortId = (id: string) => id.slice(-8);
