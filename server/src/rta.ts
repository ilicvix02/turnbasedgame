// World Arena: real-time matchmaking, Epic Seven-style draft and server-authoritative live battles over WebSocket.
import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';
import '../../shared/data/index';
import { PLAYABLE } from '../../shared/data/index';
import { getHero } from '../../shared/engine/registry';
import { Battle } from '../../shared/engine/battle';
import { chooseAction } from '../../shared/engine/ai';
import { Rng } from '../../shared/engine/rng';
import type { BattleConfig, Input, UnitSetup } from '../../shared/engine/types';
import { metaBuild } from '../../shared/meta/builds';
import { npcSetup } from '../../shared/meta/progression';
import { HERO_TIER } from '../../shared/meta/tiers';
import { ARCHETYPES } from '../../shared/meta/meta';
import {
  bannedHeroes, currentPicker, finalTeams, isAvailable, newDraft, PREBAN_COUNT, PROTECTED_PICK, TIMERS, type DraftState, type Side,
} from '../../shared/meta/draft';
import type { DB } from './db';
import { loadProfile, setupsFor } from './game';

type Mode = 'ranked' | 'mock';

interface Player {
  userId: number; // <0 for bots
  name: string;
  mmr: number;
  bot: boolean;
  ws?: WebSocket;
  roster: Record<string, UnitSetup>; // heroId -> setup
  auto: boolean;
  idle: number;
  ready: number; // last input index fully animated
  connected: boolean;
}

interface Match {
  id: string;
  mode: Mode;
  p: [Player, Player];
  draft: DraftState;
  battle?: Battle;
  config?: BattleConfig;
  inputs: Input[];
  turnDeadline: number;
  over: boolean;
  timer?: NodeJS.Timeout;
  created: number;
}

interface QueueEntry { userId: number; ws: WebSocket; name: string; mmr: number; mode: Mode; since: number }

const BOT_NAMES = ['Ashen Duelist', 'Warden of Glass', 'Moonlit Fox', 'The Ninth Bell', 'Cinder Savant', 'Hollow Regent', 'Starfall Adept', 'Gearwright Prime', 'Velvet Scythe', 'Old Oak'];
const BOT_WAIT_MS = Number(process.env.RTA_BOT_WAIT_MS || 12000);

export class RtaService {
  queue: QueueEntry[] = [];
  matches = new Map<string, Match>();
  byUser = new Map<number, string>(); // userId -> matchId
  sockets = new Map<number, WebSocket>();

  constructor(private db: DB) {
    setInterval(() => this.matchmake(), 1000).unref();
    setInterval(() => this.tickTimers(), 500).unref();
  }

  send(ws: WebSocket | undefined, msg: unknown) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  // ───────────────────────────── connection lifecycle ─────────────────────────────
  onConnect(userId: number, name: string, ws: WebSocket) {
    const old = this.sockets.get(userId);
    if (old && old !== ws) try { old.close(4000, 'replaced'); } catch { /* ignore */ }
    this.sockets.set(userId, ws);
    const mid = this.byUser.get(userId);
    const m = mid ? this.matches.get(mid) : undefined;
    this.send(ws, { t: 'hello', name, inMatch: !!m });
    if (m && !m.over) {
      const side = m.p[0].userId === userId ? 0 : 1;
      m.p[side].ws = ws;
      m.p[side].connected = true;
      this.sendMatchState(m, side as Side);
    }
  }

  onClose(userId: number, ws: WebSocket) {
    if (this.sockets.get(userId) === ws) this.sockets.delete(userId);
    this.queue = this.queue.filter((q) => q.userId !== userId);
    const mid = this.byUser.get(userId);
    const m = mid ? this.matches.get(mid) : undefined;
    if (m) {
      const side = m.p[0].userId === userId ? 0 : 1;
      if (m.p[side].ws === ws) {
        m.p[side].connected = false;
        this.send(m.p[1 - side].ws, { t: 'notice', msg: `${m.p[side].name} disconnected — their turns will be auto-played.` });
      }
    }
  }

  onMessage(userId: number, name: string, ws: WebSocket, raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    try {
      switch (msg.t) {
        case 'queue': return this.enqueue(userId, name, ws, msg.mode === 'mock' ? 'mock' : 'ranked');
        case 'cancel': this.queue = this.queue.filter((q) => q.userId !== userId); return this.send(ws, { t: 'cancelled' });
        case 'preban': return this.onPreban(userId, msg.heroes);
        case 'pick': return this.onPick(userId, msg.heroes);
        case 'postban': return this.onPostban(userId, msg.hero);
        case 'input': return this.onInput(userId, msg.input);
        case 'auto': return this.onAuto(userId, !!msg.on);
        case 'ready': return this.onReady(userId, Number(msg.n));
        case 'surrender': return this.onSurrender(userId);
        case 'emote': return this.onEmote(userId, String(msg.id || '').slice(0, 24));
        case 'leave': return this.onLeave(userId);
        case 'ping': return this.send(ws, { t: 'pong' });
      }
    } catch (e) {
      this.send(ws, { t: 'error', msg: (e as Error).message });
    }
  }

  // ───────────────────────────── matchmaking ─────────────────────────────
  private rosterFor(userId: number, mode: Mode): Record<string, UnitSetup> {
    if (mode === 'mock') return Object.fromEntries(PLAYABLE().map((h) => [h.id, metaBuild(h.id)]));
    const p = loadProfile(this.db, userId);
    // best copy of each hero
    const best: Record<string, (typeof p.heroes)[number]> = {};
    for (const h of p.heroes) {
      const cur = best[h.heroId];
      if (!cur || h.stars * 100 + h.level > cur.stars * 100 + cur.level) best[h.heroId] = h;
    }
    const out: Record<string, UnitSetup> = {};
    for (const [hid, h] of Object.entries(best)) out[hid] = setupsFor(p, [h.uid])[0];
    return out;
  }

  private enqueue(userId: number, name: string, ws: WebSocket, mode: Mode) {
    if (this.byUser.has(userId)) {
      const m = this.matches.get(this.byUser.get(userId)!);
      if (m && !m.over) throw new Error('You are already in a match.');
    }
    if (mode === 'ranked') {
      const roster = this.rosterFor(userId, 'ranked');
      if (Object.keys(roster).length < 5) throw new Error('Ranked World Arena requires at least 5 different heroes. Try a Mock Draft!');
    }
    const row = this.db.prepare('SELECT mmr FROM rta WHERE user_id = ?').get(userId) as { mmr: number } | undefined;
    this.queue = this.queue.filter((q) => q.userId !== userId);
    this.queue.push({ userId, ws, name, mmr: row?.mmr ?? 1200, mode, since: Date.now() });
    this.send(ws, { t: 'queued', mode, botAfter: BOT_WAIT_MS });
  }

  private matchmake() {
    const now = Date.now();
    for (const mode of ['ranked', 'mock'] as Mode[]) {
      const q = this.queue.filter((x) => x.mode === mode).sort((a, b) => a.since - b.since);
      const used = new Set<number>();
      for (const a of q) {
        if (used.has(a.userId)) continue;
        const range = 100 + ((now - a.since) / 1000) * 25;
        const b = q.find((x) => x !== a && !used.has(x.userId) && Math.abs(x.mmr - a.mmr) <= range);
        if (b) {
          used.add(a.userId).add(b.userId);
          this.createMatch(mode, a, b);
        } else if (now - a.since >= BOT_WAIT_MS) {
          used.add(a.userId);
          this.createMatch(mode, a, null);
        }
      }
      this.queue = this.queue.filter((x) => !used.has(x.userId));
    }
  }

  private makeBot(mode: Mode, vs: QueueEntry, roster: Record<string, UnitSetup>): Player {
    const rng = new Rng(Date.now() >>> 0);
    let botRoster: Record<string, UnitSetup>;
    if (mode === 'mock') botRoster = Object.fromEntries(PLAYABLE().map((h) => [h.id, metaBuild(h.id)]));
    else {
      const levels = Object.values(roster).map((u) => u.level).sort((a, b) => b - a).slice(0, 5);
      const lvl = Math.round(levels.reduce((s, x) => s + x, 0) / Math.max(1, levels.length));
      const pool = rng.shuffle(PLAYABLE()).slice(0, 16);
      botRoster = Object.fromEntries(pool.map((h) => [h.id, lvl >= 55 ? metaBuild(h.id, { skillLv: 3 }) : npcSetup(h.id, Math.max(10, lvl), { skillLv: Math.min(5, Math.floor(lvl / 12)) })]));
    }
    return { userId: -1 - Math.floor(rng.next() * 1e6), name: rng.pick(BOT_NAMES), mmr: vs.mmr + rng.int(-60, 60), bot: true, roster: botRoster, auto: true, idle: 0, ready: Infinity, connected: true };
  }

  private createMatch(mode: Mode, a: QueueEntry, b: QueueEntry | null) {
    const rosterA = this.rosterFor(a.userId, mode);
    const pa: Player = { userId: a.userId, name: a.name, mmr: a.mmr, bot: false, ws: a.ws, roster: rosterA, auto: false, idle: 0, ready: 0, connected: true };
    const pb: Player = b
      ? { userId: b.userId, name: b.name, mmr: b.mmr, bot: false, ws: b.ws, roster: this.rosterFor(b.userId, mode), auto: false, idle: 0, ready: 0, connected: true }
      : this.makeBot(mode, a, rosterA);
    const id = randomBytes(8).toString('hex');
    const first = (Math.random() < 0.5 ? 0 : 1) as Side;
    const m: Match = { id, mode, p: [pa, pb], draft: newDraft(first, Date.now()), inputs: [], turnDeadline: 0, over: false, created: Date.now() };
    this.matches.set(id, m);
    for (const p of m.p) if (!p.bot) this.byUser.set(p.userId, id);
    for (const s of [0, 1] as Side[]) this.sendMatchState(m, s);
    if (pb.bot) this.botPreban(m, 1);
  }

  private publicPlayer(p: Player) {
    return { name: p.name, mmr: p.mmr, bot: p.bot, roster: Object.keys(p.roster) };
  }

  /** Draft state visible to `side` (opponent's prebans hidden until reveal). */
  private draftView(m: Match, side: Side) {
    const d = m.draft;
    const pre: [string[], string[]] = d.phase === 'preban' ? [side === 0 ? d.prebans[0] : [], side === 1 ? d.prebans[1] : []] : d.prebans;
    const post: [string | null, string | null] = d.phase === 'postban' ? [side === 0 ? d.postbans[0] : null, side === 1 ? d.postbans[1] : null] : d.postbans;
    return { ...d, prebans: pre, postbans: post, picker: currentPicker(d) };
  }

  private sendMatchState(m: Match, side: Side) {
    const p = m.p[side];
    if (p.bot) return;
    this.send(p.ws, { t: 'match', id: m.id, mode: m.mode, you: side, players: [this.publicPlayer(m.p[0]), this.publicPlayer(m.p[1])], draft: this.draftView(m, side) });
    if (m.battle && m.config) this.send(p.ws, { t: 'battle', config: m.config, inputs: m.inputs, you: side, deadline: m.turnDeadline, auto: p.auto });
  }

  private broadcastDraft(m: Match) {
    for (const s of [0, 1] as Side[]) if (!m.p[s].bot) this.send(m.p[s].ws, { t: 'draft', draft: this.draftView(m, s) });
  }

  private sideOf(m: Match, userId: number): Side {
    if (m.p[0].userId === userId) return 0;
    if (m.p[1].userId === userId) return 1;
    throw new Error('Not in this match.');
  }

  private myMatch(userId: number) {
    const id = this.byUser.get(userId);
    const m = id ? this.matches.get(id) : undefined;
    if (!m || m.over) throw new Error('No active match.');
    return m;
  }

  // ───────────────────────────── draft ─────────────────────────────
  private onPreban(userId: number, heroes: unknown) {
    const m = this.myMatch(userId);
    if (m.draft.phase !== 'preban') throw new Error('Not in pre-ban phase.');
    const side = this.sideOf(m, userId);
    if (!Array.isArray(heroes) || heroes.length > PREBAN_COUNT) throw new Error(`Pre-ban up to ${PREBAN_COUNT} heroes.`);
    const list = [...new Set(heroes.filter((h) => typeof h === 'string' && PLAYABLE().some((x) => x.id === h)))] as string[];
    m.draft.prebans[side] = list;
    (m as any)[`preDone${side}`] = true;
    if ((m as any).preDone0 && (m as any).preDone1) this.endPreban(m);
    else this.broadcastDraft(m);
  }

  private endPreban(m: Match) {
    m.draft.phase = 'pick';
    m.draft.step = 0;
    m.draft.deadline = Date.now() + TIMERS.pick;
    this.broadcastDraft(m);
    this.maybeBotPick(m);
  }

  private onPick(userId: number, heroes: unknown) {
    const m = this.myMatch(userId);
    const side = this.sideOf(m, userId);
    this.applyPick(m, side, heroes);
  }

  private applyPick(m: Match, side: Side, heroes: unknown) {
    const d = m.draft;
    const cur = currentPicker(d);
    if (!cur || cur.side !== side) throw new Error('Not your pick.');
    if (!Array.isArray(heroes) || heroes.length !== cur.count) throw new Error(`Pick exactly ${cur.count}.`);
    const list = heroes as string[];
    if (new Set(list).size !== list.length) throw new Error('Duplicate pick.');
    for (const h of list) {
      if (!m.p[side].roster[h]) throw new Error('You do not own that hero.');
      if (!isAvailable(d, h)) throw new Error(`${getHero(h).name} is banned or already picked.`);
    }
    d.picks[side].push(...list);
    d.step++;
    if (d.step >= 6) {
      d.phase = 'postban';
      d.deadline = Date.now() + TIMERS.postban;
      (m as any).postDone0 = false;
      (m as any).postDone1 = false;
      this.broadcastDraft(m);
      for (const s of [0, 1] as Side[]) if (m.p[s].bot) this.botPostban(m, s);
      return;
    }
    d.deadline = Date.now() + TIMERS.pick;
    this.broadcastDraft(m);
    this.maybeBotPick(m);
  }

  private onPostban(userId: number, hero: unknown) {
    const m = this.myMatch(userId);
    if (m.draft.phase !== 'postban') throw new Error('Not in post-ban phase.');
    const side = this.sideOf(m, userId);
    this.applyPostban(m, side, hero as string);
  }

  private applyPostban(m: Match, side: Side, hero: string) {
    const d = m.draft;
    const opp = (1 - side) as Side;
    if (!d.picks[opp].includes(hero)) throw new Error('Ban one of your opponent\'s picks.');
    if (d.picks[opp][PROTECTED_PICK] === hero) throw new Error('That pick is protected.');
    d.postbans[side] = hero;
    (m as any)[`postDone${side}`] = true;
    if ((m as any).postDone0 && (m as any).postDone1) this.startBattle(m);
    else this.broadcastDraft(m);
  }

  // ── bot draft heuristics ──
  private score(m: Match, side: Side, h: string): number {
    const def = getHero(h);
    let s = HERO_TIER[h] ?? 40;
    const mine = m.draft.picks[side].map(getHero);
    // synergy: shared archetype with current picks
    for (const x of mine) if (x.archetypes.some((a) => def.archetypes.includes(a))) s += 6;
    // role balance: want 1 healer/support
    const sustain = mine.filter((x) => x.role === 'healer' || x.role === 'support').length;
    if ((def.role === 'healer' || def.role === 'support') && sustain === 0) s += 10;
    if ((def.role === 'healer' || def.role === 'support') && sustain >= 2) s -= 15;
    // counter-picking enemy archetypes
    const enemy = m.draft.picks[1 - side].map(getHero);
    for (const e of enemy) for (const ea of e.archetypes) for (const da of def.archetypes) if (ARCHETYPES[da]?.beats.includes(ea)) s += 3;
    return s;
  }

  private botPreban(m: Match, side: Side) {
    const opp = m.p[1 - side];
    const top = Object.keys(opp.roster).sort((a, b) => (HERO_TIER[b] ?? 0) - (HERO_TIER[a] ?? 0)).slice(0, 4);
    const rng = new Rng(Date.now() >>> 0);
    m.draft.prebans[side] = rng.shuffle(top).slice(0, PREBAN_COUNT);
    (m as any)[`preDone${side}`] = true;
    if ((m as any).preDone0 && (m as any).preDone1) this.endPreban(m);
  }

  private botPickList(m: Match, side: Side, count: number): string[] {
    const avail = Object.keys(m.p[side].roster).filter((h) => isAvailable(m.draft, h));
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const best = avail.filter((h) => !out.includes(h)).sort((a, b) => this.score(m, side, b) - this.score(m, side, a))[0];
      if (best) out.push(best);
    }
    return out;
  }

  private maybeBotPick(m: Match) {
    const cur = currentPicker(m.draft);
    if (!cur || !m.p[cur.side].bot) return;
    setTimeout(() => {
      if (m.over || m.draft.phase !== 'pick') return;
      const c2 = currentPicker(m.draft);
      if (!c2 || c2.side !== cur.side) return;
      this.applyPick(m, cur.side, this.botPickList(m, cur.side, cur.count));
    }, 1800 + Math.random() * 1800);
  }

  private botPostban(m: Match, side: Side) {
    const opp = (1 - side) as Side;
    const cands = m.draft.picks[opp].filter((h, i) => i !== PROTECTED_PICK);
    const ban = cands.sort((a, b) => (HERO_TIER[b] ?? 0) - (HERO_TIER[a] ?? 0))[0];
    setTimeout(() => { if (!m.over && m.draft.phase === 'postban') this.applyPostban(m, side, ban); }, 1500);
  }

  // ───────────────────────────── battle ─────────────────────────────
  private startBattle(m: Match) {
    m.draft.phase = 'done';
    const [t0, t1] = finalTeams(m.draft);
    const config: BattleConfig = {
      seed: randomBytes(4).readUInt32LE(0),
      mode: 'rta',
      teams: [
        { name: m.p[0].name, units: t0.map((h) => m.p[0].roster[h]) },
        { name: m.p[1].name, units: t1.map((h) => m.p[1].roster[h]) },
      ],
      maxActions: 300,
    };
    m.config = config;
    m.battle = new Battle(config);
    m.battle.record = false;
    m.battle.start();
    this.broadcastDraft(m);
    m.turnDeadline = Date.now() + TIMERS.turn + 4000;
    for (const s of [0, 1] as Side[]) if (!m.p[s].bot) this.send(m.p[s].ws, { t: 'battle', config, inputs: [], you: s, deadline: m.turnDeadline, auto: false });
    this.scheduleAi(m);
  }

  private activeSide(m: Match): Side | null {
    const b = m.battle;
    if (!b || b.pending === null) return null;
    return b.unit(b.pending).team as Side;
  }

  private applyInput(m: Match, input: Input) {
    const b = m.battle!;
    b.act(input);
    const applied = b.inputs[b.inputs.length - 1];
    m.inputs.push(applied);
    const n = m.inputs.length;
    for (const s of [0, 1] as Side[]) if (!m.p[s].bot) this.send(m.p[s].ws, { t: 'input', input: applied, n });
    if (b.winner >= 0) return this.finish(m, b.winner);
    m.turnDeadline = Date.now() + TIMERS.turn + 2500;
    for (const s of [0, 1] as Side[]) if (!m.p[s].bot) this.send(m.p[s].ws, { t: 'turn', deadline: m.turnDeadline });
    this.scheduleAi(m);
  }

  /** Bot / auto / disconnected sides play automatically once humans finished animating. */
  private scheduleAi(m: Match) {
    if (m.timer) clearTimeout(m.timer);
    const side = this.activeSide(m);
    if (side === null) return;
    const p = m.p[side];
    if (!(p.bot || p.auto || !p.connected)) return;
    const waitStart = Date.now();
    const tryGo = () => {
      if (m.over || this.activeSide(m) !== side) return;
      const humansReady = m.p.every((x) => x.bot || !x.connected || x.ready >= m.inputs.length);
      if (!humansReady && Date.now() - waitStart < 8000) {
        m.timer = setTimeout(tryGo, 250);
        return;
      }
      this.applyInput(m, chooseAction(m.battle!, 'normal'));
    };
    m.timer = setTimeout(tryGo, p.bot ? 700 : 400);
  }

  private onInput(userId: number, input: Input) {
    const m = this.myMatch(userId);
    if (!m.battle) throw new Error('Battle has not started.');
    const side = this.sideOf(m, userId);
    if (this.activeSide(m) !== side) throw new Error('Not your turn.');
    if (!input || typeof input !== 'object') throw new Error('Bad input.');
    m.p[side].idle = 0;
    this.applyInput(m, { actor: Number(input.actor), skill: (['s1', 's2', 's3'].includes(input.skill) ? input.skill : 's1') as Input['skill'], target: Number(input.target), sb: !!input.sb });
  }

  private onAuto(userId: number, on: boolean) {
    const m = this.myMatch(userId);
    const side = this.sideOf(m, userId);
    m.p[side].auto = on;
    this.send(m.p[side].ws, { t: 'auto', on });
    if (on) this.scheduleAi(m);
  }

  private onReady(userId: number, n: number) {
    const m = this.myMatch(userId);
    const side = this.sideOf(m, userId);
    if (Number.isFinite(n)) m.p[side].ready = Math.max(m.p[side].ready, n);
  }

  private onSurrender(userId: number) {
    const m = this.myMatch(userId);
    const side = this.sideOf(m, userId);
    this.finish(m, 1 - side, `${m.p[side].name} surrendered.`);
  }

  private onEmote(userId: number, id: string) {
    const m = this.myMatch(userId);
    const side = this.sideOf(m, userId);
    const other = m.p[1 - side];
    if (!other.bot) this.send(other.ws, { t: 'emote', id, from: side });
  }

  private onLeave(userId: number) {
    const id = this.byUser.get(userId);
    const m = id ? this.matches.get(id) : undefined;
    if (m && !m.over) {
      const side = this.sideOf(m, userId);
      this.finish(m, 1 - side, `${m.p[side].name} left the match.`);
    }
    this.byUser.delete(userId);
  }

  private tickTimers() {
    const now = Date.now();
    for (const m of this.matches.values()) {
      if (m.over) {
        if (now - m.created > 3600_000) this.matches.delete(m.id);
        continue;
      }
      const d = m.draft;
      try {
        if (d.phase === 'preban' && now > d.deadline) {
          for (const s of [0, 1] as Side[]) (m as any)[`preDone${s}`] = true;
          this.endPreban(m);
        } else if (d.phase === 'pick' && now > d.deadline) {
          const cur = currentPicker(d)!;
          this.applyPick(m, cur.side, this.botPickList(m, cur.side, cur.count));
        } else if (d.phase === 'postban' && now > d.deadline) {
          for (const s of [0, 1] as Side[]) {
            if (!(m as any)[`postDone${s}`]) {
              const opp = (1 - s) as Side;
              const cands = d.picks[opp].filter((_, i) => i !== PROTECTED_PICK);
              const ban = cands.sort((a, b) => (HERO_TIER[b] ?? 0) - (HERO_TIER[a] ?? 0))[0];
              d.postbans[s] = ban;
              (m as any)[`postDone${s}`] = true;
            }
          }
          this.startBattle(m);
        } else if (d.phase === 'done' && m.battle && now > m.turnDeadline) {
          const side = this.activeSide(m);
          if (side !== null) {
            const p = m.p[side];
            p.idle++;
            if (p.idle >= 3 && !p.auto) {
              p.auto = true;
              this.send(p.ws, { t: 'auto', on: true, reason: 'idle' });
            }
            this.applyInput(m, chooseAction(m.battle, 'normal'));
          }
        }
      } catch (e) {
        console.error('rta tick error', e);
      }
    }
  }

  private finish(m: Match, winner: number, reason?: string) {
    if (m.over) return;
    m.over = true;
    if (m.timer) clearTimeout(m.timer);
    const deltas: [number, number] = [0, 0];
    if (m.mode === 'ranked' && winner !== 2) {
      const [a, b] = m.p;
      const ea = 1 / (1 + Math.pow(10, (b.mmr - a.mmr) / 400));
      const sa = winner === 0 ? 1 : 0;
      const k = 32;
      deltas[0] = Math.round(k * (sa - ea));
      deltas[1] = -deltas[0];
      for (const s of [0, 1] as Side[]) {
        const p = m.p[s];
        if (p.bot) continue;
        const won = winner === s;
        this.db.prepare(`UPDATE rta SET mmr = MAX(0, mmr + ?), ${won ? 'wins = wins + 1' : 'losses = losses + 1'}, updated = ? WHERE user_id = ?`).run(deltas[s], Date.now(), p.userId);
        // reward
        const prof = loadProfile(this.db, p.userId);
        prof.crystals += won ? 60 : 15;
        prof.gold += won ? 15000 : 5000;
        this.db.prepare('UPDATE profiles SET data = ?, updated = ? WHERE user_id = ?').run(JSON.stringify(prof), Date.now(), p.userId);
      }
      this.db.prepare('INSERT INTO rta_matches (p1, p2, winner, draft, time) VALUES (?, ?, ?, ?, ?)').run(m.p[0].userId, m.p[1].userId, winner, JSON.stringify(m.draft), Date.now());
    }
    for (const s of [0, 1] as Side[]) {
      const p = m.p[s];
      if (p.bot) continue;
      this.send(p.ws, { t: 'end', winner, you: s, delta: deltas[s], reason, rewards: m.mode === 'ranked' ? { crystals: winner === s ? 60 : 15, gold: winner === s ? 15000 : 5000 } : null });
      this.byUser.delete(p.userId);
    }
  }

  stats() {
    return { queue: this.queue.length, matches: [...this.matches.values()].filter((m) => !m.over).length, online: this.sockets.size };
  }
}

export { bannedHeroes };
