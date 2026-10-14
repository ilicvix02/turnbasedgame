// REST client + session token + the shared profile store.
import type { Profile } from '@shared/meta/profile';

const TOKEN_KEY = 'aethra.token';
export let token: string | null = (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();

export function setToken(t: string | null) {
  token = t;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

/** Standalone build: the game server runs inside the page (client/src/offline/local.ts). */
export const OFFLINE = import.meta.env.MODE === 'offline';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (OFFLINE) {
    const local = await import('../offline/local');
    try { return (await local.handle(method, path, body ?? {}, token)) as T; } catch (e) { throw new ApiError((e as any).status ?? 500, (e as Error).message); }
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  let r: Response;
  try {
    r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is it running?');
  }
  let j: any = {};
  try { j = await r.json(); } catch { /* empty */ }
  if (!r.ok) throw new ApiError(r.status, j.error || `Error ${r.status}`);
  return j as T;
}

export const api = {
  register: (username: string, password: string) => req<{ token: string }>('POST', '/api/register', { username, password }),
  login: (username: string, password: string) => req<{ token: string }>('POST', '/api/login', { username, password }),
  logout: () => req('POST', '/api/logout'),
  me: () => req<{ user: { id: number; username: string }; profile: Profile; rta: { mmr: number; wins: number; losses: number }; arena: { points: number; wins: number; losses: number } }>('GET', '/api/me'),
  arena: () => req<any>('GET', '/api/arena'),
  opponents: () => req<{ opponents: { id: number; name: string; points: number; npc: boolean; team: string[]; levels: number[] }[] }>('GET', '/api/arena/opponents'),
  leaderboard: (kind: 'arena' | 'rta') => req<{ rows: { name: string; score: number; wins: number; losses: number }[] }>('GET', `/api/leaderboard?kind=${kind}`),
  rtaStatus: () => req<{ queue: number; matches: number; online: number }>('GET', '/api/rta/status'),
  async action<T = any>(op: string, args: Record<string, unknown> = {}): Promise<T> {
    const r = await req<{ result: T; profile: Profile }>('POST', '/api/action', { op, ...args });
    store.setProfile(r.profile);
    return r.result;
  },
};

type Listener = () => void;
export const store = {
  user: null as { id: number; username: string } | null,
  profile: null as Profile | null,
  rta: { mmr: 1200, wins: 0, losses: 0 },
  arena: { points: 1000, wins: 0, losses: 0 },
  listeners: new Set<Listener>(),
  setProfile(p: Profile) {
    this.profile = p;
    for (const l of this.listeners) l();
  },
  on(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  },
  async refresh() {
    const me = await api.me();
    this.user = me.user;
    if (me.rta) this.rta = me.rta;
    if (me.arena) this.arena = me.arena;
    this.setProfile(me.profile);
    return me;
  },
};
