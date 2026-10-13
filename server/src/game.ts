// Authoritative game economy: profiles, summons, upgrades, gear, campaign and arena battles.
import { randomBytes } from 'node:crypto';
import '../../shared/data/index';
import { PLAYABLE } from '../../shared/data/index';
import { getHero, HEROES } from '../../shared/engine/registry';
import { Battle } from '../../shared/engine/battle';
import { chooseAction, type AiLevel } from '../../shared/engine/ai';
import { Rng } from '../../shared/engine/rng';
import { ARTIFACTS } from '../../shared/engine/artifacts';
import type { BattleConfig, GearPiece, Input, TeamSetup, UnitSetup } from '../../shared/engine/types';
import {
  awakenCost, enhanceGear, gearEnhanceCost, levelCap, promoteCost, rollGear, skillEnhanceCost, unitSetup, xpToNext, type HeroInstance, artifactEnhanceCost,
} from '../../shared/meta/progression';
import { FLAG_REGEN_MS, FLAGS_MAX, PITY, STAMINA_MAX, STAMINA_REGEN_MS, SUMMON_COST, SUMMON_RATES, type Profile } from '../../shared/meta/profile';
import { STAGE_BY_ID, stageTeams, TUTORIAL } from '../../shared/data/campaign';
import { metaBuild } from '../../shared/meta/builds';
import { npcSetup } from '../../shared/meta/progression';
import type { DB } from './db';

export class GameError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}
const fail = (msg: string, status = 400): never => {
  throw new GameError(status, msg);
};

const srng = () => new Rng(randomBytes(4).readUInt32LE(0));

// ───────────────────────────── profile storage ─────────────────────────────
export function loadProfile(db: DB, userId: number): Profile {
  const row = db.prepare('SELECT data FROM profiles WHERE user_id = ?').get(userId) as { data: string } | undefined;
  if (!row) fail('No profile', 404);
  const p = JSON.parse(row!.data) as Profile;
  tickRegen(p);
  return p;
}

export function saveProfile(db: DB, userId: number, p: Profile) {
  db.prepare('INSERT INTO profiles (user_id, data, updated) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated').run(userId, JSON.stringify(p), Date.now());
}

function tickRegen(p: Profile) {
  const now = Date.now();
  if (p.stamina < STAMINA_MAX) {
    const n = Math.floor((now - p.staminaAt) / STAMINA_REGEN_MS);
    if (n > 0) {
      p.stamina = Math.min(STAMINA_MAX, p.stamina + n);
      p.staminaAt += n * STAMINA_REGEN_MS;
    }
  } else p.staminaAt = now;
  if (p.arena.flags < FLAGS_MAX) {
    const n = Math.floor((now - p.arena.flagsAt) / FLAG_REGEN_MS);
    if (n > 0) {
      p.arena.flags = Math.min(FLAGS_MAX, p.arena.flags + n);
      p.arena.flagsAt += n * FLAG_REGEN_MS;
    }
  } else p.arena.flagsAt = now;
}

function newUid(p: Profile, prefix: string) {
  p.seq += 1;
  return `${prefix}${p.seq.toString(36)}`;
}

export function makeHero(p: Profile, heroId: string, level = 1): HeroInstance & { artifactUid?: string | null } {
  const def = getHero(heroId);
  return { uid: newUid(p, 'h'), heroId, level, stars: def.rarity, awaken: 0, xp: 0, skillLv: [0, 0, 0], imprint: def.rarity === 5 ? 2 : def.rarity === 4 ? 1 : 0, gear: {}, artifactUid: null };
}

export function createProfile(db: DB, userId: number, name: string): Profile {
  const now = Date.now();
  const p: Profile = {
    v: 1, name, created: now, gold: 60000, crystals: 3000, mola: 12, runes: 60, stamina: STAMINA_MAX, staminaAt: now,
    heroes: [], gear: [], artifacts: [], campaign: { cleared: {}, tutorialDone: false }, summon: { pity: 0, total: 0 },
    arena: { flags: FLAGS_MAX, flagsAt: now, defense: [] }, daily: { last: '' }, seq: 0,
  };
  for (const id of ['wren', 'mirelle', 'ilse', 'gideon']) p.heroes.push(makeHero(p, id, 8));
  const rng = srng();
  const slots: GearPiece['slot'][] = ['weapon', 'helmet', 'armor', 'necklace', 'ring', 'boots'];
  for (let i = 0; i < 12; i++) {
    const g = rollGear(rng, { slot: slots[i % 6], set: i < 6 ? 'speed' : 'health', rarity: 3, tier: 30, id: newUid(p, 'g') });
    p.gear.push(g);
  }
  for (const id of ['trail_compass', 'oath_ring']) p.artifacts.push({ uid: newUid(p, 'a'), id, level: 0 });
  saveProfile(db, userId, p);
  db.prepare('INSERT OR IGNORE INTO arena (user_id, points, updated) VALUES (?, 1000, ?)').run(userId, now);
  db.prepare('INSERT OR IGNORE INTO rta (user_id, mmr, updated) VALUES (?, 1200, ?)').run(userId, now);
  return p;
}

// ───────────────────────────── helpers ─────────────────────────────
function hero(p: Profile, uid: unknown) {
  if (typeof uid !== 'string') fail('Bad hero id');
  const h = p.heroes.find((x) => x.uid === uid);
  if (!h) fail('Hero not found', 404);
  return h!;
}
function gearOf(p: Profile, id: unknown) {
  if (typeof id !== 'string') fail('Bad gear id');
  const g = p.gear.find((x) => x.id === id);
  if (!g) fail('Gear not found', 404);
  return g!;
}
function spend(p: Profile, cost: { gold?: number; crystals?: number; mola?: number; runes?: number; stamina?: number }) {
  for (const k of Object.keys(cost) as (keyof typeof cost)[]) if ((p[k] as number) < (cost[k] || 0)) fail(`Not enough ${k}.`);
  for (const k of Object.keys(cost) as (keyof typeof cost)[]) (p[k] as number) -= cost[k] || 0;
}

/** Build battle-ready setups for a list of hero uids (resolving gear and artifacts). */
export function setupsFor(p: Profile, uids: string[]): UnitSetup[] {
  const gearById = Object.fromEntries(p.gear.map((g) => [g.id, g]));
  const insts: HeroInstance[] = uids.map((u) => {
    const h = hero(p, u);
    const art = h.artifactUid ? p.artifacts.find((a) => a.uid === h.artifactUid) : undefined;
    return { ...h, artifact: art ? { id: art.id, level: art.level } : null };
  });
  return insts.map((i) => unitSetup(i, gearById, insts));
}

function validateTeam(p: Profile, team: unknown, min = 1, max = 4): string[] {
  if (!Array.isArray(team) || team.length < min || team.length > max) fail(`Team must have ${min}–${max} heroes.`);
  const ids = team as string[];
  if (new Set(ids).size !== ids.length) fail('Duplicate hero in team.');
  const heroIds = ids.map((u) => hero(p, u).heroId);
  if (new Set(heroIds).size !== heroIds.length) fail('The same hero cannot be fielded twice.');
  return ids;
}

function grantXp(p: Profile, uids: string[], xp: number) {
  const out: { uid: string; levels: number }[] = [];
  for (const u of uids) {
    const h = p.heroes.find((x) => x.uid === u);
    if (!h) continue;
    h.xp += xp;
    let lv = 0;
    while (h.level < levelCap(h.stars) && h.xp >= xpToNext(h.level)) {
      h.xp -= xpToNext(h.level);
      h.level++;
      lv++;
    }
    if (h.level >= levelCap(h.stars)) h.xp = 0;
    out.push({ uid: u, levels: lv });
  }
  return out;
}

// ───────────────────────────── summon ─────────────────────────────
export function summon(p: Profile, count: number) {
  if (count !== 1 && count !== 10) fail('Summon 1 or 10.');
  spend(p, { crystals: SUMMON_COST * count });
  const rng = srng();
  const pool = PLAYABLE();
  const results: { uid: string; heroId: string; rarity: number; isNew: boolean }[] = [];
  let got4 = false;
  for (let i = 0; i < count; i++) {
    p.summon.pity++;
    p.summon.total++;
    let r: 3 | 4 | 5;
    const x = rng.next();
    if (p.summon.pity >= PITY || x < SUMMON_RATES[5]) r = 5;
    else if (x < SUMMON_RATES[5] + SUMMON_RATES[4]) r = 4;
    else r = 3;
    if (count === 10 && i === 9 && !got4 && r === 3) r = 4; // 10-pull guarantee
    if (r >= 4) got4 = true;
    if (r === 5) p.summon.pity = 0;
    const cands = pool.filter((h) => h.rarity === r);
    const def = rng.pick(cands);
    const isNew = !p.heroes.some((h) => h.heroId === def.id);
    const inst = makeHero(p, def.id, 1);
    p.heroes.push(inst);
    results.push({ uid: inst.uid, heroId: def.id, rarity: r, isNew });
  }
  return { results };
}

// ───────────────────────────── hero upgrades ─────────────────────────────
export function levelUp(p: Profile, uid: string, levels: number) {
  const h = hero(p, uid);
  levels = Math.max(1, Math.min(60, Math.floor(Number(levels) || 1)));
  let done = 0;
  for (let i = 0; i < levels; i++) {
    if (h.level >= levelCap(h.stars)) break;
    const cost = Math.floor(xpToNext(h.level) * 2.5);
    if (p.gold < cost) break;
    p.gold -= cost;
    h.level++;
    h.xp = 0;
    done++;
  }
  if (!done) fail(h.level >= levelCap(h.stars) ? 'Level cap reached — promote first.' : 'Not enough gold.');
  return { levels: done };
}

export function promote(p: Profile, uid: string) {
  const h = hero(p, uid);
  if (h.stars >= 6) fail('Already 6★.');
  if (h.level < levelCap(h.stars)) fail('Reach the level cap first.');
  const c = promoteCost(h.stars);
  spend(p, { gold: c.gold, runes: c.crystals * 5 });
  h.stars++;
  return {};
}

export function awaken(p: Profile, uid: string) {
  const h = hero(p, uid);
  if (h.awaken >= 6) fail('Fully awakened.');
  if (h.level < Math.min(60, 10 * (h.awaken + 1))) fail(`Requires level ${Math.min(60, 10 * (h.awaken + 1))}.`);
  const c = awakenCost(h.awaken);
  spend(p, { gold: c.gold, runes: c.runes });
  h.awaken++;
  return {};
}

export function enhanceSkill(p: Profile, uid: string, slot: number) {
  const h = hero(p, uid);
  if (![0, 1, 2].includes(slot)) fail('Bad skill.');
  const def = getHero(h.heroId);
  const sk = def.skills.filter((s) => s.slot === (['s1', 's2', 's3'] as const)[slot])[0];
  const max = sk?.enhance?.length ?? 0;
  if (h.skillLv[slot] >= max) fail('Skill fully enhanced.');
  const c = skillEnhanceCost(h.skillLv[slot]);
  spend(p, { gold: c.gold, mola: c.mola });
  h.skillLv[slot]++;
  return {};
}

export function imprintHero(p: Profile, uid: string, fodderUid: string) {
  const h = hero(p, uid);
  const f = hero(p, fodderUid);
  if (h === f) fail('Choose another copy.');
  if (f.heroId !== h.heroId) fail('Imprinting requires a copy of the same hero.');
  if (h.imprint >= 6) fail('Imprint is already SSS.');
  if (f.locked) fail('That copy is locked.');
  removeHero(p, f.uid);
  h.imprint++;
  return {};
}

function removeHero(p: Profile, uid: string) {
  const h = hero(p, uid);
  for (const gid of Object.values(h.gear)) {
    const g = p.gear.find((x) => x.id === gid);
    if (g) g.equippedBy = null;
  }
  if (h.artifactUid) {
    const a = p.artifacts.find((x) => x.uid === h.artifactUid);
    if (a) a.equippedBy = null;
  }
  p.heroes = p.heroes.filter((x) => x.uid !== uid);
  p.arena.defense = p.arena.defense.filter((x) => x !== uid);
}

export function releaseHero(p: Profile, uid: string) {
  const h = hero(p, uid);
  if (h.locked) fail('Hero is locked.');
  if (p.heroes.length <= 4) fail('Keep at least 4 heroes.');
  const def = getHero(h.heroId);
  removeHero(p, uid);
  const gold = 1000 * def.rarity * def.rarity + h.level * 200;
  const runes = def.rarity * 2;
  p.gold += gold;
  p.runes += runes;
  return { gold, runes };
}

export function lockHero(p: Profile, uid: string, locked: boolean) {
  hero(p, uid).locked = !!locked;
  return {};
}

// ───────────────────────────── gear ─────────────────────────────
export function equipGear(p: Profile, gearId: string, heroUid: string) {
  const g = gearOf(p, gearId);
  const h = hero(p, heroUid);
  // unequip from previous owner
  if (g.equippedBy) {
    const prev = p.heroes.find((x) => x.uid === g.equippedBy);
    if (prev) delete prev.gear[g.slot];
  }
  const cur = h.gear[g.slot];
  if (cur) {
    const cg = p.gear.find((x) => x.id === cur);
    if (cg) cg.equippedBy = null;
  }
  h.gear[g.slot] = g.id;
  g.equippedBy = h.uid;
  return {};
}

export function unequipGear(p: Profile, gearId: string) {
  const g = gearOf(p, gearId);
  if (g.equippedBy) {
    const h = p.heroes.find((x) => x.uid === g.equippedBy);
    if (h && h.gear[g.slot] === g.id) delete h.gear[g.slot];
  }
  g.equippedBy = null;
  return {};
}

export function enhanceGearOp(p: Profile, gearId: string, levels: number) {
  const g = gearOf(p, gearId);
  levels = Math.max(1, Math.min(15, Math.floor(Number(levels) || 1)));
  const rng = srng();
  let done = 0;
  for (let i = 0; i < levels && g.enhance < 15; i++) {
    const cost = gearEnhanceCost(g);
    if (p.gold < cost) break;
    p.gold -= cost;
    enhanceGear(rng, g);
    done++;
  }
  if (!done) fail(g.enhance >= 15 ? 'Already +15.' : 'Not enough gold.');
  return { gear: g };
}

export function sellGear(p: Profile, ids: unknown) {
  if (!Array.isArray(ids) || !ids.length) fail('Nothing to sell.');
  let gold = 0;
  for (const id of ids as string[]) {
    const g = gearOf(p, id);
    if (g.equippedBy || g.locked) continue;
    gold += Math.floor((g.level * 20 + g.enhance * 400) * g.rarity);
    p.gear = p.gear.filter((x) => x.id !== g.id);
  }
  p.gold += gold;
  return { gold };
}

export function equipArtifact(p: Profile, artUid: string | null, heroUid: string) {
  const h = hero(p, heroUid);
  if (h.artifactUid) {
    const prev = p.artifacts.find((a) => a.uid === h.artifactUid);
    if (prev) prev.equippedBy = null;
    h.artifactUid = null;
  }
  if (artUid) {
    const a = p.artifacts.find((x) => x.uid === artUid);
    if (!a) fail('Artifact not found', 404);
    const def = ARTIFACTS[a!.id];
    const hd = getHero(h.heroId);
    if (def.cls && !def.cls.includes(hd.cls)) fail(`${def.name} cannot be equipped by a ${hd.cls}.`);
    if (a!.equippedBy) {
      const other = p.heroes.find((x) => x.uid === a!.equippedBy);
      if (other) other.artifactUid = null;
    }
    a!.equippedBy = h.uid;
    h.artifactUid = a!.uid;
  }
  return {};
}

export function enhanceArtifact(p: Profile, artUid: string) {
  const a = p.artifacts.find((x) => x.uid === artUid);
  if (!a) fail('Artifact not found', 404);
  if (a!.level >= 30) fail('Max level.');
  spend(p, { gold: artifactEnhanceCost(a!.level) });
  a!.level++;
  return {};
}

export function claimDaily(p: Profile) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.daily.last === today) fail('Already claimed today.');
  p.daily.last = today;
  p.crystals += 500;
  p.gold += 20000;
  p.mola += 3;
  p.runes += 20;
  p.stamina = Math.min(STAMINA_MAX * 2, p.stamina + 60);
  return { crystals: 500, gold: 20000, mola: 3, runes: 20, stamina: 60 };
}

// ───────────────────────────── battles ─────────────────────────────
interface PendingBattle {
  id: string;
  userId: number;
  kind: 'campaign' | 'arena' | 'tutorial';
  config: BattleConfig;
  ai: AiLevel;
  team: string[];
  stageId?: string;
  opponent?: number;
  created: number;
}
const pending = new Map<string, PendingBattle>();
setInterval(() => {
  const cutoff = Date.now() - 3 * 3600 * 1000;
  for (const [k, v] of pending) if (v.created < cutoff) pending.delete(k);
}, 60_000).unref();

function newBattle(pb: Omit<PendingBattle, 'id' | 'created'>) {
  for (const [k, v] of pending) if (v.userId === pb.userId) pending.delete(k);
  const id = randomBytes(12).toString('hex');
  const full: PendingBattle = { ...pb, id, created: Date.now() };
  pending.set(id, full);
  return full;
}

export function startTutorial(userId: number) {
  const seed = randomBytes(4).readUInt32LE(0);
  const config: BattleConfig = {
    seed, mode: 'tutorial',
    teams: [
      { name: 'Choir of Solmere', units: TUTORIAL.heroes.map((h) => npcSetup(h, 18, { statMult: 1.1, skillLv: 1 })) },
      { name: 'Lost Hour', units: TUTORIAL.enemies.map((e) => npcSetup(e.id, e.level, { statMult: 0.9 })) },
    ],
  };
  const pb = newBattle({ userId, kind: 'tutorial', config, ai: 'easy', team: [] });
  return { battleId: pb.id, config, ai: pb.ai };
}

export function startCampaign(p: Profile, userId: number, stageId: string, team: unknown) {
  const st = STAGE_BY_ID[stageId];
  if (!st) fail('Unknown stage.', 404);
  const idx = st.chapter * 100 + st.index;
  const prevId = st.index > 1 ? `${st.chapter}-${st.index - 1}` : st.chapter > 1 ? `${st.chapter - 1}-10` : null;
  if (prevId && !(prevId in p.campaign.cleared)) fail('Clear the previous stage first.');
  void idx;
  if (p.stamina < st.stamina) fail('Not enough stamina.');
  const uids = validateTeam(p, team);
  const { first, waves } = stageTeams(st);
  const seed = randomBytes(4).readUInt32LE(0);
  const config: BattleConfig = { seed, mode: 'campaign', teams: [{ name: p.name, units: setupsFor(p, uids) }, first], waves };
  p.lastTeam = uids;
  const ai: AiLevel = st.chapter <= 1 ? 'easy' : 'normal';
  const pb = newBattle({ userId, kind: 'campaign', config, ai, team: uids, stageId });
  return { battleId: pb.id, config, ai };
}

/** Re-simulate a battle from inputs. Returns winner (0 = player). */
export function verify(config: BattleConfig, inputs: Input[], ai: AiLevel): { winner: number; turns: number } {
  const b = new Battle(config);
  b.record = false;
  b.start();
  let i = 0;
  let guard = 0;
  while (b.winner < 0) {
    if (++guard > 3000) break;
    const u = b.unit(b.pending!);
    if (u.team === 0) {
      const inp = inputs[i++];
      if (!inp) return { winner: 1, turns: b.actions }; // player abandoned
      if (inp.actor !== u.uid) throw new GameError(409, 'Battle desynchronised.');
      b.act(inp);
    } else {
      b.act(chooseAction(b, ai));
    }
  }
  return { winner: b.winner, turns: b.actions };
}

export function finishBattle(db: DB, p: Profile, userId: number, battleId: string, inputs: unknown) {
  const pb = pending.get(battleId);
  if (!pb || pb.userId !== userId) fail('Battle not found or expired.', 404);
  pending.delete(battleId);
  if (!Array.isArray(inputs) || inputs.length > 2000) fail('Bad inputs.');
  const clean: Input[] = (inputs as Input[]).map((x) => ({ actor: Number(x.actor), skill: (['s1', 's2', 's3'].includes(x.skill) ? x.skill : 's1') as Input['skill'], target: Number(x.target), sb: !!x.sb }));
  let res: { winner: number; turns: number };
  try {
    res = verify(pb!.config, clean, pb!.ai);
  } catch (e) {
    if (e instanceof GameError) throw e;
    fail('Battle verification failed: ' + (e as Error).message, 409);
  }
  const win = res!.winner === 0;
  const out: Record<string, unknown> = { win, turns: res!.turns };
  if (pb!.kind === 'tutorial') {
    if (!p.campaign.tutorialDone) {
      p.campaign.tutorialDone = true;
      const gift = makeHero(p, 'seraphine', 10);
      p.heroes.push(gift);
      out.gift = { uid: gift.uid, heroId: 'seraphine' };
    }
    return out;
  }
  if (pb!.kind === 'campaign') {
    const st = STAGE_BY_ID[pb!.stageId!];
    p.stamina -= win ? st.stamina : Math.ceil(st.stamina / 3);
    if (!win) return out;
    const first = !(st.id in p.campaign.cleared);
    const stars = res!.turns <= 25 ? 3 : res!.turns <= 45 ? 2 : 1;
    p.campaign.cleared[st.id] = Math.max(p.campaign.cleared[st.id] || 0, stars);
    const r = st.rewards;
    const rewards: Record<string, unknown> = { gold: r.gold, xp: r.xp, crystals: r.crystals + (first ? r.firstCrystals : 0), mola: r.mola || 0, runes: r.runes || 0, stars };
    p.gold += r.gold;
    p.crystals += (rewards.crystals as number);
    p.mola += r.mola || 0;
    p.runes += r.runes || 0;
    rewards.levels = grantXp(p, pb!.team, r.xp);
    const rng = srng();
    const drops: GearPiece[] = [];
    if (rng.chance(r.gearChance)) drops.push(rollGear(rng, { tier: r.gearTier, rarity: st.boss ? rng.int(4, 5) : rng.int(2, 5), id: newUid(p, 'g') }));
    if (st.boss && first) drops.push(rollGear(rng, { tier: r.gearTier, rarity: 5, id: newUid(p, 'g') }));
    p.gear.push(...drops);
    rewards.gear = drops;
    if (first && st.unlockHero && HEROES[st.unlockHero]) {
      const gift = makeHero(p, st.unlockHero, Math.max(1, st.level - 2));
      p.heroes.push(gift);
      rewards.gift = { uid: gift.uid, heroId: st.unlockHero };
    }
    if (first && st.boss) {
      const arts = Object.values(ARTIFACTS).filter((a) => a.rarity >= 4);
      const a = rng.pick(arts);
      p.artifacts.push({ uid: newUid(p, 'a'), id: a.id, level: 0 });
      rewards.artifact = a.id;
    }
    out.rewards = rewards;
    out.first = first;
    return out;
  }
  if (pb!.kind === 'arena') {
    return { ...out, ...arenaResult(db, p, userId, pb!.opponent!, win) };
  }
  return out;
}

// ───────────────────────────── arena ─────────────────────────────
const NPC_NAMES = ['Warden Ysolde', 'Sir Bramwell', 'The Grey Choir', 'Madame Tallow', 'Kestrel Nine', 'Old Man Furrow', 'Lady Quillon', 'Brother Ashe', 'Captain Merrow', 'The Twin Bells', 'Hollow Jack', 'Saint Odile'];

function npcTeam(points: number, idx: number): { name: string; units: UnitSetup[] } {
  const rng = new Rng(points * 131 + idx * 7);
  const pool = PLAYABLE().filter((h) => (points < 1150 ? h.rarity <= 4 : true));
  const picks = rng.shuffle(pool).slice(0, 4).map((h) => h.id);
  const lvl = Math.max(20, Math.min(60, Math.round(20 + (points - 900) / 25)));
  const skill = Math.min(5, Math.floor((lvl - 20) / 8));
  return { name: NPC_NAMES[idx % NPC_NAMES.length], units: picks.map((id) => (lvl >= 55 ? metaBuild(id, { skillLv: skill }) : npcSetup(id, lvl, { skillLv: skill }))) };
}

export function arenaState(db: DB, p: Profile, userId: number) {
  const row = db.prepare('SELECT points, wins, losses FROM arena WHERE user_id = ?').get(userId) as { points: number; wins: number; losses: number };
  const log = db.prepare('SELECT l.attacker, l.win, l.delta, l.time, u.username as name FROM arena_log l JOIN users u ON u.id = l.attacker WHERE l.defender = ? ORDER BY l.time DESC LIMIT 10').all(userId);
  return { ...row, flags: p.arena.flags, flagsAt: p.arena.flagsAt, defense: p.arena.defense, log };
}

export function setDefense(db: DB, p: Profile, userId: number, team: unknown) {
  const uids = validateTeam(p, team, 4, 4);
  p.arena.defense = uids;
  const setups = setupsFor(p, uids);
  db.prepare('UPDATE arena SET defense = ?, updated = ? WHERE user_id = ?').run(JSON.stringify(setups), Date.now(), userId);
  return {};
}

export function arenaOpponents(db: DB, userId: number) {
  const me = db.prepare('SELECT points FROM arena WHERE user_id = ?').get(userId) as { points: number };
  const rows = db.prepare('SELECT a.user_id as id, a.points, a.defense, u.username as name FROM arena a JOIN users u ON u.id = a.user_id WHERE a.user_id != ? AND a.defense IS NOT NULL ORDER BY ABS(a.points - ?) LIMIT 6').all(userId, me.points) as { id: number; points: number; defense: string; name: string }[];
  const list: { id: number; name: string; points: number; npc: boolean; team: string[]; levels: number[] }[] = rows.map((r) => {
    const d = JSON.parse(r.defense) as UnitSetup[];
    return { id: r.id, name: r.name, points: r.points, npc: false, team: d.map((u) => u.heroId), levels: d.map((u) => u.level) };
  });
  let i = 0;
  while (list.length < 6) {
    const pts = Math.max(900, me.points + (i - 2) * 60);
    const t = npcTeam(pts, i);
    list.push({ id: -(i + 1), name: t.name, points: pts, npc: true, team: t.units.map((u) => u.heroId), levels: t.units.map((u) => u.level) });
    i++;
  }
  return { opponents: list };
}

export function startArena(db: DB, p: Profile, userId: number, opponent: number, team: unknown) {
  if (p.arena.flags <= 0) fail('No arena flags left. They refill every 30 minutes.');
  const uids = validateTeam(p, team, 1, 4);
  let enemy: TeamSetup;
  if (opponent < 0) {
    const me = db.prepare('SELECT points FROM arena WHERE user_id = ?').get(userId) as { points: number };
    const i = -opponent - 1;
    if (i > 10) fail('Unknown opponent.');
    const pts = Math.max(900, me.points + (i - 2) * 60);
    enemy = npcTeam(pts, i);
  } else {
    if (opponent === userId) fail('You cannot attack yourself.');
    const row = db.prepare('SELECT a.defense, u.username as name FROM arena a JOIN users u ON u.id = a.user_id WHERE a.user_id = ?').get(opponent) as { defense: string; name: string } | undefined;
    if (!row?.defense) fail('Opponent has no defense.', 404);
    enemy = { name: row!.name, units: JSON.parse(row!.defense) };
  }
  p.arena.flags--;
  if (p.arena.flags === FLAGS_MAX - 1) p.arena.flagsAt = Date.now();
  const seed = randomBytes(4).readUInt32LE(0);
  const config: BattleConfig = { seed, mode: 'arena', teams: [{ name: p.name, units: setupsFor(p, uids) }, enemy] };
  const pb = newBattle({ userId, kind: 'arena', config, ai: 'normal', team: uids, opponent });
  return { battleId: pb.id, config, ai: pb.ai };
}

function arenaResult(db: DB, p: Profile, userId: number, opponent: number, win: boolean) {
  const me = db.prepare('SELECT points FROM arena WHERE user_id = ?').get(userId) as { points: number };
  let theirs = 1000;
  if (opponent > 0) theirs = (db.prepare('SELECT points FROM arena WHERE user_id = ?').get(opponent) as { points: number } | undefined)?.points ?? 1000;
  else theirs = Math.max(900, me.points + (-opponent - 3) * 60);
  const expected = 1 / (1 + Math.pow(10, (theirs - me.points) / 400));
  const delta = Math.round(40 * ((win ? 1 : 0) - expected));
  const myDelta = win ? Math.max(5, delta) : Math.min(-3, delta);
  db.prepare(`UPDATE arena SET points = MAX(0, points + ?), ${win ? 'wins = wins + 1' : 'losses = losses + 1'}, updated = ? WHERE user_id = ?`).run(myDelta, Date.now(), userId);
  if (opponent > 0) {
    db.prepare('UPDATE arena SET points = MAX(0, points - ?), updated = ? WHERE user_id = ?').run(win ? Math.round(myDelta / 2) : 0, Date.now(), opponent);
    db.prepare('INSERT INTO arena_log (attacker, defender, win, delta, time) VALUES (?, ?, ?, ?, ?)').run(userId, opponent, win ? 1 : 0, myDelta, Date.now());
  }
  const gold = win ? 8000 : 2000;
  const crystals = win ? 30 : 5;
  p.gold += gold;
  p.crystals += crystals;
  return { delta: myDelta, rewards: { gold, crystals } };
}

export function leaderboard(db: DB, kind: 'arena' | 'rta') {
  if (kind === 'arena') return db.prepare('SELECT u.username as name, a.points as score, a.wins, a.losses FROM arena a JOIN users u ON u.id = a.user_id ORDER BY a.points DESC LIMIT 50').all();
  return db.prepare('SELECT u.username as name, r.mmr as score, r.wins, r.losses FROM rta r JOIN users u ON u.id = r.user_id ORDER BY r.mmr DESC LIMIT 50').all();
}
