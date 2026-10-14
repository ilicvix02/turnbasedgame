// Offline mode: the real server game logic (server/src/game.ts + rta.ts) running in the browser,
// with a tiny table store in localStorage standing in for SQLite. Used by the standalone build.
import * as G from '../../../server/src/game';
import { RtaService } from '../../../server/src/rta';
import type { DB } from '../../../server/src/db';

type Row = Record<string, any>;
interface Tables { seq: number; users: Row[]; sessions: Row[]; profiles: Record<number, Row>; arena: Record<number, Row>; rta: Record<number, Row>; arena_log: Row[] }
const KEY = 'aethra.offline.db';
let T: Tables = { seq: 0, users: [], sessions: [], profiles: {}, arena: {}, rta: {}, arena_log: [] };
try { const s = localStorage.getItem(KEY); if (s) T = { ...T, ...JSON.parse(s) }; } catch { /* storage unavailable: session-only */ }
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; try { localStorage.setItem(KEY, JSON.stringify(T)); } catch { /* ignore */ } }, 50);
}
const uname = (id: number) => T.users.find((u) => u.id === id)?.username ?? '?';
const byPoints = (a: Row, b: Row) => b.points - a.points;

/** Each SQL statement the server code issues, implemented over the JS tables. */
const Q: [RegExp, (args: any[]) => { get?: () => any; all?: () => any[]; run?: () => void }][] = [
  [/^SELECT data FROM profiles/, ([id]) => ({ get: () => T.profiles[id] })],
  [/^INSERT INTO profiles/, ([id, data, upd]) => ({ run: () => { T.profiles[id] = { data, updated: upd }; } })],
  [/^UPDATE profiles SET data/, ([data, upd, id]) => ({ run: () => { if (T.profiles[id]) T.profiles[id] = { data, updated: upd }; } })],
  [/^INSERT OR IGNORE INTO arena/, ([id, upd]) => ({ run: () => { T.arena[id] ??= { user_id: id, points: 1000, wins: 0, losses: 0, defense: null, updated: upd }; } })],
  [/^INSERT OR IGNORE INTO rta/, ([id, upd]) => ({ run: () => { T.rta[id] ??= { user_id: id, mmr: 1200, wins: 0, losses: 0, updated: upd }; } })],
  [/^SELECT points, wins, losses FROM arena/, ([id]) => ({ get: () => T.arena[id] && { points: T.arena[id].points, wins: T.arena[id].wins, losses: T.arena[id].losses } })],
  [/^SELECT points FROM arena/, ([id]) => ({ get: () => T.arena[id] && { points: T.arena[id].points } })],
  [/^SELECT mmr FROM rta/, ([id]) => ({ get: () => T.rta[id] && { mmr: T.rta[id].mmr } })],
  [/^SELECT mmr, wins, losses FROM rta/, ([id]) => ({ get: () => T.rta[id] && { mmr: T.rta[id].mmr, wins: T.rta[id].wins, losses: T.rta[id].losses } })],
  [/^SELECT l\.attacker/, ([id]) => ({ all: () => T.arena_log.filter((l) => l.defender === id).sort((a, b) => b.time - a.time).slice(0, 10).map((l) => ({ ...l, name: uname(l.attacker) })) })],
  [/^UPDATE arena SET defense/, ([def, upd, id]) => ({ run: () => { if (T.arena[id]) Object.assign(T.arena[id], { defense: def, updated: upd }); } })],
  [/^SELECT a\.user_id as id/, ([id, pts]) => ({ all: () => Object.values(T.arena).filter((a) => a.user_id !== id && a.defense).sort((a, b) => Math.abs(a.points - pts) - Math.abs(b.points - pts)).slice(0, 6).map((a) => ({ id: a.user_id, points: a.points, defense: a.defense, name: uname(a.user_id) })) })],
  [/^SELECT a\.defense/, ([id]) => ({ get: () => T.arena[id] && { defense: T.arena[id].defense, name: uname(id) } })],
  [/^UPDATE arena SET points = MAX\(0, points \+ \?\)/, ([d, upd, id], ) => ({ run: () => { const a = T.arena[id]; if (!a) return; a.points = Math.max(0, a.points + d); a.updated = upd; } })],
  [/^UPDATE arena SET points = MAX\(0, points - \?\)/, ([d, upd, id]) => ({ run: () => { const a = T.arena[id]; if (a) { a.points = Math.max(0, a.points - d); a.updated = upd; } } })],
  [/^INSERT INTO arena_log/, ([attacker, defender, win, delta, time]) => ({ run: () => { T.arena_log.push({ attacker, defender, win, delta, time }); T.arena_log = T.arena_log.slice(-200); } })],
  [/^UPDATE rta SET mmr/, ([d, upd, id]) => ({ run: () => { const r = T.rta[id]; if (r) { r.mmr = Math.max(0, r.mmr + d); r.updated = upd; } } })],
  [/^INSERT INTO rta_matches/, () => ({ run: () => {} })],
  [/^SELECT u\.username as name, a\.points/, () => ({ all: () => Object.values(T.arena).sort(byPoints).slice(0, 50).map((a) => ({ name: uname(a.user_id), score: a.points, wins: a.wins, losses: a.losses })) })],
  [/^SELECT u\.username as name, r\.mmr/, () => ({ all: () => Object.values(T.rta).sort((a, b) => b.mmr - a.mmr).slice(0, 50).map((r) => ({ name: uname(r.user_id), score: r.mmr, wins: r.wins, losses: r.losses })) })],
];

const db = {
  prepare(sql: string) {
    const hit = Q.find(([re]) => re.test(sql));
    if (!hit) throw new Error('offline db: unsupported query ' + sql.slice(0, 60));
    const win = /wins = wins \+ 1/.test(sql), loss = /losses = losses \+ 1/.test(sql);
    return {
      get: (...a: any[]) => hit[1](a).get?.(),
      all: (...a: any[]) => hit[1](a).all?.() ?? [],
      run: (...a: any[]) => {
        hit[1](a).run?.();
        const id = a[a.length - 1];
        const row = /^UPDATE arena/.test(sql) ? T.arena[id] : /^UPDATE rta/.test(sql) ? T.rta[id] : null;
        if (row) { if (win) row.wins++; if (loss) row.losses++; }
        save();
        return { changes: 1, lastInsertRowid: 0 };
      },
    };
  },
} as unknown as DB;

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

async function hash(name: string, pass: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name.toLowerCase() + ':' + pass));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function newSession(userId: number) {
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  T.sessions.push({ token, user_id: userId });
  save();
  return token;
}
function userFor(token: string | null) {
  const s = token && T.sessions.find((x) => x.token === token);
  const u = s && T.users.find((x) => x.id === s.user_id);
  return u ? { id: u.id as number, username: u.username as string } : null;
}

const ACTIONS: Record<string, (p: any, u: number, a: any) => unknown> = {
  summon: (p, _u, a) => G.summon(p, Number(a.count)),
  levelUp: (p, _u, a) => G.levelUp(p, a.uid, a.levels),
  promote: (p, _u, a) => G.promote(p, a.uid),
  awaken: (p, _u, a) => G.awaken(p, a.uid),
  enhanceSkill: (p, _u, a) => G.enhanceSkill(p, a.uid, Number(a.slot)),
  imprint: (p, _u, a) => G.imprintHero(p, a.uid, a.fodder),
  release: (p, _u, a) => G.releaseHero(p, a.uid),
  lock: (p, _u, a) => G.lockHero(p, a.uid, a.locked),
  equipGear: (p, _u, a) => G.equipGear(p, a.gear, a.hero),
  unequipGear: (p, _u, a) => G.unequipGear(p, a.gear),
  enhanceGear: (p, _u, a) => G.enhanceGearOp(p, a.gear, a.levels),
  sellGear: (p, _u, a) => G.sellGear(p, a.gear),
  equipArtifact: (p, _u, a) => G.equipArtifact(p, a.artifact ?? null, a.hero),
  enhanceArtifact: (p, _u, a) => G.enhanceArtifact(p, a.artifact),
  daily: (p) => G.claimDaily(p),
  startTutorial: (_p, u) => G.startTutorial(u),
  startCampaign: (p, u, a) => G.startCampaign(p, u, String(a.stage), a.team),
  finishBattle: (p, u, a) => G.finishBattle(db, p, u, String(a.battleId), a.inputs),
  setDefense: (p, u, a) => G.setDefense(db, p, u, a.team),
  startArena: (p, u, a) => G.startArena(db, p, u, Number(a.opponent), a.team),
  saveFavorites: (p, _u, a) => { if (Array.isArray(a.heroes)) p.rtaFavorites = a.heroes.slice(0, 20).map(String); return {}; },
};

let rta: RtaService | null = null;

/** Handles one API request locally; mirrors server/src/index.ts. */
export async function handle(method: string, path: string, body: any, token: string | null): Promise<unknown> {
  // the battle verifier is CPU heavy; yield so the UI paints first
  await new Promise((r) => setTimeout(r, 0));
  try {
    const url = new URL(path, 'http://x');
    if (method === 'POST' && (url.pathname === '/api/register' || url.pathname === '/api/login')) {
      const name = String(body.username ?? ''), pass = String(body.password ?? '');
      if (url.pathname === '/api/register') {
        if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new HttpError(400, 'Username must be 3–16 letters, numbers or underscores.');
        if (pass.length < 8 || pass.length > 128) throw new HttpError(400, 'Password must be 8–128 characters.');
        if (T.users.some((u) => u.username.toLowerCase() === name.toLowerCase())) throw new HttpError(409, 'That name is already taken on this device.');
        const id = ++T.seq;
        T.users.push({ id, username: name, pass: await hash(name, pass) });
        G.createProfile(db, id, name);
        return { token: newSession(id) };
      }
      const u = T.users.find((x) => x.username.toLowerCase() === name.toLowerCase());
      if (!u || u.pass !== (await hash(name, pass))) throw new HttpError(401, 'Wrong name or password.');
      return { token: newSession(u.id) };
    }
    const user = userFor(token);
    if (!user) throw new HttpError(401, 'Please sign in.');
    const key = `${method} ${url.pathname}`;
    if (key === 'POST /api/logout') { T.sessions = T.sessions.filter((s) => s.token !== token); save(); return { ok: true }; }
    if (key === 'GET /api/me') {
      let p;
      try { p = G.loadProfile(db, user.id); } catch { p = G.createProfile(db, user.id, user.username); }
      return { user, profile: p, rta: db.prepare('SELECT mmr, wins, losses FROM rta WHERE user_id = ?').get(user.id), arena: db.prepare('SELECT points, wins, losses FROM arena WHERE user_id = ?').get(user.id) };
    }
    if (key === 'POST /api/action') {
      const fn = ACTIONS[String(body.op || '')];
      if (!fn) throw new HttpError(404, 'Unknown action');
      const p = G.loadProfile(db, user.id);
      const result = fn(p, user.id, body);
      G.saveProfile(db, user.id, p);
      return { result, profile: p };
    }
    if (key === 'GET /api/arena') return G.arenaState(db, G.loadProfile(db, user.id), user.id);
    if (key === 'GET /api/arena/opponents') return G.arenaOpponents(db, user.id);
    if (key === 'GET /api/leaderboard') return { rows: G.leaderboard(db, url.searchParams.get('kind') === 'rta' ? 'rta' : 'arena') };
    if (key === 'GET /api/rta/status') return (rta ??= new RtaService(db)).stats();
    throw new HttpError(404, 'Not found');
  } catch (e) {
    const status = (e as any).status ?? 500;
    if (status === 500) console.error(e);
    throw new HttpError(status, status === 500 ? 'Something went wrong.' : (e as Error).message);
  }
}

/** A WebSocket look-alike wired straight into the in-browser World Arena service (bot opponents). */
export function openSocket(token: string | null): WebSocket {
  const user = userFor(token);
  const svc = (rta ??= new RtaService(db));
  const client: any = { readyState: 0, onopen: null, onmessage: null, onclose: null, onerror: null };
  const serverSide: any = { readyState: 1, send: (s: string) => setTimeout(() => client.onmessage?.({ data: s }), 0), close: () => {} };
  client.send = (s: string) => { if (user) setTimeout(() => svc.onMessage(user.id, user.username, serverSide, s), 0); };
  client.close = () => { client.readyState = 3; serverSide.readyState = 3; if (user) svc.onClose(user.id, serverSide); client.onclose?.({}); };
  setTimeout(() => {
    if (!user) { client.onerror?.({}); return; }
    client.readyState = 1;
    client.onopen?.({});
    svc.onConnect(user.id, user.username, serverSide);
  }, 0);
  return client as WebSocket;
}
