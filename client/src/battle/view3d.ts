// 3D battle presentation: places heroes, directs the camera, and plays the engine's event log as animation + VFX.
import * as THREE from 'three';
import type { BEvent, UnitSnap } from '@shared/engine/battle';
import { getHero } from '@shared/engine/registry';
import { STATUSES } from '@shared/engine/statuses';
import { FIELDS } from '@shared/engine/fields';
import { ELEMENT_COLORS } from '@shared/data/index';
import { Stage } from '../g3d/stage';
import { Environment } from '../g3d/env';
import { Fx } from '../g3d/fx';
import { Hero3D } from '../g3d/hero3d';
import { ease, timeScale, tween, wait } from '../core/anim';
import { h, iconSvg } from '../core/dom';
import { sfx } from '../core/audio';
import { portraitImg } from '../g3d/portraits';

export interface UnitView {
  uid: number;
  team: number;
  heroId: string;
  hero: Hero3D;
  home: THREE.Vector3;
  hp: number;
  maxHp: number;
  alive: boolean;
  statuses: Map<string, { turns: number; stacks?: number }>;
  plate: HTMLElement;
  hpBar: HTMLElement;
  hpLag: HTMLElement;
  barrier: HTMLElement;
  icons: HTMLElement;
  ring: THREE.Mesh;
  boss: boolean;
}

const SLOTS = [new THREE.Vector3(-2.3, 0, 0.7), new THREE.Vector3(-3.5, 0, -1.4), new THREE.Vector3(-3.8, 0, 2.5), new THREE.Vector3(-5.1, 0, 0.3)];
const VFX_COLOR: [RegExp, string][] = [
  [/fire|ember|inferno|explosion|steam|spark/, '#ff7a2a'], [/ice|frost|blizzard|snow|aurora/, '#7ae0ff'], [/holy|sun|scales|star|notes|clock|noon/, '#ffe27a'],
  [/dark|blood|bloodmoon|void|midnight|mirror|eclipse/, '#c87aff'], [/poison|leaf|thorn|forest|earth|spear|arrow_leaf/, '#8aff6a'], [/water|moon|stillwater|rewind/, '#6ab8ff'],
  [/heal|barrier/, '#7affc8'], [/gear|sand/, '#e8c86a'], [/claw|slash|snip|threads/, '#ffffff'],
];

export class BattleView3D {
  stage: Stage;
  env: Environment;
  fx: Fx;
  units = new Map<number, UnitView>();
  overlay: HTMLElement;
  speed = 1;
  private camBase = { pos: new THREE.Vector3(0.4, 4.6, 12.5), look: new THREE.Vector3(0, 1.0, 0.3) };
  private camTarget = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private camLook = new THREE.Vector3();
  private shakeT = 0;
  private offTick: () => void;
  private raycaster = new THREE.Raycaster();
  onPick?: (uid: number) => void;
  onHover?: (uid: number | null, ev: PointerEvent) => void;
  pickable = new Set<number>();
  fieldColor: string | null = null;

  constructor(container: HTMLElement, theme: string) {
    this.stage = new Stage(container);
    this.env = new Environment(theme);
    this.stage.scene.add(this.env.group);
    this.stage.scene.fog = new THREE.Fog(new THREE.Color(this.env.theme.fog), 24, 70);
    this.fx = new Fx(this.stage.scene);
    this.overlay = h('div', { class: 'b3-overlay' });
    container.appendChild(this.overlay);
    this.camTarget.pos.copy(this.camBase.pos);
    this.camTarget.look.copy(this.camBase.look);
    this.stage.camera.position.copy(this.camBase.pos).add(new THREE.Vector3(0, 2, 6));
    this.camLook.copy(this.camBase.look);
    this.offTick = this.stage.tick((dt, t) => this.tick(dt, t));
    const el = this.stage.renderer.domElement;
    el.addEventListener('pointerdown', (e) => { const u = this.pick(e); if (u !== null && this.pickable.has(u)) this.onPick?.(u); });
    el.addEventListener('pointermove', (e) => this.onHover?.(this.pick(e), e));
  }

  private pick(e: PointerEvent): number | null {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    let best: number | null = null;
    let bestD = Infinity;
    for (const u of this.units.values()) {
      if (!u.alive) continue;
      const c = u.hero.root.position.clone().setY(u.hero.height * 0.55);
      const d = this.raycaster.ray.distanceToPoint(c);
      if (d < 0.75 * (u.boss ? 1.4 : 1) && d < bestD) { bestD = d; best = u.uid; }
    }
    return best;
  }

  private tick(dt: number, t: number) {
    const sdt = dt * timeScale;
    for (const u of this.units.values()) u.hero.update(sdt, t);
    this.env.update(dt, t);
    this.fx.update(sdt);
    // camera
    const cam = this.stage.camera;
    cam.position.lerp(this.camTarget.pos, 1 - Math.pow(0.02, dt));
    this.camLook.lerp(this.camTarget.look, 1 - Math.pow(0.02, dt));
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shakeT * 0.6, (Math.random() - 0.5) * this.shakeT * 0.6, 0));
    }
    cam.lookAt(this.camLook);
    // overlays
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    for (const u of this.units.values()) {
      const p = u.hero.root.position.clone().setY(u.hero.height * (u.boss ? 1.12 : 1.08) + 0.15).project(cam);
      u.plate.style.transform = `translate(${((p.x + 1) / 2) * r.width}px, ${((1 - p.y) / 2) * r.height}px) translate(-50%, -100%)`;
      u.plate.style.display = p.z < 1 && u.alive ? '' : 'none';
      (u.ring.material as THREE.MeshBasicMaterial).opacity = this.pickable.has(u.uid) ? 0.6 + Math.sin(t * 6) * 0.3 : u.ring.userData.active ? 0.9 : 0;
    }
  }

  projectToScreen(v: THREE.Vector3) {
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    const p = v.clone().project(this.stage.camera);
    return { x: ((p.x + 1) / 2) * r.width, y: ((1 - p.y) / 2) * r.height };
  }

  // ───────────────────────── setup ─────────────────────────
  async addUnits(snaps: UnitSnap[], entrance = true) {
    await Promise.all(snaps.map(async (s) => {
      const def = getHero(s.heroId);
      const hero = await Hero3D.create(def);
      const slot = SLOTS[s.slot % 4].clone();
      if (s.team === 1) slot.x *= -1;
      if (s.boss) { slot.set(s.team === 1 ? 3.4 : -3.4, 0, 0.6); }
      hero.root.position.copy(slot);
      hero.root.rotation.y = s.team === 0 ? Math.PI / 2 - 0.25 : -Math.PI / 2 + 0.25;
      if (s.boss) hero.root.scale.setScalar(1.35);
      this.stage.scene.add(hero.root);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 48), new THREE.MeshBasicMaterial({ color: s.team === 0 ? 0x6fb7ff : 0xff5a6a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      hero.root.add(ring);
      const hpBar = h('i', { class: 'hpfill' });
      const hpLag = h('i', { class: 'hplag' });
      const barrier = h('i', { class: 'hpbar-barrier' });
      const icons = h('div', { class: 'sticons' });
      const plate = h('div', { class: `uplate t${s.team} ${s.boss ? 'boss' : ''}` },
        h('div', { class: 'uname' }, h('span', { class: 'lvl' }, `Lv${s.level}`), def.name),
        h('div', { class: 'hpbar' }, hpLag, hpBar, barrier),
        icons,
      );
      const elIco = h('span', { class: 'uel', html: iconSvg(def.element === 'flame' ? 'flame' : def.element === 'frost' ? 'snowflake-1' : def.element === 'verdant' ? 'oak-leaf' : def.element === 'radiant' ? 'sun' : 'moon', ELEMENT_COLORS[def.element]) });
      plate.firstElementChild!.prepend(elIco);
      this.overlay.appendChild(plate);
      const uv: UnitView = { uid: s.uid, team: s.team, heroId: s.heroId, hero, home: slot.clone(), hp: s.hp, maxHp: s.maxHp, alive: true, statuses: new Map(), plate, hpBar, hpLag, barrier, icons, ring, boss: s.boss };
      this.units.set(s.uid, uv);
      this.updateHp(uv, s.hp);
      if (entrance) {
        const from = slot.clone().add(new THREE.Vector3(s.team === 0 ? -6 : 6, 0, 0));
        hero.root.position.copy(from);
        hero.play('run', 0.1, 1.3);
        void tween(hero.root.position, { x: slot.x }, 900, ease.outCubic).then(() => hero.play('idle', 0.3));
      }
    }));
    if (entrance) await wait(750);
  }

  // ───────────────────────── camera ─────────────────────────
  camDefault() { this.camTarget.pos.copy(this.camBase.pos); this.camTarget.look.copy(this.camBase.look); }
  camFocus(u: UnitView, close = false) {
    const p = u.hero.root.position;
    const dir = u.team === 0 ? 1 : -1;
    this.camTarget.pos.set(p.x * 0.55 + dir * (close ? 1.8 : 1.0), close ? 2.0 : 3.4, p.z + (close ? 4.2 : 8.2));
    this.camTarget.look.set(p.x * 0.6 + dir * 0.8, close ? 1.4 : 1.1, p.z * 0.6);
  }
  shake(k = 0.35) { this.shakeT = Math.max(this.shakeT, k); }

  // ───────────────────────── overlays ─────────────────────────
  updateHp(u: UnitView, hp: number) {
    u.hp = Math.max(0, hp);
    const pct = Math.max(0, Math.min(1, u.hp / u.maxHp));
    u.hpBar.style.width = `${pct * 100}%`;
    u.hpBar.style.background = pct > 0.5 ? '' : pct > 0.25 ? 'linear-gradient(90deg,#ffb84a,#ffd86a)' : 'linear-gradient(90deg,#ff4a5a,#ff8a6a)';
    setTimeout(() => { u.hpLag.style.width = `${pct * 100}%`; }, 350);
  }
  setBarrier(u: UnitView, value: number) {
    u.barrier.style.width = `${Math.min(1, value / u.maxHp) * 100}%`;
  }
  renderStatuses(u: UnitView) {
    u.icons.innerHTML = '';
    for (const [id, s] of u.statuses) {
      const d = STATUSES[id];
      if (!d || d.hidden) continue;
      const color = d.kind === 'buff' ? '#7ad8ff' : d.kind === 'debuff' ? '#ff6a7a' : '#ffd86a';
      const ic = h('span', { class: `sti ${d.kind}`, title: `${d.name}: ${d.desc}`, html: iconSvg(d.icon, color) });
      const n = s.stacks && s.stacks > 1 ? s.stacks : s.turns < 99 ? s.turns : undefined;
      if (n !== undefined) ic.appendChild(h('b', {}, String(n)));
      u.icons.appendChild(ic);
    }
  }
  floatText(u: UnitView, text: string, cls: string, extra?: Node) {
    const p = this.projectToScreen(u.hero.root.position.clone().setY(u.hero.height * 0.75));
    const el = h('div', { class: `ftext ${cls}`, style: `left:${p.x + (Math.random() - 0.5) * 50}px;top:${p.y}px` }, extra ?? null, text);
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  setActive(uid: number | null) {
    for (const u of this.units.values()) {
      u.ring.userData.active = u.uid === uid;
      (u.ring.material as THREE.MeshBasicMaterial).color.set(u.uid === uid ? 0xffe8a0 : u.team === 0 ? 0x6fb7ff : 0xff5a6a);
    }
  }

  // ───────────────────────── event playback ─────────────────────────
  async playEvents(evs: BEvent[], hooks: { onEvent?: (e: BEvent) => void } = {}) {
    let i = 0;
    while (i < evs.length) {
      const e = evs[i];
      if (e.t === 'skill') {
        let j = i + 1;
        while (j < evs.length && !['skill', 'turn', 'await', 'end', 'wave'].includes(evs[j].t)) j++;
        await this.playSkill(e, evs.slice(i + 1, j), hooks);
        i = j;
        continue;
      }
      await this.playOne(e, hooks);
      i++;
    }
  }

  private async playOne(e: BEvent, hooks: { onEvent?: (e: BEvent) => void }) {
    hooks.onEvent?.(e);
    switch (e.t) {
      case 'start': break;
      case 'turn': {
        this.setActive(e.u);
        break;
      }
      case 'dmg': return this.applyDmg(e);
      case 'heal': return this.applyHeal(e);
      case 'status': return this.applyStatus(e);
      case 'death': return this.applyDeath(e.u);
      case 'revive': return this.applyRevive(e.u, e.hp);
      case 'text': {
        const u = this.units.get(e.u);
        if (u) this.floatText(u, e.s, 'label', undefined);
        await wait(120);
        break;
      }
      case 'field': {
        if (e.id) {
          const f = FIELDS[e.id];
          this.fieldColor = f.color;
          this.env.setField(f.color);
          this.banner(f.name, f.color);
          this.fx.ring(new THREE.Vector3(0, 0, 0.4), f.color, 8, 1.2);
          sfx('ui_maximize');
          await wait(700);
        } else {
          this.fieldColor = null;
          this.env.setField(null);
          if (e.shattered) { this.fx.burst(new THREE.Vector3(0, 1, 0), { tex: 'spark_06', color: 0xffffff, count: 60, speed: 10, size: 0.3 }); sfx('glass'); }
        }
        break;
      }
      case 'wave': {
        await this.waveTransition(e.units, e.n);
        break;
      }
      case 'form': {
        const u = this.units.get(e.u);
        if (u) { this.fx.pillar(u.hero.root.position, ELEMENT_COLORS[getHero(u.heroId).element], 4, 1.1, 0.9); u.hero.flash(0xffffff); sfx('beam'); await wait(500); }
        break;
      }
      default: break;
    }
  }

  private async waveTransition(snaps: UnitSnap[], n: number) {
    for (const u of [...this.units.values()]) if (u.team === 1 && !u.alive) { u.hero.dispose(); u.plate.remove(); this.units.delete(u.uid); }
    this.banner(`Wave ${n + 1}`, '#e8c86a');
    await wait(500);
    await this.addUnits(snaps, true);
  }

  banner(text: string, color: string) {
    const b = h('div', { class: 'fbanner', style: `--c:${color}` }, text);
    this.overlay.appendChild(b);
    setTimeout(() => b.remove(), 1800);
  }

  private applyDmg(e: Extract<BEvent, { t: 'dmg' }>) {
    const u = this.units.get(e.u);
    if (!u) return;
    this.updateHp(u, e.hp);
    const st = u.statuses.get('barrier');
    if (e.absorbed && st) this.setBarrier(u, 0);
    if (e.dot) {
      const c = e.dot === 'burn' ? 'burn' : e.dot === 'poison' ? 'poison' : e.dot === 'bleed' ? 'bleed' : 'dot';
      this.floatText(u, e.v.toLocaleString(), `dmg ${c}`);
      const col = c === 'burn' ? 0xff7a2a : c === 'poison' ? 0x8aff4a : c === 'bleed' ? 0xff3a4a : 0xc87aff;
      this.fx.burst(u.hero.chestWorld(), { tex: c === 'burn' ? 'flame_03' : 'glow', color: col, count: 10, speed: 2, size: 0.4, up: 1 });
      return;
    }
    if (e.blocked) { this.floatText(u, e.blocked === 'invincible' ? 'INVINCIBLE' : e.blocked === 'nullified' ? 'NULLIFIED' : 'IMMUNE', 'label'); sfx('shield'); return; }
    const cls = e.hit === 'crit' ? 'dmg crit' : e.hit === 'crush' ? 'dmg crush' : e.hit === 'miss' ? 'dmg miss' : 'dmg';
    const label = e.hit === 'crit' ? h('small', {}, 'CRITICAL') : e.hit === 'crush' ? h('small', {}, 'CRUSHING') : e.hit === 'miss' ? h('small', {}, 'MISS') : undefined;
    this.floatText(u, e.v.toLocaleString(), cls, label);
    if (e.absorbed) this.floatText(u, `−${e.absorbed.toLocaleString()} barrier`, 'label');
    if (u.alive && e.v > 0) {
      u.hero.flash(e.hit === 'crit' ? 0xffd27a : 0xffffff);
      void u.hero.oneShot('hit', 0.5, 1.4);
      const back = u.team === 0 ? -0.25 : 0.25;
      void tween(u.hero.root.position, { x: u.home.x + back }, 80).then(() => tween(u.hero.root.position, { x: u.home.x }, 260, ease.outQuad));
    }
    sfx(e.hit === 'crit' ? 'metal' : e.hit === 'miss' ? 'soft' : Math.random() < 0.5 ? 'punch' : 'punch2', { vol: e.hit === 'crit' ? 1 : 0.7 });
    if (e.hit === 'crit') this.shake(0.3);
  }

  private applyHeal(e: Extract<BEvent, { t: 'heal' }>) {
    const u = this.units.get(e.u);
    if (!u) return;
    this.updateHp(u, e.hp);
    this.floatText(u, `+${e.v.toLocaleString()}`, 'heal');
    this.fx.sparkle(u.hero.root.position, 0x7affb0, 10);
  }

  private applyStatus(e: Extract<BEvent, { t: 'status' }>) {
    const u = this.units.get(e.u);
    if (!u) return;
    const d = STATUSES[e.id];
    if (e.op === 'add' || e.op === 'refresh') {
      u.statuses.set(e.id, { turns: e.turns ?? 1, stacks: e.stacks });
      if (e.op === 'add' && d && d.kind !== 'state') {
        this.floatText(u, d.name, d.kind === 'buff' ? 'buff' : 'debuff');
        const color = d.kind === 'buff' ? 0x7ad8ff : 0xff5a7a;
        this.fx.burst(u.hero.chestWorld(), { tex: d.kind === 'buff' ? 'star_04' : 'smoke_04', color, count: 8, speed: 1.5, size: d.kind === 'buff' ? 0.25 : 0.6, up: d.kind === 'buff' ? 1 : 0.2, additive: d.kind === 'buff' });
        if (e.id === 'barrier') this.setBarrier(u, 0.15 * u.maxHp);
      }
    } else if (e.op === 'remove') {
      u.statuses.delete(e.id);
      if (e.id === 'barrier') this.setBarrier(u, 0);
    } else if (e.op === 'resist') this.floatText(u, 'RESIST', 'resist');
    else if (e.op === 'immune') this.floatText(u, 'IMMUNE', 'resist');
    this.renderStatuses(u);
  }

  private async applyDeath(uid: number) {
    const u = this.units.get(uid);
    if (!u || !u.alive) return;
    u.alive = false;
    u.hero.play('death', 0.1);
    u.statuses.clear();
    this.renderStatuses(u);
    this.fx.burst(u.hero.chestWorld(), { tex: 'smoke_07', color: 0x8a8aa8, count: 16, speed: 1.5, size: 1.2, additive: false, up: 0.6 });
    sfx('crunch', { vol: 0.6 });
    await wait(500);
    void tween(u.hero.root.position, { y: -0.4 }, 1200);
  }

  private async applyRevive(uid: number, hp: number) {
    const u = this.units.get(uid);
    if (!u) return;
    u.alive = true;
    u.hero.root.position.y = 0;
    this.fx.pillar(u.hero.root.position, 0xfff2a0, 5, 1.2, 0.8);
    this.fx.sparkle(u.hero.root.position, 0xfff2a0, 30);
    u.hero.play('idle', 0.4);
    this.updateHp(u, hp);
    this.floatText(u, 'REVIVED', 'heal');
    sfx('bell');
    await wait(500);
  }

  // ───────────────────────── skills ─────────────────────────
  private async playSkill(e: Extract<BEvent, { t: 'skill' }>, results: BEvent[], hooks: { onEvent?: (e: BEvent) => void }) {
    hooks.onEvent?.(e);
    const actor = this.units.get(e.u);
    if (!actor) { for (const r of results) await this.playOne(r, hooks); return; }
    const def = getHero(actor.heroId);
    const color = (VFX_COLOR.find(([re]) => re.test(e.vfx || ''))?.[1]) || ELEMENT_COLORS[def.element];
    const targets = e.targets.map((t) => this.units.get(t)).filter(Boolean) as UnitView[];
    const enemies = targets.filter((t) => t.team !== actor.team);
    const allies = targets.filter((t) => t.team === actor.team);
    const primary = enemies[0] || allies[0];
    const isUlt = e.ult;
    const aoe = enemies.length > 1;

    if (isUlt) await this.ultCutIn(actor, e.name, color);
    else if (e.mode === 'main') this.skillName(actor, e.name, e.sb);
    if (e.sb) { this.fx.pillar(actor.hero.root.position, 0x6ab8ff, 4, 0.8, 0.7); sfx('beam', { vol: 0.6 }); }

    const kind = e.anim;
    const melee = enemies.length > 0 && (kind === 'melee' || kind === 'dash' || kind === 'spin' || (kind === 'ult' && actor.hero.melee && !aoe));
    const dmgEvents = results.filter((r) => r.t === 'dmg');
    const otherEvents = results.filter((r) => r.t !== 'dmg');
    const playResults = async () => {
      // stagger hits per target
      const byTarget = new Map<number, BEvent[]>();
      for (const r of dmgEvents) { const k = (r as any).u; if (!byTarget.has(k)) byTarget.set(k, []); byTarget.get(k)!.push(r); }
      let n = 0;
      for (const [uid, list] of byTarget) {
        const tu = this.units.get(uid);
        if (tu) this.impactVfx(e.vfx || '', tu, color, isUlt);
        for (const r of list) await this.playOne(r, hooks);
        if (++n < byTarget.size) await wait(70);
      }
      for (const r of otherEvents) await this.playOne(r, hooks);
    };

    if (melee && primary) {
      const tp = primary.hero.root.position;
      const dir = actor.team === 0 ? -1 : 1;
      const stand = new THREE.Vector3(tp.x + dir * 1.15, 0, tp.z);
      this.camFocus(primary, false);
      sfx('step');
      actor.hero.play('run', 0.1, 1.6);
      await tween(actor.hero.root.position, { x: stand.x, z: stand.z }, 300 / this.speed, ease.inOutQuad);
      sfx(Math.random() < 0.5 ? 'slash1' : 'slash2');
      const anim = actor.hero.melee ? 'attack' : 'attack2';
      const back = await actor.hero.oneShot(anim, 0.42, 1.25 * this.speed);
      if (isUlt) this.shake(0.5);
      await playResults();
      await back();
      actor.hero.play('run', 0.1, 1.6);
      actor.hero.root.rotation.y += Math.PI;
      await tween(actor.hero.root.position, { x: actor.home.x, z: actor.home.z }, 340 / this.speed, ease.inOutQuad);
      actor.hero.root.rotation.y -= Math.PI;
      actor.hero.play('idle', 0.2);
    } else if (enemies.length) {
      this.camFocus(actor, false);
      const anim = def.look.weapon === 'gun' ? 'shoot' : 'cast';
      sfx(kind === 'ranged' ? 'draw' : 'bolt');
      const back = await actor.hero.oneShot(anim, 0.45, 1.1 * this.speed);
      this.fx.flare(actor.hero.tipWorld(), { tex: 'flare_01', color, size: 1.2, life: 0.3 });
      if (aoe) {
        this.camDefault();
        await this.areaVfx(e.vfx || '', enemies, color, isUlt);
      } else if (primary) {
        const tex = /arrow|spear|shot/.test(e.vfx || '') || kind === 'ranged' ? 'trace_01' : /fire/.test(e.vfx || '') ? 'fire_01' : 'magic_02';
        await this.fx.projectile(actor.hero.tipWorld(), primary.hero.chestWorld(), { tex, color, size: isUlt ? 1.4 : 0.8, speed: 16 * this.speed, arc: kind === 'ranged' ? 0.3 : 0.9 });
      }
      await playResults();
      await back();
    } else {
      // buffs / heals / self
      this.camFocus(actor, false);
      const back = await actor.hero.oneShot('buff', 0.5, 1.1 * this.speed);
      sfx(/heal/.test(e.vfx || '') || kind === 'heal' ? 'ui_glass' : 'shield');
      const ts = allies.length ? allies : [actor];
      for (const t of ts) { this.fx.pillar(t.hero.root.position, color, 3.6, 0.9); this.fx.sparkle(t.hero.root.position, color, 16); }
      await playResults();
      await back();
    }
    this.camDefault();
    await wait(isUlt ? 260 : 120);
  }

  private skillName(u: UnitView, name: string, sb: boolean) {
    const p = this.projectToScreen(u.hero.root.position.clone().setY(u.hero.height + 0.7));
    const el = h('div', { class: `sname-pop ${sb ? 'sb' : ''} t${u.team}`, style: `left:${p.x}px;top:${p.y}px` }, sb ? 'SOUL BURN · ' : '', name);
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  private async ultCutIn(u: UnitView, name: string, color: string) {
    const def = getHero(u.heroId);
    sfx('ui_maximize');
    sfx('boom', { vol: 0.5, delay: 300 });
    this.camFocus(u, true);
    const cut = h('div', { class: `cutin t${u.team}`, style: `--c:${color}` },
      h('div', { class: 'cut-band' }),
      h('div', { class: 'cut-art' }, portraitImg(u.heroId, 'cut-img', true)),
      h('div', { class: 'cut-text' }, h('div', { class: 'cut-hero' }, def.name), h('div', { class: 'cut-skill' }, name)),
    );
    this.overlay.appendChild(cut);
    this.fx.pillar(u.hero.root.position, color, 6, 1.4, 1.0);
    this.fx.burst(u.hero.chestWorld(), { tex: 'spark_06', color, count: 40, speed: 6, size: 0.3, life: 1 });
    await wait(1100 / this.speed);
    cut.classList.add('out');
    setTimeout(() => cut.remove(), 400);
  }

  private impactVfx(vfx: string, t: UnitView, color: string, big: boolean) {
    const at = t.hero.chestWorld();
    if (/slash|claw|snip|threads|mirror/.test(vfx)) this.fx.slash(at, color, big ? 3.2 : 2.2, /claw/.test(vfx) ? 'scratch_01' : `slash_0${1 + Math.floor(Math.random() * 4)}`);
    else if (/smash|earth|hammer/.test(vfx)) { this.fx.ring(t.hero.root.position, color, 2.4); this.fx.burst(at, { tex: 'dirt_01', color: 0xc8a888, count: 12, speed: 4, size: 0.5, additive: false, gravity: 6 }); this.shake(0.25); }
    else this.fx.flare(at, { tex: 'flare_01', color, size: big ? 2.6 : 1.6, life: 0.35 });
    this.fx.burst(at, { tex: 'spark_01', color, count: big ? 22 : 12, speed: big ? 8 : 5, size: 0.22, life: 0.5 });
  }

  private async areaVfx(vfx: string, targets: UnitView[], color: string, big: boolean) {
    const pos = targets.map((t) => t.hero.root.position.clone());
    if (/rain|meteor|arrow|star_big|fire_rain/.test(vfx)) await this.fx.rain(pos, color, /arrow/.test(vfx) ? 'trace_01' : 'fire_01', big ? 4 : 2);
    else if (/blizzard|snow|sandstorm|poison_cloud|wave|thorns|gears/.test(vfx)) {
      for (const p of pos) { this.fx.ring(p, color, 2.6, 0.7); this.fx.burst(p.clone().setY(1), { tex: /poison/.test(vfx) ? 'smoke_04' : /ice|blizzard|snow/.test(vfx) ? 'star_06' : 'magic_03', color, count: 18, speed: 3, size: 0.6, life: 0.9, up: 0.6 }); }
      await wait(450);
    } else {
      const center = pos.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / pos.length);
      this.fx.flare(center.clone().setY(1.4), { tex: 'twirl_02', color, size: 7, grow: 0.6, life: 0.8 });
      this.fx.ring(center, color, 6, 0.8);
      if (big) this.shake(0.5);
      await wait(380);
    }
  }

  dispose() {
    this.offTick();
    for (const u of this.units.values()) u.hero.dispose();
    this.overlay.remove();
    this.stage.dispose();
  }
}
