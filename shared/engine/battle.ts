// Deterministic battle core. Pure logic — no rendering, no timers, no Math.random.
// A battle is fully reproducible from (config.seed, config.teams, inputs[]).
import { Rng } from './rng';
import { STATUSES } from './statuses';
import { FIELDS } from './fields';
import { getHero } from './registry';
import { ARTIFACTS } from './artifacts';
import type {
  BattleConfig, Element, HeroDef, HeroHooks, HitType, Input, SkillDef, SkillSlot, Stats, StatKey, TeamSetup, UnitSetup,
} from './types';
import { HookCtx, SkillCtx } from './context';

export interface StatusInst {
  id: string;
  turns: number; // remaining turns; >= 99 = permanent
  src: number; // uid of applier (-1 system)
  value: number;
  fresh: boolean;
  key: number;
  data?: number;
}

export interface HitInfo {
  dmg: number;
  type: HitType;
  slot?: SkillSlot;
  aoe: boolean;
  isCounter: boolean;
  isDual: boolean;
  isDot: boolean;
  killed: boolean;
  blocked?: 'invincible' | 'nullified' | 'imprisoned';
  absorbed: number;
  adv: 'adv' | 'dis' | 'neutral';
}

export interface DmgOpts {
  atk?: number; // rate × attack
  hp?: number; // rate × own max HP
  def?: number; // rate × own defense
  spdScale?: number; // damage × (1 + speed × spdScale)
  tgtHp?: number; // rate × target max HP
  tgtCurHp?: number; // rate × target current HP
  flat?: number;
  pen?: number; // ignore x of target defense
  fixed?: boolean; // ignore defense entirely
  noCrit?: boolean;
  forceCrit?: boolean;
  noMiss?: boolean;
  aoe?: boolean;
  mult?: number;
  enh?: number;
  true?: boolean; // true damage: no modifiers at all
  isDot?: boolean;
  tag?: string;
  noTrigger?: boolean; // do not fire onAttacked etc.
  ccBonus?: number;
  cdBonus?: number;
}

export type BEvent =
  | { t: 'start'; units: UnitSnap[] }
  | { t: 'turn'; u: number; n: number }
  | { t: 'skill'; u: number; slot: SkillSlot; name: string; anim: string; vfx?: string; targets: number[]; sb: boolean; mode: ActionMode; ult: boolean }
  | { t: 'dmg'; src: number; u: number; v: number; hit: HitType; hp: number; absorbed: number; dot?: string; blocked?: string; adv?: string }
  | { t: 'heal'; u: number; v: number; hp: number }
  | { t: 'status'; u: number; id: string; op: 'add' | 'remove' | 'resist' | 'immune' | 'refresh' | 'tick'; turns?: number; stacks?: number }
  | { t: 'cr'; u: number; d: number; cr: number }
  | { t: 'crs'; v: { u: number; cr: number }[] }
  | { t: 'souls'; team: number; v: number; d: number }
  | { t: 'death'; u: number }
  | { t: 'revive'; u: number; hp: number }
  | { t: 'text'; u: number; s: string; c?: string }
  | { t: 'field'; id: string | null; team: number; turns: number; shattered?: boolean }
  | { t: 'cd'; u: number; slot: SkillSlot; v: number }
  | { t: 'wave'; n: number; units: UnitSnap[] }
  | { t: 'form'; u: number; form: string }
  | { t: 'await'; u: number }
  | { t: 'end'; winner: number };

export interface UnitSnap {
  uid: number;
  team: number;
  slot: number;
  heroId: string;
  hp: number;
  maxHp: number;
  cr: number;
  level: number;
  stars: number;
  boss: boolean;
}

export type ActionMode = 'main' | 'counter' | 'dual' | 'followup' | 'echo' | 'extra';

interface ActionCtx {
  actor: Unit;
  slot: SkillSlot;
  mode: ActionMode;
  sb: boolean;
  attacked: Map<number, number>; // uid -> hit count
  missed: Set<number>;
  nullified: Set<number>;
  resonance: boolean;
  echo: boolean;
  extra: boolean;
  primary?: Unit;
}

export class Unit {
  uid = 0;
  team: 0 | 1 = 0;
  slot = 0;
  heroId = '';
  level = 60;
  stars = 6;
  base!: Stats;
  hp = 0;
  cr = 0;
  alive = true;
  statuses: StatusInst[] = [];
  cd: Record<SkillSlot, number> = { s1: 0, s2: 0, s3: 0 };
  skillLv: [number, number, number] = [0, 0, 0];
  sets: string[] = [];
  artifact?: { id: string; level: number };
  ee?: number;
  data: Record<string, number> = {};
  form = 'base';
  turns = 0;
  boss = false;
  wave = 0;
  diedWith: string[] = [];
  get def(): HeroDef {
    return getHero(this.heroId);
  }
  has(id: string): boolean {
    for (const s of this.statuses) if (s.id === id) return true;
    return false;
  }
  get(id: string): StatusInst | undefined {
    return this.statuses.find((s) => s.id === id);
  }
  count(id: string): number {
    let n = 0;
    for (const s of this.statuses) if (s.id === id) n++;
    return n;
  }
  buffs(): StatusInst[] {
    return this.statuses.filter((s) => STATUSES[s.id]?.kind === 'buff');
  }
  debuffs(): StatusInst[] {
    return this.statuses.filter((s) => STATUSES[s.id]?.kind === 'debuff');
  }
  hasSet(id: string) {
    return this.sets.includes(id);
  }
}

const ADV: Record<Element, Element | Element[]> = {
  flame: 'verdant',
  verdant: 'frost',
  frost: 'flame',
  radiant: 'umbral',
  umbral: 'radiant',
};

export function advantage(a: Element, d: Element): 'adv' | 'dis' | 'neutral' {
  if (ADV[a] === d) return 'adv';
  if (ADV[d] === a) {
    // light/dark: mutual advantage, never disadvantage
    if ((a === 'radiant' && d === 'umbral') || (a === 'umbral' && d === 'radiant')) return 'adv';
    return 'dis';
  }
  return 'neutral';
}

export function enhanceTotals(def: SkillDef, lv: number) {
  const t = { dmg: 0, chance: 0, heal: 0, cd: 0 };
  const steps = def.enhance || [];
  for (let i = 0; i < Math.min(lv, steps.length); i++) {
    const s = steps[i];
    t.dmg += s.dmg || 0;
    t.chance += s.chance || 0;
    t.heal += s.heal || 0;
    t.cd += s.cd || 0;
  }
  return t;
}

const SLOT_IDX: Record<SkillSlot, number> = { s1: 0, s2: 1, s3: 2 };

export class Battle {
  cfg: BattleConfig;
  rng: Rng;
  units: Unit[] = [];
  souls: [number, number] = [0, 0];
  field: { id: string; team: 0 | 1; caster: number; turns: number } | null = null;
  events: BEvent[] = [];
  record = true;
  actions = 0;
  turnNo = 0;
  pending: number | null = null;
  winner = -1; // -1 ongoing, 0/1 team, 2 draw
  waveIdx = 0;
  lastActor: number | null = null;
  lastResonance = false;
  inputs: Input[] = [];
  priority: number | null = null;
  currentTurn: number | null = null;
  crDepth = 0;
  nextUid = 1;
  statusKey = 1;
  linkSeq = 1;
  actStack: ActionCtx[] = [];
  reactions: { u: Unit; kind: ActionMode; target: Unit; slot: SkillSlot }[] = [];
  started = false;
  /** speculative sim (AI lookahead) — disables some expensive work */
  speculative = false;

  constructor(cfg: BattleConfig) {
    this.cfg = cfg;
    this.rng = new Rng(cfg.seed);
    this.addTeam(cfg.teams[0], 0);
    this.addTeam(cfg.teams[1], 1);
  }

  // ───────────────────────────── setup ─────────────────────────────
  private addTeam(t: TeamSetup, team: 0 | 1, wave = 0) {
    t.units.forEach((s, i) => this.units.push(this.makeUnit(s, team, i, wave)));
  }

  private makeUnit(s: UnitSetup, team: 0 | 1, slot: number, wave: number): Unit {
    const u = new Unit();
    u.uid = this.nextUid++;
    u.team = team;
    u.slot = slot;
    u.heroId = s.heroId;
    u.level = s.level;
    u.stars = s.stars;
    u.base = { ...s.stats };
    u.skillLv = [...s.skillLv] as [number, number, number];
    u.sets = [...s.sets];
    u.artifact = s.artifact ? { ...s.artifact } : undefined;
    u.ee = s.ee;
    u.boss = !!getHero(s.heroId).boss;
    u.wave = wave;
    u.hp = this.maxHp(u);
    for (const sk of u.def.skills) {
      if (sk.startOnCd && !sk.passive) u.cd[sk.slot] = sk.cd;
    }
    return u;
  }

  snap(u: Unit): UnitSnap {
    return { uid: u.uid, team: u.team, slot: u.slot, heroId: u.heroId, hp: u.hp, maxHp: this.maxHp(u), cr: u.cr, level: u.level, stars: u.stars, boss: u.boss };
  }

  clone(): Battle {
    const b: Battle = Object.create(Battle.prototype);
    b.cfg = this.cfg;
    b.rng = this.rng.clone();
    b.units = this.units.map((u) => {
      const c = Object.create(Unit.prototype) as Unit;
      Object.assign(c, u);
      c.base = { ...u.base };
      c.statuses = u.statuses.map((s) => ({ ...s }));
      c.cd = { ...u.cd };
      c.skillLv = [...u.skillLv] as [number, number, number];
      c.sets = u.sets;
      c.data = { ...u.data };
      return c;
    });
    b.souls = [this.souls[0], this.souls[1]];
    b.field = this.field ? { ...this.field } : null;
    b.events = [];
    b.record = false;
    b.actions = this.actions;
    b.turnNo = this.turnNo;
    b.pending = this.pending;
    b.winner = this.winner;
    b.waveIdx = this.waveIdx;
    b.lastActor = this.lastActor;
    b.lastResonance = this.lastResonance;
    b.inputs = [];
    b.priority = this.priority;
    b.currentTurn = this.currentTurn;
    b.crDepth = 0;
    b.nextUid = this.nextUid;
    b.statusKey = this.statusKey;
    b.linkSeq = this.linkSeq;
    b.actStack = [];
    b.reactions = [];
    b.started = this.started;
    b.speculative = true;
    return b;
  }

  // ───────────────────────────── queries ─────────────────────────────
  emit(e: BEvent) {
    if (this.record) this.events.push(e);
  }
  unit(uid: number): Unit {
    const u = this.units.find((x) => x.uid === uid);
    if (!u) throw new Error('no unit ' + uid);
    return u;
  }
  living(team?: number): Unit[] {
    return this.units.filter((u) => u.alive && (team === undefined || u.team === team));
  }
  allies(u: Unit, includeSelf = true) {
    return this.units.filter((x) => x.alive && x.team === u.team && (includeSelf || x !== u));
  }
  enemies(u: Unit) {
    return this.units.filter((x) => x.alive && x.team !== u.team);
  }
  deadAllies(u: Unit) {
    return this.units.filter((x) => !x.alive && x.team === u.team && x.wave === u.wave && !x.has('extinction'));
  }
  isVanguard(u: Unit) {
    const allies = this.allies(u).sort((a, b) => a.slot - b.slot);
    return allies[0] === u;
  }
  behind(u: Unit): Unit | undefined {
    const allies = this.allies(u).sort((a, b) => a.slot - b.slot);
    const i = allies.indexOf(u);
    return allies[i + 1];
  }
  get actx(): ActionCtx | undefined {
    return this.actStack[this.actStack.length - 1];
  }

  hooksOf(u: Unit): HeroHooks[] {
    const out: HeroHooks[] = [];
    const h = u.def.hooks;
    if (h) out.push(h);
    if (u.artifact) {
      const a = ARTIFACTS[u.artifact.id];
      if (a?.hooks) out.push(a.hooks);
    }
    return out;
  }

  fire<K extends keyof HeroHooks>(u: Unit, name: K, ...args: any[]): any {
    let ret: any;
    for (const h of this.hooksOf(u)) {
      const fn = h[name] as any;
      if (fn) {
        const r = fn(new HookCtx(this, u), ...args);
        if (r !== undefined) ret = ret || r;
      }
    }
    return ret;
  }

  stat(u: Unit, key: StatKey): number {
    const base = u.base[key];
    let add = 0;
    const groups: Record<string, number> = {};
    for (const s of u.statuses) {
      const d = STATUSES[s.id];
      if (!d?.mods) continue;
      const v = d.mods[key];
      if (v === undefined) continue;
      if (d.group) {
        const g = d.group;
        if (groups[g] === undefined || Math.abs(v) > Math.abs(groups[g])) groups[g] = v;
      } else add += v * (d.maxStacks ? 1 : 1);
    }
    for (const g in groups) add += groups[g];
    for (const h of this.hooksOf(u)) {
      if (h.stats) {
        const m = h.stats(u, this);
        const v = m[key];
        if (v) add += v;
      }
    }
    if (u.artifact) {
      const a = ARTIFACTS[u.artifact.id];
      const m = a?.mods?.[key];
      if (m) add += m * (1 + u.artifact.level / 30);
    }
    if (key === 'atk' || key === 'hp' || key === 'def' || key === 'spd') {
      let v = base * (1 + add);
      if (key === 'spd' && this.field) v *= FIELDS[this.field.id].spdMult ?? 1;
      return Math.max(key === 'spd' ? 1 : 0, v);
    }
    let v = base + add;
    if (key === 'cc' && this.field) v += FIELDS[this.field.id].ccBonus ?? 0;
    if (key === 'cd') v = Math.min(3.5, v);
    if (key === 'cc') v = Math.min(1, v);
    return v;
  }

  maxHp(u: Unit): number {
    return Math.max(1, Math.floor(this.stat(u, 'hp')));
  }
  hpPct(u: Unit) {
    return u.hp / this.maxHp(u);
  }

  skillOf(u: Unit, slot: SkillSlot): SkillDef | undefined {
    const list = u.def.skills.filter((s) => s.slot === slot);
    return list.find((s) => s.form === u.form) || list.find((s) => !s.form) || list[0];
  }

  soulCap(team: number) {
    return this.living(team).some((u) => u.def.overcharge) ? 30 : 20;
  }

  /** Skills the pending actor may use right now. */
  options(u: Unit): { slot: SkillSlot; ok: boolean; reason?: string; skill: SkillDef }[] {
    const out: { slot: SkillSlot; ok: boolean; reason?: string; skill: SkillDef }[] = [];
    const provoked = u.has('provoke');
    const silenced = u.has('silence');
    for (const slot of ['s1', 's2', 's3'] as SkillSlot[]) {
      const sk = this.skillOf(u, slot);
      if (!sk || sk.passive) continue;
      let ok = true;
      let reason: string | undefined;
      if (u.cd[slot] > 0) { ok = false; reason = `Cooldown ${u.cd[slot]}`; }
      else if ((provoked) && slot !== 's1') { ok = false; reason = 'Provoked'; }
      else if (silenced && slot !== 's1') { ok = false; reason = 'Silenced'; }
      else if (sk.usable && !sk.usable(u, this)) { ok = false; reason = 'Condition not met'; }
      else if ((sk.target === 'enemy' || sk.target === 'deadAlly') && this.validTargets(u, slot).length === 0) { ok = false; reason = 'No target'; }
      out.push({ slot, ok, reason, skill: sk });
    }
    return out;
  }

  isTargetable(t: Unit, by: Unit): boolean {
    if (!t.alive) return false;
    if (t.has('imprison')) return false;
    if (t.team !== by.team && t.has('stealth')) {
      const others = this.enemies(by).filter((x) => !x.has('stealth') && !x.has('imprison'));
      return others.length === 0;
    }
    return true;
  }

  validTargets(u: Unit, slot: SkillSlot): Unit[] {
    const sk = this.skillOf(u, slot);
    if (!sk) return [];
    if (sk.target === 'enemy') {
      const provoker = u.get('provoke');
      if (provoker && slot === 's1') {
        const p = this.units.find((x) => x.uid === provoker.src);
        if (p && p.alive && !p.has('imprison')) return [p];
      }
      return this.enemies(u).filter((t) => this.isTargetable(t, u));
    }
    if (sk.target === 'ally') return this.allies(u).filter((t) => !t.has('imprison'));
    if (sk.target === 'deadAlly') return this.deadAllies(u);
    return [];
  }

  // ───────────────────────────── flow ─────────────────────────────
  start() {
    if (this.started) return;
    this.started = true;
    this.emit({ t: 'start', units: this.units.map((u) => this.snap(u)) });
    for (const u of this.units) u.cr = this.rng.next() * 5;
    for (const u of this.units) this.battleStartFor(u);
    this.emitCrs();
    this.advance();
  }

  private battleStartFor(u: Unit) {
    if (u.hasSet('immunity')) this.applyStatus(u, u, 'immunity', 1, { unres: true, silent: false });
    if (u.hasSet('protection')) {
      for (const a of this.allies(u)) this.applyStatus(u, a, 'barrier', 2, { value: this.maxHp(u) * 0.15 });
    }
    this.fire(u, 'onBattleStart');
  }

  emitCrs() {
    if (!this.record) return;
    this.emit({ t: 'crs', v: this.units.filter((u) => u.alive).map((u) => ({ u: u.uid, cr: u.cr })) });
  }

  private pickNext(): Unit | null {
    const alive = this.units.filter((u) => u.alive);
    if (!alive.length) return null;
    if (this.priority !== null) {
      const p = alive.find((u) => u.uid === this.priority);
      this.priority = null;
      if (p) {
        p.cr = 100;
        return p;
      }
    }
    let best: Unit | null = null;
    let bestT = Infinity;
    let bestSpd = 0;
    for (const u of alive) {
      const spd = this.stat(u, 'spd');
      const t = Math.max(0, (100 - u.cr) / spd);
      if (t < bestT - 1e-9 || (Math.abs(t - bestT) <= 1e-9 && (u.cr > (best?.cr ?? -1) || spd > bestSpd))) {
        best = u;
        bestT = t;
        bestSpd = spd;
      }
    }
    if (!best) return null;
    if (bestT > 0) {
      for (const u of alive) u.cr = Math.min(100, u.cr + this.stat(u, 'spd') * bestT);
    }
    best.cr = 100;
    return best;
  }

  /** Runs the simulation until a decision is needed or the battle ends. */
  advance() {
    this.pending = null;
    let guard = 0;
    while (this.winner < 0) {
      if (++guard > 1000) throw new Error('advance loop guard');
      if (this.checkEnd()) return;
      const maxA = this.cfg.maxActions ?? 300;
      if (this.actions >= maxA) {
        this.finish(2);
        return;
      }
      const actor = this.pickNext();
      if (!actor) {
        this.checkEnd();
        return;
      }
      const res = this.beginTurn(actor);
      if (res === 'dead') continue;
      if (res === 'skip') {
        this.endTurn(actor, null);
        continue;
      }
      if (this.checkEnd()) return;
      if (!this.options(actor).some((o) => o.ok)) {
        this.emit({ t: 'text', u: actor.uid, s: 'No target', c: '#999' });
        this.endTurn(actor, null);
        continue;
      }
      this.pending = actor.uid;
      this.emit({ t: 'await', u: actor.uid });
      return;
    }
  }

  private beginTurn(u: Unit): 'act' | 'skip' | 'dead' {
    this.turnNo++;
    u.turns++;
    u.cr = 0;
    this.currentTurn = u.uid;
    this.emit({ t: 'turn', u: u.uid, n: this.turnNo });
    this.emitCrs();
    // damage over time
    const dots: Record<string, number> = {};
    for (const s of u.statuses) {
      const d = STATUSES[s.id];
      if (d?.dot) dots[s.id] = (dots[s.id] || 0) + s.value;
    }
    for (const id of Object.keys(dots)) {
      if (!u.alive) break;
      let v = dots[id];
      if (id === 'poison') v = this.maxHp(u) * 0.06 * u.count('poison');
      this.dealDamage(undefined, u, { flat: v, true: true, isDot: true, tag: id, noTrigger: true });
    }
    if (u.alive && u.has('regen')) this.heal(u, u, this.maxHp(u) * 0.12);
    if (u.alive) this.fire(u, 'onTurnStart');
    if (!u.alive) return 'dead';
    for (const s of u.statuses) {
      if (STATUSES[s.id]?.skipTurn) {
        this.emit({ t: 'text', u: u.uid, s: STATUSES[s.id].name, c: '#ffd34a' });
        return 'skip';
      }
    }
    return 'act';
  }

  private endTurn(u: Unit, used: SkillSlot | null) {
    // cooldowns
    for (const slot of ['s1', 's2', 's3'] as SkillSlot[]) {
      if (u.cd[slot] > 0) {
        u.cd[slot] = Math.max(0, u.cd[slot] - 1);
      }
    }
    if (u.alive) {
      if (u.has('bloom')) this.heal(u, u, this.maxHp(u) * 0.05);
      this.fire(u, 'onTurnEnd');
    }
    // status durations
    const expired: StatusInst[] = [];
    for (const s of u.statuses) {
      if (s.turns >= 99) continue;
      if (s.fresh) {
        s.fresh = false;
        continue;
      }
      s.turns -= 1;
      if (s.turns <= 0) expired.push(s);
    }
    for (const s of expired) {
      this.removeInst(u, s, 'expire');
      if (s.id === 'doom' && u.alive) {
        this.emit({ t: 'text', u: u.uid, s: 'DOOM', c: '#b04aff' });
        this.dealDamage(undefined, u, { flat: this.maxHp(u) * 0.3, true: true, isDot: true, tag: 'doom', noTrigger: true });
      }
    }
    // field duration (ticks on caster's turns)
    if (this.field && this.field.caster === u.uid) {
      this.field.turns--;
      if (this.field.turns <= 0) this.endField(false);
      else this.emit({ t: 'field', id: this.field.id, team: this.field.team, turns: this.field.turns });
    }
    this.actions++;
    if (this.actions === 80) this.emit({ t: 'text', u: u.uid, s: 'Tide of Ruin rises', c: '#ff4a4a' });
    this.currentTurn = null;
    this.emitCrs();
  }

  /** Execute the pending actor's decision. */
  act(input: Input) {
    if (this.winner >= 0) throw new Error('battle over');
    if (this.pending !== input.actor) throw new Error(`not ${input.actor}'s turn (pending ${this.pending})`);
    const u = this.unit(input.actor);
    const opt = this.options(u).find((o) => o.slot === input.skill);
    if (!opt || !opt.ok) throw new Error(`skill ${input.skill} unavailable: ${opt?.reason}`);
    const sk = opt.skill;
    let target: Unit | undefined;
    if (sk.target === 'enemy' || sk.target === 'ally' || sk.target === 'deadAlly') {
      const valid = this.validTargets(u, input.skill);
      target = valid.find((t) => t.uid === input.target);
      if (!target) {
        if (!valid.length) target = undefined;
        else throw new Error(`invalid target ${input.target}`);
      }
    } else if (sk.target === 'self') target = u;
    let sb = false;
    if (input.sb && sk.soulburn && this.souls[u.team] >= sk.soulburn.cost && !u.has('fear')) {
      sb = true;
      this.addSouls(u.team, -sk.soulburn.cost, true);
    }
    this.inputs.push({ actor: u.uid, skill: input.skill, target: target ? target.uid : -1, sb });
    this.pending = null;

    // resonance: consecutive actions by two different allies from the same Throne
    let resonance = false;
    if (this.lastActor !== null && this.lastActor !== u.uid && !this.lastResonance) {
      const prev = this.units.find((x) => x.uid === this.lastActor);
      if (prev && prev.alive && prev.team === u.team && prev.def.throne === u.def.throne) {
        resonance = true;
        this.emit({ t: 'text', u: u.uid, s: 'Resonance', c: '#7fe7ff' });
        this.addSouls(u.team, 1);
      }
    }
    const hadEcho = u.has('echo');
    const ax = this.runSkill(u, input.skill, target, sb, 'main', resonance);
    if (hadEcho && u.alive && this.winner < 0) {
      const echoInst = u.get('echo');
      if (echoInst) {
        this.removeInst(u, echoInst, 'consume');
        let t2 = target;
        if (t2 && !t2.alive) t2 = sk.target === 'enemy' ? this.enemies(u).find((x) => this.isTargetable(x, u)) : undefined;
        if (sk.target !== 'enemy' || t2) {
          this.emit({ t: 'text', u: u.uid, s: 'Echo', c: '#c7a6ff' });
          this.runSkill(u, input.skill, t2, false, 'echo', false);
        }
      }
    }
    this.processReactions(u, ax);
    if (u.alive) this.fire(u, 'afterSkill', input.skill, ax.primary ? [ax.primary] : []);
    for (const x of this.units) if (x.alive) this.fire(x, 'afterAnyAction', u, input.skill);
    const focus = u.get('focus');
    if (focus && ax.attacked.size > 0) this.removeInst(u, focus, 'consume');
    this.lastActor = u.uid;
    this.lastResonance = resonance;
    this.endTurn(u, input.skill);
    if (ax.extra && u.alive) {
      this.priority = u.uid;
      this.emit({ t: 'text', u: u.uid, s: 'Extra Turn', c: '#ffe680' });
    }
    this.advance();
  }

  runSkill(u: Unit, slot: SkillSlot, target: Unit | undefined, sb: boolean, mode: ActionMode, resonance = false): ActionCtx {
    const sk = this.skillOf(u, slot)!;
    const ax: ActionCtx = { actor: u, slot, mode, sb, attacked: new Map(), missed: new Set(), nullified: new Set(), resonance, echo: mode === 'echo', extra: false, primary: target };
    this.actStack.push(ax);
    const targets: number[] = sk.target === 'allEnemies' ? this.enemies(u).filter((t) => !t.has('imprison')).map((t) => t.uid) : sk.target === 'allAllies' ? this.allies(u).map((t) => t.uid) : target ? [target.uid] : [];
    this.emit({ t: 'skill', u: u.uid, slot, name: sk.name, anim: sk.anim, vfx: sk.vfx, targets, sb, mode, ult: slot === 's3' && mode === 'main' });
    if (mode === 'main') {
      const enh = enhanceTotals(sk, u.skillLv[SLOT_IDX[slot]]);
      if (sk.cd > 0) {
        u.cd[slot] = Math.max(1, sk.cd - enh.cd) + 0; // decremented at end of this turn
        this.emit({ t: 'cd', u: u.uid, slot, v: u.cd[slot] });
      }
      if (sk.souls) {
        const mult = this.field ? FIELDS[this.field.id].soulMult ?? 1 : 1;
        this.addSouls(u.team, sk.souls * mult);
      }
    }
    if (sk.run) sk.run(new SkillCtx(this, u, target, sb, slot, mode, sk));
    this.actStack.pop();
    return ax;
  }

  private processReactions(actor: Unit, ax: ActionCtx) {
    // counters from attacked units
    if (actor.alive) {
      for (const [uid] of ax.attacked) {
        const t = this.units.find((x) => x.uid === uid);
        if (!t || !t.alive || t.team === actor.team) continue;
        if (t.statuses.some((s) => STATUSES[s.id]?.skipTurn) || t.has('fear')) continue;
        if (this.reactions.some((r) => r.u === t && r.kind === 'counter')) continue;
        let chance = 0;
        if (t.has('counter')) chance = 1;
        else if (t.hasSet('counter')) chance = 0.2;
        if (chance > 0 && this.rng.chance(chance)) this.reactions.push({ u: t, kind: 'counter', target: actor, slot: 's1' });
      }
      // generic dual attack
      const prim = ax.primary;
      const sk = this.skillOf(actor, ax.slot)!;
      if (prim && prim.alive && prim.team !== actor.team && sk.target === 'enemy' && !actor.has('fear')) {
        const dualChance = this.stat(actor, 'dual');
        if (this.rng.chance(dualChance)) {
          const cands = this.allies(actor, false).filter((a) => !a.statuses.some((s) => STATUSES[s.id]?.skipTurn) && !a.has('fear'));
          if (cands.length) {
            const ally = this.rng.pick(cands);
            this.reactions.push({ u: ally, kind: 'dual', target: prim, slot: 's1' });
          }
        }
      }
    }
    let guard = 0;
    while (this.reactions.length && this.winner < 0) {
      if (++guard > 20) break;
      const r = this.reactions.shift()!;
      if (!r.u.alive) continue;
      let tgt = r.target;
      const sk = this.skillOf(r.u, r.slot);
      if (!sk) continue;
      if (sk.target === 'enemy') {
        if (!tgt.alive || !this.isTargetable(tgt, r.u)) {
          const alt = this.enemies(r.u).filter((x) => this.isTargetable(x, r.u));
          if (!alt.length) continue;
          tgt = alt[0];
        }
      }
      const label = r.kind === 'counter' ? 'Counter' : r.kind === 'dual' ? 'Dual Attack' : r.kind === 'followup' ? 'Follow-up' : '';
      if (label) this.emit({ t: 'text', u: r.u.uid, s: label, c: '#ffb347' });
      this.runSkill(r.u, r.slot, sk.target === 'enemy' || sk.target === 'ally' ? tgt : sk.target === 'self' ? r.u : undefined, false, r.kind);
      this.checkEnd();
    }
    this.reactions = [];
  }

  queueReaction(u: Unit, kind: ActionMode, target: Unit, slot: SkillSlot = 's1') {
    if (this.reactions.some((r) => r.u === u && r.kind === kind)) return;
    if (this.reactions.length > 8) return;
    this.reactions.push({ u, kind, target, slot });
  }

  /** Tide of Ruin: after 80 actions, damage ramps up and healing ramps down to force a result. */
  ruin(): number {
    if (this.actions < 80) return 1;
    return 1 + 0.25 * (Math.floor((this.actions - 80) / 8) + 1);
  }

  // ───────────────────────────── combat primitives ─────────────────────────────
  advOf(src: Unit, tgt: Unit): 'adv' | 'dis' | 'neutral' {
    return advantage(src.def.element, tgt.def.element);
  }

  dealDamage(src: Unit | undefined, tgt: Unit, o: DmgOpts): HitInfo {
    const ax = this.actx;
    const info: HitInfo = { dmg: 0, type: 'normal', aoe: !!o.aoe, isCounter: ax?.mode === 'counter', isDual: ax?.mode === 'dual', isDot: !!o.isDot, killed: false, absorbed: 0, adv: 'neutral', slot: ax?.slot };
    if (!tgt.alive) return info;
    if (tgt.has('imprison') && !o.isDot) {
      info.blocked = 'imprisoned';
      return info;
    }
    let raw = 0;
    if (o.true) {
      raw = (o.flat || 0) + (o.tgtHp || 0) * this.maxHp(tgt);
      if (o.isDot && this.field) raw *= FIELDS[this.field.id].dmgMult ?? 1;
    } else {
      if (!src) throw new Error('non-true damage requires a source');
      let adv = this.advOf(src, tgt);
      info.adv = adv;
      let elemMult = adv === 'adv' ? 1.1 : 1;
      if (this.field?.id && FIELDS[this.field.id].advantage) elemMult = FIELDS[this.field.id].advantage!(src.def.element, tgt.def.element, elemMult);
      // miss
      let miss = 0;
      if (!o.noMiss) {
        if (adv === 'dis') miss = 0.5;
        if (src.has('hit_down')) miss = 1 - (1 - miss) * 0.5;
        if (!o.aoe && tgt.has('evasion')) miss = 1 - (1 - miss) * 0.65;
      }
      let hitMult = 1;
      if (miss > 0 && this.rng.chance(miss)) {
        info.type = 'miss';
        hitMult = 0.75;
        ax?.missed.add(tgt.uid);
      } else {
        let cc = this.stat(src, 'cc') + (adv === 'adv' ? 0.15 : 0) + (o.ccBonus || 0);
        if (tgt.has('critres_up')) cc -= 0.5;
        if (tgt.has('crit_vuln')) cc += 0.25;
        const force = o.forceCrit || src.has('focus');
        if (!o.noCrit && (force || this.rng.chance(cc))) {
          info.type = 'crit';
          hitMult = Math.min(3.5, this.stat(src, 'cd') + (o.cdBonus || 0));
          if (this.field?.id === 'starfield') elemMult = Math.max(elemMult, 1.1);
        } else if (this.rng.chance(0.3)) {
          info.type = 'crush';
          hitMult = 1.3;
        }
      }
      raw = this.stat(src, 'atk') * (o.atk || 0) + this.maxHp(src) * (o.hp || 0) + this.stat(src, 'def') * (o.def || 0) + (o.flat || 0) + this.maxHp(tgt) * (o.tgtHp || 0) + tgt.hp * (o.tgtCurHp || 0);
      raw *= 1 + (o.enh || 0);
      if (o.spdScale) raw *= 1 + this.stat(src, 'spd') * o.spdScale;
      if (!o.fixed) {
        let pen = o.pen || 0;
        if (src.hasSet('penetration') && !o.aoe) pen = 1 - (1 - pen) * 0.85;
        if (src.hasSet('warfare') && (tgt.boss || this.isVanguard(tgt))) pen = 1 - (1 - pen) * 0.7;
        const d = this.stat(tgt, 'def') * (1 - Math.min(1, pen));
        raw /= d / 300 + 1;
      }
      // 1.871: Epic Seven's community-derived damage constant (see docs/RESEARCH.md)
      let mult = 1.871 * hitMult * elemMult * (o.mult ?? 1);
      if (src.hasSet('rage') && tgt.debuffs().length > 0) mult *= 1.3;
      if (src.hasSet('torrent')) mult *= 1.1;
      if (ax?.resonance && ax.actor === src) mult *= 1.1;
      if (ax?.echo && ax.actor === src) mult *= 0.4;
      if (src.has('fear')) mult *= 0.75;
      mult *= this.ruin();
      if (tgt.has('mark')) mult *= 1.25;
      if (this.field) {
        const f = FIELDS[this.field.id];
        mult *= f.dmgMult ?? 1;
        if (f.ownerDmgMult && src.team === this.field.team) mult *= f.ownerDmgMult;
      }
      for (const h of this.hooksOf(src)) if (h.dmgOut) mult *= h.dmgOut(src, tgt, this, ax?.slot);
      for (const a of this.units) if (a.alive && a.team === src.team) { const ah = a.def.hooks?.auraDmgOut; if (ah) mult *= ah(a, src, tgt, this); }
      for (const h of this.hooksOf(tgt)) if (h.dmgIn) mult *= h.dmgIn(tgt, src, this);
      raw *= mult;
      if (src.hasSet('injury')) raw += Math.min(this.maxHp(tgt) * 0.04, this.stat(src, 'atk') * 2) * hitMult;
    }
    let dmg = Math.max(1, Math.floor(raw));
    // invincibility / nullifier
    if (!o.isDot && !o.true && tgt.has('invincible')) {
      info.blocked = 'invincible';
      dmg = 0;
    } else if (!o.isDot && !o.true && ax && (ax.nullified.has(tgt.uid) || tgt.has('nullifier'))) {
      if (!ax.nullified.has(tgt.uid)) {
        const n = tgt.get('nullifier')!;
        this.removeInst(tgt, n, 'consume');
        ax.nullified.add(tgt.uid);
      }
      info.blocked = 'nullified';
      dmg = 0;
    }
    // guardian
    if (dmg > 0 && !o.true && src) {
      const guardian = this.allies(tgt, false).find((a) => a.has('guard'));
      if (guardian) {
        const red = Math.floor(dmg * 0.2);
        dmg -= red;
        if (guardian.alive) this.dealDamage(undefined, guardian, { flat: red, true: true, noTrigger: true, tag: 'guard' });
      }
    }
    // barrier
    const bar = tgt.get('barrier');
    if (bar && dmg > 0) {
      const ab = Math.min(bar.value, dmg);
      bar.value -= ab;
      dmg -= ab;
      info.absorbed = ab;
      if (bar.value <= 0.5) this.removeInst(tgt, bar, 'break');
    }
    tgt.hp -= dmg;
    if (tgt.has('immortal') && tgt.hp < 1) tgt.hp = 1;
    info.dmg = dmg;
    this.emit({ t: 'dmg', src: src ? src.uid : -1, u: tgt.uid, v: dmg, hit: info.type, hp: Math.max(0, tgt.hp), absorbed: info.absorbed, dot: o.isDot ? o.tag : undefined, blocked: info.blocked, adv: info.adv });

    if (tgt.hp <= 0) {
      const saved = this.fire(tgt, 'onLethal', src);
      if (saved && tgt.hp <= 0) tgt.hp = 1;
      if (tgt.hp <= 0) {
        info.killed = true;
        this.kill(tgt, src);
      }
    }
    if (dmg > 0 && tgt.alive) {
      const sl = tgt.get('sleep');
      if (sl && !o.isDot) this.removeInst(tgt, sl, 'wake');
    }
    // fate threads
    if (dmg > 0 && tgt.has('link') && o.tag !== 'link') {
      const linkId = tgt.get('link')!.data;
      for (const other of this.units) {
        if (other !== tgt && other.alive && other.statuses.some((s) => s.id === 'link' && s.data === linkId)) {
          this.dealDamage(undefined, other, { flat: dmg * 0.3, true: true, noTrigger: true, tag: 'link' });
        }
      }
    }
    if (o.noTrigger || o.isDot || !src) return info;
    // curse
    const curse = tgt.get('curse');
    if (curse && tgt.alive && dmg > 0) {
      this.removeInst(tgt, curse, 'trigger');
      this.dealDamage(undefined, tgt, { flat: curse.value * 0.5, true: true, noTrigger: true, tag: 'curse' });
    }
    // lifesteal
    if (src.alive && dmg > 0) {
      let ls = 0;
      if (src.hasSet('lifesteal')) ls += 0.2;
      if (src.has('vamp')) ls += 0.3;
      if (ls > 0) this.heal(src, src, dmg * ls);
    }
    if (ax && src.team !== tgt.team) ax.attacked.set(tgt.uid, (ax.attacked.get(tgt.uid) || 0) + 1);
    if (tgt.alive && src.team !== tgt.team) {
      if (tgt.hasSet('revenge') && this.hpPct(tgt) < 0.5) this.changeCr(tgt, 10);
      this.fire(tgt, 'onAttacked', src, info);
      for (const a of this.allies(tgt, false)) this.fire(a, 'onAllyAttacked', tgt, src, info);
    }
    if (src.alive) this.fire(src, 'onHit', tgt, info);
    if (src.team !== tgt.team) for (const a of this.allies(src, false)) this.fire(a, 'onAllyHit', src, tgt, info);
    return info;
  }

  heal(src: Unit, tgt: Unit, amount: number): number {
    if (!tgt.alive) return 0;
    if (this.field && FIELDS[this.field.id].healToDamage && tgt.team !== this.field.team) {
      const v = Math.floor(amount * 0.5);
      this.emit({ t: 'text', u: tgt.uid, s: 'Bloodmoon', c: '#ff3a4a' });
      this.dealDamage(undefined, tgt, { flat: v, true: true, noTrigger: true, tag: 'bloodmoon' });
      return 0;
    }
    if (tgt.has('unhealable')) {
      this.emit({ t: 'text', u: tgt.uid, s: 'Unhealable', c: '#aa4444' });
      return 0;
    }
    let v = amount / this.ruin();
    if (tgt.has('bloom')) v *= 1.3;
    const max = this.maxHp(tgt);
    const before = tgt.hp;
    tgt.hp = Math.min(max, tgt.hp + Math.floor(v));
    const got = tgt.hp - before;
    if (got > 0) {
      this.emit({ t: 'heal', u: tgt.uid, v: got, hp: tgt.hp });
      for (const a of this.allies(tgt)) if (a !== tgt) this.fire(a, 'onAllyHealed', tgt, got);
      for (const e of this.enemies(tgt)) this.fire(e, 'onEnemyHealed', tgt, got);
    }
    return got;
  }

  changeCr(tgt: Unit, delta: number, opts: { force?: boolean } = {}) {
    if (!tgt.alive || delta === 0) return;
    if (!opts.force && this.field && FIELDS[this.field.id].crLocked) return;
    if (delta > 0 && tgt.has('restrict') && !opts.force) {
      this.emit({ t: 'text', u: tgt.uid, s: 'Restricted', c: '#999' });
      return;
    }
    if (delta < 0 && tgt.has('boss_ward')) delta *= 0.5;
    const before = tgt.cr;
    tgt.cr = Math.max(0, Math.min(100, tgt.cr + delta));
    const d = tgt.cr - before;
    if (d === 0) return;
    this.emit({ t: 'cr', u: tgt.uid, d, cr: tgt.cr });
    if (d > 0 && this.crDepth < 2) {
      this.crDepth++;
      for (const e of this.enemies(tgt)) this.fire(e, 'onEnemyCrGain', tgt, d);
      this.crDepth--;
    }
  }

  addSouls(team: number, n: number, spend = false) {
    const cap = this.soulCap(team);
    const before = this.souls[team];
    this.souls[team] = Math.max(0, Math.min(spend ? Math.max(cap, before) : cap, before + n));
    if (this.souls[team] !== before) this.emit({ t: 'souls', team, v: this.souls[team], d: this.souls[team] - before });
  }

  applyStatus(src: Unit | undefined, tgt: Unit, id: string, turns: number, o: { chance?: number; unres?: boolean; value?: number; silent?: boolean; data?: number } = {}): boolean {
    if (!tgt.alive) return false;
    const def = STATUSES[id];
    if (!def) throw new Error('unknown status ' + id);
    const ax = this.actx;
    if (this.field && FIELDS[this.field.id].noStatus && def.kind !== 'state' && id !== 'extinction') return false;
    if (def.kind === 'debuff') {
      if (ax && (ax.missed.has(tgt.uid) || ax.nullified.has(tgt.uid))) return false;
      if (tgt.has('imprison') && id !== 'imprison') return false;
      if (tgt.has('immunity') && !def.sticky) {
        this.emit({ t: 'status', u: tgt.uid, id, op: 'immune' });
        return false;
      }
      const chance = o.chance ?? 1;
      if (!this.rng.chance(chance)) return false;
      if (!o.unres && src && src.team !== tgt.team) {
        const land = Math.max(0, Math.min(0.85, 1 + this.stat(src, 'eff') - this.stat(tgt, 'res')));
        if (!this.rng.chance(land)) {
          this.emit({ t: 'status', u: tgt.uid, id, op: 'resist' });
          return false;
        }
      }
      if (this.field) turns += FIELDS[this.field.id].debuffBonus ?? 0;
    } else if (def.kind === 'buff') {
      if (tgt.has('unbuffable')) return false;
      if (o.chance !== undefined && !this.rng.chance(o.chance)) return false;
      if (this.field) turns += FIELDS[this.field.id].buffBonus ?? 0;
    }
    const fresh = this.pendingOrActing(tgt);
    const value = o.value ?? (src && (def.dot === 'burn' || def.dot === 'bleed' || id === 'curse') ? this.stat(src, 'atk') * (def.dot === 'burn' ? 0.6 : def.dot === 'bleed' ? 0.4 : 1) : 0);
    if (def.maxStacks) {
      const same = tgt.statuses.filter((s) => s.id === id);
      if (same.length >= def.maxStacks) this.removeInst(tgt, same[0], 'overflow', true);
      tgt.statuses.push({ id, turns, src: src ? src.uid : -1, value, fresh, key: this.statusKey++, data: o.data });
      this.emit({ t: 'status', u: tgt.uid, id, op: 'add', turns, stacks: tgt.count(id) });
    } else {
      const existing = tgt.get(id);
      if (existing) {
        existing.turns = Math.max(existing.turns, turns);
        existing.value = Math.max(existing.value, value);
        existing.src = src ? src.uid : existing.src;
        existing.fresh = existing.fresh || fresh;
        if (o.data !== undefined) existing.data = o.data;
        this.emit({ t: 'status', u: tgt.uid, id, op: 'refresh', turns: existing.turns });
      } else {
        if (def.group) {
          // replace weaker in same group
          for (const s of tgt.statuses.slice()) {
            const d2 = STATUSES[s.id];
            if (d2.group === def.group && s.id !== id) {
              const v1 = Object.values(def.mods || {})[0] ?? 0;
              const v2 = Object.values(d2.mods || {})[0] ?? 0;
              if (Math.abs(v1) >= Math.abs(v2)) this.removeInst(tgt, s, 'replace', true);
            }
          }
        }
        tgt.statuses.push({ id, turns, src: src ? src.uid : -1, value, fresh, key: this.statusKey++, data: o.data });
        this.emit({ t: 'status', u: tgt.uid, id, op: 'add', turns });
      }
    }
    if (id === 'hp' || def.mods?.hp) tgt.hp = Math.min(tgt.hp, this.maxHp(tgt));
    if (def.kind === 'debuff') {
      this.fire(tgt, 'onDebuffed', id, src);
      if (src && src.alive) this.fire(src, 'onDebuffLanded', tgt, id);
    }
    return true;
  }

  private pendingOrActing(u: Unit): boolean {
    return this.currentTurn === u.uid;
  }

  removeInst(u: Unit, s: StatusInst, reason: string, silent = false) {
    const i = u.statuses.indexOf(s);
    if (i < 0) return;
    u.statuses.splice(i, 1);
    if (!silent) this.emit({ t: 'status', u: u.uid, id: s.id, op: 'remove' });
    if (s.id === 'link' && reason !== 'death') {
      const linker = this.units.find((x) => x.uid === s.src);
      if (linker && linker.alive) this.fire(linker, 'onLinkBroken', u);
    }
    if (STATUSES[s.id]?.kind === 'debuff' && (reason === 'cleanse') && u.hasSet('reversal')) this.changeCr(u, 10);
    if (STATUSES[s.id]?.mods?.hp) u.hp = Math.min(u.hp, this.maxHp(u));
  }

  /** Remove up to n buffs (dispel) or debuffs (cleanse). Returns removed ids. */
  strip(u: Unit, kind: 'buff' | 'debuff', n: number, reason: 'dispel' | 'cleanse' | 'steal' = kind === 'buff' ? 'dispel' : 'cleanse'): StatusInst[] {
    const out: StatusInst[] = [];
    const list = u.statuses.filter((s) => STATUSES[s.id]?.kind === kind && !STATUSES[s.id].sticky).reverse();
    for (const s of list) {
      if (out.length >= n) break;
      this.removeInst(u, s, reason);
      out.push(s);
    }
    return out;
  }

  kill(u: Unit, killer?: Unit) {
    if (!u.alive) return;
    // resurrect buff
    const rez = u.get('resurrect');
    if (rez && !u.has('extinction')) {
      u.statuses = u.statuses.filter((s) => s !== rez);
      u.hp = 1;
      this.revive(u, rez.value || 0.3, undefined, true);
      return;
    }
    u.alive = false;
    u.hp = 0;
    u.cr = 0;
    const links = u.statuses.filter((s) => s.id === 'link');
    u.diedWith = u.statuses.map((s) => s.id);
    u.statuses = u.statuses.filter((s) => STATUSES[s.id]?.sticky);
    this.emit({ t: 'death', u: u.uid });
    for (const l of links) {
      const linker = this.units.find((x) => x.uid === l.src);
      if (linker && linker.alive) this.fire(linker, 'onLinkBroken', u);
    }
    if (this.field && this.field.caster === u.uid) this.endField(true);
    this.fire(u, 'onDeath', killer);
    for (const a of this.units) {
      if (!a.alive || a === u) continue;
      if (a.team === u.team) this.fire(a, 'onAllyDeath', u, killer);
      else this.fire(a, 'onEnemyDeath', u, killer);
    }
  }

  revive(u: Unit, hpPct: number, src?: Unit, inPlace = false): boolean {
    if (u.has('extinction')) {
      this.emit({ t: 'text', u: u.uid, s: 'Extinction', c: '#777' });
      return false;
    }
    if (!inPlace && u.alive) return false;
    u.alive = true;
    u.statuses = u.statuses.filter((s) => s.id !== 'extinction');
    u.hp = Math.max(1, Math.floor(this.maxHp(u) * hpPct));
    if (!inPlace) u.cr = 0;
    this.emit({ t: 'revive', u: u.uid, hp: u.hp });
    this.applyStatus(src, u, 'grudge', 2, { unres: true });
    if (this.field && FIELDS[this.field.id].healToDamage && u.team !== this.field.team) this.applyStatus(undefined, u, 'unhealable', 2, { unres: true });
    u.hp = Math.min(u.hp, this.maxHp(u));
    return true;
  }

  setField(caster: Unit, id: string, turns: number) {
    if (this.field) this.endField(true);
    this.field = { id, team: caster.team, caster: caster.uid, turns };
    this.emit({ t: 'field', id, team: caster.team, turns });
  }

  endField(shattered: boolean) {
    if (!this.field) return;
    const id = this.field.id;
    const team = this.field.team;
    this.field = null;
    this.emit({ t: 'field', id: null, team, turns: 0, shattered });
    for (const u of this.units) if (u.alive) this.fire(u, 'onFieldEnd', id, shattered);
  }

  setForm(u: Unit, form: string) {
    u.form = form;
    this.emit({ t: 'form', u: u.uid, form });
  }

  private checkEnd(): boolean {
    if (this.winner >= 0) return true;
    const a = this.living(0).length;
    const b = this.living(1).length;
    if (a === 0 && b === 0) {
      this.finish(1);
      return true;
    }
    if (a === 0) {
      this.finish(1);
      return true;
    }
    if (b === 0) {
      const waves = this.cfg.waves || [];
      if (this.waveIdx < waves.length) {
        const w = waves[this.waveIdx++];
        const before = this.units.length;
        this.addTeam(w, 1, this.waveIdx);
        const fresh = this.units.slice(before);
        for (const u of fresh) u.cr = this.rng.next() * 5;
        this.emit({ t: 'wave', n: this.waveIdx, units: fresh.map((u) => this.snap(u)) });
        for (const u of fresh) this.battleStartFor(u);
        return false;
      }
      this.finish(0);
      return true;
    }
    return false;
  }

  private finish(w: number) {
    this.winner = w;
    this.pending = null;
    this.emit({ t: 'end', winner: w });
  }

  /** Drain events produced since last call. */
  flush(): BEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
