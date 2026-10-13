// Scripting API used by hero skills and passives. Thin, expressive wrappers over Battle primitives.
import type { Battle, DmgOpts, HitInfo, Unit, ActionMode } from './battle';
import { enhanceTotals } from './battle';
import { STATUSES } from './statuses';
import type { SkillDef, SkillSlot, StatKey } from './types';

export class HookCtx {
  constructor(public b: Battle, public self: Unit) {}

  get rng() {
    return this.b.rng;
  }
  chance(p: number) {
    return this.b.rng.chance(p);
  }
  enemies(of: Unit = this.self) {
    return this.b.enemies(of);
  }
  allies(includeSelf = true, of: Unit = this.self) {
    return this.b.allies(of, includeSelf);
  }
  others() {
    return this.b.allies(this.self, false);
  }
  deadAllies() {
    return this.b.deadAllies(this.self);
  }
  stat(u: Unit, k: StatKey) {
    return this.b.stat(u, k);
  }
  atk(u: Unit = this.self) {
    return this.b.stat(u, 'atk');
  }
  maxHp(u: Unit = this.self) {
    return this.b.maxHp(u);
  }
  hpPct(u: Unit = this.self) {
    return this.b.hpPct(u);
  }
  has(u: Unit, id: string) {
    return u.has(id);
  }
  isVanguard(u: Unit = this.self) {
    return this.b.isVanguard(u);
  }
  hasAlly(heroId: string) {
    return this.allies(false).some((a) => a.heroId === heroId);
  }
  /** per-unit numeric memory (stacks, counters) */
  get(key: string, u: Unit = this.self) {
    return u.data[key] || 0;
  }
  set(key: string, v: number, u: Unit = this.self) {
    u.data[key] = v;
  }
  add(key: string, d: number, max = Infinity, u: Unit = this.self) {
    const v = Math.max(0, Math.min(max, (u.data[key] || 0) + d));
    u.data[key] = v;
    return v;
  }
  text(s: string, c?: string, u: Unit = this.self) {
    this.b.emit({ t: 'text', u: u.uid, s, c });
  }
  lowestHp(list: Unit[]) {
    return list.slice().sort((a, b) => this.b.hpPct(a) - this.b.hpPct(b))[0];
  }
  highest(list: Unit[], k: StatKey) {
    return list.slice().sort((a, b) => this.b.stat(b, k) - this.b.stat(a, k))[0];
  }
  random(list: Unit[], n = 1) {
    return this.b.rng.shuffle(list).slice(0, n);
  }

  hit(t: Unit, o: DmgOpts): HitInfo {
    return this.b.dealDamage(this.self, t, o);
  }
  trueDmg(t: Unit, amount: number, tag = 'true') {
    return this.b.dealDamage(this.self, t, { flat: amount, true: true, noTrigger: true, tag });
  }
  buff(t: Unit, id: string, turns: number, o: { value?: number; chance?: number } = {}) {
    return this.b.applyStatus(this.self, t, id, turns, o);
  }
  debuff(t: Unit, id: string, turns: number, chance = 1, o: { unres?: boolean; value?: number; data?: number } = {}) {
    return this.b.applyStatus(this.self, t, id, turns, { chance, ...o });
  }
  state(t: Unit, id: string, turns = 99, value = 0) {
    return this.b.applyStatus(this.self, t, id, turns, { value, unres: true });
  }
  heal(t: Unit, amount: number) {
    return this.b.heal(this.self, t, amount);
  }
  cr(t: Unit, delta: number) {
    this.b.changeCr(t, delta);
  }
  dispel(t: Unit, n = 1) {
    return this.b.strip(t, 'buff', n, 'dispel');
  }
  cleanse(t: Unit, n = 1) {
    return this.b.strip(t, 'debuff', n, 'cleanse');
  }
  barrier(t: Unit, amount: number, turns = 2) {
    return this.b.applyStatus(this.self, t, 'barrier', turns, { value: Math.floor(amount) });
  }
  revive(t: Unit, pct: number) {
    return this.b.revive(t, pct, this.self);
  }
  souls(n: number) {
    this.b.addSouls(this.self.team, n);
  }
  field(id: string, turns: number) {
    this.b.setField(this.self, id, turns);
  }
  fieldIs(id: string) {
    return this.b.field?.id === id;
  }
  form(f: string) {
    this.b.setForm(this.self, f);
  }
  reduceCd(u: Unit, n: number, slot?: SkillSlot) {
    for (const s of (slot ? [slot] : (['s1', 's2', 's3'] as SkillSlot[]))) {
      const sk = this.b.skillOf(u, s);
      if (sk?.lockedCd) continue;
      if (u.cd[s] > 0) {
        u.cd[s] = Math.max(0, u.cd[s] - n);
        this.b.emit({ t: 'cd', u: u.uid, slot: s, v: u.cd[s] });
      }
    }
  }
  increaseCd(u: Unit, n: number, slot: SkillSlot = 's3') {
    const sk = this.b.skillOf(u, slot);
    if (!sk || sk.lockedCd || sk.passive || !sk.cd) return;
    u.cd[slot] = Math.min(sk.cd, u.cd[slot] + n);
    this.b.emit({ t: 'cd', u: u.uid, slot, v: u.cd[slot] });
  }
  /** Queue a counterattack / follow-up by this unit */
  react(kind: ActionMode, target: Unit, slot: SkillSlot = 's1') {
    this.b.queueReaction(this.self, kind, target, slot);
  }
  /** Fate Thread: link units together */
  link(units: Unit[], turns: number, chance = 1) {
    const id = this.b.linkSeq++;
    let n = 0;
    for (const u of units) if (this.debuff(u, 'link', turns, chance, { data: id })) n++;
    return n;
  }
  /** Instantly deal the remaining damage of a DoT type and remove it */
  detonate(t: Unit, id: 'burn' | 'bleed' | 'poison', pct = 1) {
    const list = t.statuses.filter((s) => s.id === id);
    if (!list.length) return 0;
    let total = 0;
    for (const s of list) {
      const per = id === 'poison' ? this.b.maxHp(t) * 0.06 : s.value;
      total += per * Math.max(1, s.turns);
      this.b.removeInst(t, s, 'detonate', true);
    }
    this.b.emit({ t: 'status', u: t.uid, id, op: 'remove' });
    this.b.emit({ t: 'text', u: t.uid, s: 'Detonate', c: '#ff8040' });
    this.b.dealDamage(this.self, t, { flat: total * pct, true: true, noTrigger: true, tag: 'detonate' });
    return total * pct;
  }
  /** Steal up to n buffs from target */
  steal(t: Unit, n = 1) {
    const taken = this.b.strip(t, 'buff', n, 'steal');
    for (const s of taken) {
      if (s.id === 'barrier') continue;
      this.b.applyStatus(this.self, this.self, s.id, Math.max(1, s.turns), { value: s.value });
    }
    return taken.length;
  }
  /** Extend debuffs on a target by n turns */
  extendDebuffs(t: Unit, n = 1) {
    for (const s of t.statuses) if (STATUSES[s.id]?.kind === 'debuff' && s.turns < 99) s.turns += n;
    this.text('Extended', '#d08aff', t);
  }
  /** Extend buffs on a unit by n turns */
  extendBuffs(t: Unit, n = 1) {
    for (const s of t.statuses) if (STATUSES[s.id]?.kind === 'buff' && s.turns < 99) s.turns += n;
  }
  /** Spread debuffs from one unit to others */
  spread(from: Unit, to: Unit[], ids?: string[]) {
    for (const s of from.statuses.slice()) {
      const d = STATUSES[s.id];
      if (d?.kind !== 'debuff' || d.sticky) continue;
      if (ids && !ids.includes(s.id)) continue;
      for (const t of to) this.b.applyStatus(this.self, t, s.id, Math.max(1, s.turns), { unres: true, value: s.value });
    }
  }
  debuffCount(t: Unit) {
    return t.debuffs().length;
  }
  buffCount(t: Unit) {
    return t.buffs().length;
  }
  /** Show a persistent stack counter as a 'state' status on a unit (UI-visible). */
  showStacks(id: string, n: number, u: Unit = this.self) {
    const s = u.get(id);
    if (n <= 0) {
      if (s) this.b.removeInst(u, s, 'expire');
      return;
    }
    if (s) {
      s.value = n;
      this.b.emit({ t: 'status', u: u.uid, id, op: 'refresh', turns: s.turns, stacks: n });
    } else {
      u.statuses.push({ id, turns: 99, src: u.uid, value: n, fresh: false, key: this.b.statusKey++ });
      this.b.emit({ t: 'status', u: u.uid, id, op: 'add', turns: 99, stacks: n });
    }
  }
  /** Returns true once per turn for a given key (guards multi-hit triggers). */
  once(key: string) {
    const k = '_once_' + key;
    if (this.self.data[k] === this.b.turnNo) return false;
    this.self.data[k] = this.b.turnNo;
    return true;
  }
  imprison(t: Unit, turns: number, chance = 1) {
    return this.debuff(t, 'imprison', turns, chance);
  }
}

export class SkillCtx extends HookCtx {
  lv: { dmg: number; chance: number; heal: number; cd: number };
  constructor(
    b: Battle,
    self: Unit,
    public target: Unit | undefined,
    public sb: boolean,
    public slot: SkillSlot,
    public mode: ActionMode,
    public skill: SkillDef,
  ) {
    super(b, self);
    const idx = slot === 's1' ? 0 : slot === 's2' ? 1 : 2;
    this.lv = enhanceTotals(skill, self.skillLv[idx]);
  }
  get t(): Unit {
    return this.target!;
  }
  get isCounter() {
    return this.mode === 'counter';
  }
  get isMain() {
    return this.mode === 'main';
  }
  override hit(t: Unit, o: DmgOpts): HitInfo {
    return this.b.dealDamage(this.self, t, { ...o, enh: (o.enh || 0) + this.lv.dmg });
  }
  hitAll(o: DmgOpts): HitInfo[] {
    return this.enemies()
      .filter((e) => !e.has('imprison'))
      .map((e) => this.hit(e, { ...o, aoe: true }));
  }
  /** Hits the target and the unit standing behind it */
  pierce(t: Unit, o: DmgOpts, behindMult = 0.5): HitInfo[] {
    const out = [this.hit(t, o)];
    const bh = this.b.behind(t);
    if (bh) out.push(this.hit(bh, { ...o, mult: (o.mult ?? 1) * behindMult, aoe: true }));
    return out;
  }
  override debuff(t: Unit, id: string, turns: number, chance = 1, o: { unres?: boolean; value?: number; data?: number } = {}) {
    return this.b.applyStatus(this.self, t, id, turns, { chance: Math.min(1, chance + this.lv.chance), ...o });
  }
  debuffAll(id: string, turns: number, chance = 1, o: { unres?: boolean } = {}) {
    let n = 0;
    for (const e of this.enemies()) if (this.debuff(e, id, turns, chance, o)) n++;
    return n;
  }
  buffAll(id: string, turns: number, o: { value?: number } = {}) {
    for (const a of this.allies()) this.buff(a, id, turns, o);
  }
  override heal(t: Unit, amount: number) {
    return this.b.heal(this.self, t, amount * (1 + this.lv.heal));
  }
  healAll(amount: number) {
    for (const a of this.allies()) this.heal(a, amount);
  }
  extraTurn() {
    const ax = this.b.actx;
    if (ax) ax.extra = true;
  }
  /** Ally with highest attack performs a dual attack on target */
  dual(t: Unit = this.t) {
    const cands = this.others().filter((a) => !a.statuses.some((s) => STATUSES[s.id]?.skipTurn));
    if (!cands.length) return;
    const ally = this.highest(cands, 'atk');
    this.b.queueReaction(ally, 'dual', t, 's1');
  }
}
