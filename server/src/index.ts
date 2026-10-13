// Aethra: Seven Thrones — game server (HTTP API + static client + WebSocket World Arena).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { openDb } from './db';
import { AuthError, login, logout, register, userForToken } from './auth';
import * as G from './game';
import { RtaService } from './rta';

const PORT = Number(process.env.PORT || 8787);
const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(HERE, process.env.CLIENT_DIR ? process.env.CLIENT_DIR : existsSync(resolve(HERE, 'client')) ? 'client' : '../../dist/client');
const DB_FILE = process.env.DB_FILE || resolve(process.cwd(), 'data', 'aethra.db');

export const db = openDb(DB_FILE);
const rta = new RtaService(db);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

// ── tiny rate limiter for auth endpoints ──
const hits = new Map<string, number[]>();
function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  const s = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(s);
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((ok, bad) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 512 * 1024) { bad(new AuthError(413, 'Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return ok({});
      try { ok(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { bad(new AuthError(400, 'Invalid JSON')); }
    });
    req.on('error', bad);
  });
}

function tokenOf(req: http.IncomingMessage) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

type Handler = (ctx: { user: { id: number; username: string }; body: any; query: URLSearchParams }) => unknown;

/** Profile-mutating actions: load → mutate → save atomically (single-threaded). */
const ACTIONS: Record<string, (p: ReturnType<typeof G.loadProfile>, userId: number, a: any) => unknown> = {
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

const ROUTES: Record<string, Handler> = {
  'GET /api/me': ({ user }) => {
    let p;
    try { p = G.loadProfile(db, user.id); } catch { p = G.createProfile(db, user.id, user.username); }
    const rtaRow = db.prepare('SELECT mmr, wins, losses FROM rta WHERE user_id = ?').get(user.id);
    const arenaRow = db.prepare('SELECT points, wins, losses FROM arena WHERE user_id = ?').get(user.id);
    return { user, profile: p, rta: rtaRow, arena: arenaRow };
  },
  'POST /api/action': ({ user, body }) => {
    const op = String(body.op || '');
    const fn = ACTIONS[op];
    if (!fn) throw new G.GameError(404, 'Unknown action');
    const p = G.loadProfile(db, user.id);
    const result = fn(p, user.id, body);
    G.saveProfile(db, user.id, p);
    return { result, profile: p };
  },
  'GET /api/arena': ({ user }) => G.arenaState(db, G.loadProfile(db, user.id), user.id),
  'GET /api/arena/opponents': ({ user }) => G.arenaOpponents(db, user.id),
  'GET /api/leaderboard': ({ query }) => ({ rows: G.leaderboard(db, query.get('kind') === 'rta' ? 'rta' : 'arena') }),
  'GET /api/rta/status': () => rta.stats(),
};

async function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, pathname: string) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, safe);
  if (!file.startsWith(ROOT)) return json(res, 403, { error: 'forbidden' });
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, 'index.html'); // SPA fallback
  }
  try {
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found — build the client with `npm run build`.');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '?';
  try {
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, ...rta.stats() });
    if (req.method === 'POST' && (url.pathname === '/api/register' || url.pathname === '/api/login')) {
      if (limited('auth:' + ip, 20, 60_000)) return json(res, 429, { error: 'Too many attempts. Wait a minute.' });
      const body = await readBody(req);
      const r = url.pathname === '/api/register' ? register(db, body.username, body.password) : login(db, body.username, body.password);
      const user = { id: r.userId, username: String(body.username) };
      try { G.loadProfile(db, r.userId); } catch { G.createProfile(db, r.userId, user.username); }
      return json(res, 200, { token: r.token });
    }
    if (url.pathname.startsWith('/api/')) {
      const token = tokenOf(req);
      const user = userForToken(db, token);
      if (!user) return json(res, 401, { error: 'Please sign in.' });
      if (req.method === 'POST' && url.pathname === '/api/logout') { logout(db, token!); return json(res, 200, { ok: true }); }
      const h = ROUTES[`${req.method} ${url.pathname}`];
      if (!h) return json(res, 404, { error: 'Not found' });
      if (limited('api:' + user.id, 240, 60_000)) return json(res, 429, { error: 'Slow down.' });
      const body = req.method === 'POST' ? await readBody(req) : {};
      return json(res, 200, h({ user, body, query: url.searchParams }));
    }
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    const status = e instanceof AuthError || e instanceof G.GameError ? e.status : 500;
    if (status === 500) console.error(e);
    return json(res, status, { error: status === 500 ? 'Server error' : (e as Error).message });
  }
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname !== '/ws') return socket.destroy();
  const user = userForToken(db, url.searchParams.get('token'));
  if (!user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return socket.destroy();
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    rta.onConnect(user.id, user.username, ws);
    ws.on('message', (data) => rta.onMessage(user.id, user.username, ws, data.toString()));
    ws.on('close', () => rta.onClose(user.id, ws));
    ws.on('error', () => { /* ignore */ });
  });
});

server.listen(PORT, () => {
  console.log(`Aethra server on http://localhost:${PORT}  (db: ${DB_FILE}, client: ${ROOT})`);
});
