// End-to-end: boots the real server, signs up, plays verified battles, attacks in the Arena
// and completes a World Arena mock draft + live battle against a bot over WebSocket.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';
import '../shared/data/index';
import { Battle } from '../shared/engine/battle';
import { chooseAction } from '../shared/engine/ai';
import type { BattleConfig, Input } from '../shared/engine/types';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const base = `http://localhost:${PORT}`;
let srv: ChildProcess;
let token = '';

async function api(op: string, body: Record<string, unknown> = {}) {
  const r = await fetch(base + '/api/action', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ op, ...body }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
}

function play(config: BattleConfig, ai: 'easy' | 'normal' | 'hard') {
  const b = new Battle(config);
  b.start();
  while (b.winner < 0) {
    const u = b.unit(b.pending!);
    b.act(chooseAction(b, u.team === 0 ? 'normal' : ai));
  }
  return { winner: b.winner, inputs: b.inputs.filter((x) => b.unit(x.actor).team === 0) as Input[] };
}

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'aethra-'));
  srv = spawn('npx', ['tsx', 'server/src/index.ts'], { env: { ...process.env, PORT: String(PORT), DB_FILE: join(dir, 't.db'), RTA_BOT_WAIT_MS: '500', NODE_NO_WARNINGS: '1' }, stdio: 'pipe' });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(base + '/api/health'); if (r.ok) break; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  const r = await fetch(base + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'e2e_' + PORT, password: 'correct horse battery' }) });
  token = (await r.json()).token;
}, 30000);

afterAll(() => { srv?.kill('SIGTERM'); });

describe('server e2e', () => {
  it('rejects bad credentials and duplicate names', async () => {
    const bad = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'e2e_' + PORT, password: 'nope-nope' }) });
    expect(bad.status).toBe(401);
    const dup = await fetch(base + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'E2E_' + PORT, password: 'whatever123' }) });
    expect(dup.status).toBe(409);
    const anon = await fetch(base + '/api/me');
    expect(anon.status).toBe(401);
  });

  it('creates a starter profile and summons', async () => {
    const me = await (await fetch(base + '/api/me', { headers: { authorization: 'Bearer ' + token } })).json();
    expect(me.profile.heroes.length).toBe(4);
    const s = await api('summon', { count: 10 });
    expect(s.result.results.length).toBe(10);
    expect(s.result.results.some((r: { rarity: number }) => r.rarity >= 4)).toBe(true);
  });

  it('verifies tutorial and campaign battles server-side', async () => {
    const t = await api('startTutorial');
    const r = play(t.result.config, t.result.ai);
    const f = await api('finishBattle', { battleId: t.result.battleId, inputs: r.inputs });
    expect(f.result.win).toBe(r.winner === 0);
    const team = f.profile.heroes.slice(0, 4).map((h: { uid: string }) => h.uid);
    const c = await api('startCampaign', { stage: '1-1', team });
    const r2 = play(c.result.config, c.result.ai);
    const f2 = await api('finishBattle', { battleId: c.result.battleId, inputs: r2.inputs });
    expect(f2.result.win).toBe(r2.winner === 0);
    // forged result: no inputs = abandoned = loss
    const c3 = await api('startCampaign', { stage: '1-1', team });
    const f3 = await api('finishBattle', { battleId: c3.result.battleId, inputs: [] });
    expect(f3.result.win).toBe(false);
    // replaying the same battle id is rejected
    await expect(api('finishBattle', { battleId: c3.result.battleId, inputs: [] })).rejects.toThrow();
  }, 60000);

  it('plays an arena attack', async () => {
    const me = await (await fetch(base + '/api/me', { headers: { authorization: 'Bearer ' + token } })).json();
    const team = me.profile.heroes.slice(0, 4).map((h: { uid: string }) => h.uid);
    await api('setDefense', { team });
    const opps = await (await fetch(base + '/api/arena/opponents', { headers: { authorization: 'Bearer ' + token } })).json();
    expect(opps.opponents.length).toBeGreaterThan(0);
    const a = await api('startArena', { opponent: opps.opponents[0].id, team });
    const r = play(a.result.config, a.result.ai);
    const f = await api('finishBattle', { battleId: a.result.battleId, inputs: r.inputs });
    expect(typeof f.result.delta).toBe('number');
  }, 60000);

  it('completes a World Arena mock draft and live battle vs a bot', async () => {
    const result = await new Promise<{ winner: number; localWinner: number; picks: string[][] }>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/ws?token=${token}`);
      let local: Battle | null = null;
      let you = 0;
      let picks: string[][] = [];
      const timer = setTimeout(() => reject(new Error('timeout')), 240000);
      ws.on('message', (d) => {
        const m = JSON.parse(d.toString());
        if (m.t === 'hello') ws.send(JSON.stringify({ t: 'queue', mode: 'mock' }));
        if (m.t === 'match') you = m.you;
        if (m.t === 'draft' || m.t === 'match') {
          const dr = m.draft;
          picks = dr.picks;
          if (dr.phase === 'preban' && dr.prebans[you].length === 0) ws.send(JSON.stringify({ t: 'preban', heroes: ['seraphine', 'vulkar'] }));
          if (dr.phase === 'pick' && dr.picker && dr.picker.side === you) {
            const taken = new Set([...dr.prebans[0], ...dr.prebans[1], ...dr.picks[0], ...dr.picks[1]]);
            const mine = ['ignara', 'ticktock', 'orion', 'mira', 'thalia', 'nocturne', 'aurel', 'isolde', 'drakon', 'borea', 'kaz', 'nix'].filter((h) => !taken.has(h)).slice(0, dr.picker.count);
            ws.send(JSON.stringify({ t: 'pick', heroes: mine }));
          }
          if (dr.phase === 'postban' && !dr.postbans[you]) {
            const opp = dr.picks[1 - you].filter((_: string, i: number) => i !== 2);
            ws.send(JSON.stringify({ t: 'postban', hero: opp[0] }));
          }
        }
        if (m.t === 'battle') {
          local = new Battle(m.config);
          local.record = false;
          local.start();
          ws.send(JSON.stringify({ t: 'auto', on: true }));
        }
        if (m.t === 'input' && local) {
          local.act(m.input);
          ws.send(JSON.stringify({ t: 'ready', n: m.n }));
        }
        if (m.t === 'end') {
          clearTimeout(timer);
          ws.close();
          resolve({ winner: m.winner, localWinner: local ? local.winner : -9, picks });
        }
      });
    });
    expect(result.picks[0].length).toBe(5);
    expect(result.picks[1].length).toBe(5);
    expect(result.localWinner).toBe(result.winner); // lockstep clients agree with the server
  }, 250000);
});
