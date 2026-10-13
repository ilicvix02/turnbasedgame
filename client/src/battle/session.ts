// Battle screen: HUD + turn controller. Drives a local deterministic Battle (campaign/arena/tutorial)
// or a lockstep copy of a server-authoritative World Arena battle.
import { Battle, type BEvent, type Unit } from '@shared/engine/battle';
import { chooseAction, type AiLevel } from '@shared/engine/ai';
import { getHero } from '@shared/engine/registry';
import { STATUSES } from '@shared/engine/statuses';
import { FIELDS } from '@shared/engine/fields';
import type { BattleConfig, Input, SkillSlot } from '@shared/engine/types';
import { CLASS_NAMES, ELEMENT_COLORS, ELEMENT_NAMES } from '@shared/data/index';
import { BattleView3D } from './view3d';
import { $ui, fmt, h, hideTip, icon, iconSvg, richText } from '../core/dom';
import { setTimeScale, wait } from '../core/anim';
import { music, sfx } from '../core/audio';
import { portraitImg } from '../g3d/portraits';

export interface BattleResult { win: boolean; draw?: boolean; rewards?: Record<string, unknown>; extra?: Node | null }

export interface SessionOpts {
  config: BattleConfig;
  ai: AiLevel;
  theme: string;
  title: string;
  music?: string;
  /** local mode: called once with the player's inputs; returns rewards to display */
  finish?: (inputs: Input[], winner: number) => Promise<BattleResult>;
  /** RTA lockstep mode */
  rta?: { you: 0 | 1; send: (m: unknown) => void; inputs: Input[]; subscribe: (fn: (m: any) => void) => () => void; deadline?: number };
  canSurrender?: boolean;
  onExit: () => void;
}

const SKILL_ICON: Record<string, string> = {
  melee: 'sword-brandish', dash: 'sprint', spin: 'sword-spin', ranged: 'bow-arrow', cast: 'magic-swirl', buff: 'upgrade', heal: 'heart-plus', ult: 'sun-radiations',
};
export function skillIcon(vfx: string | undefined, anim: string) {
  const v = vfx || '';
  if (/fire|ember|inferno|explosion/.test(v)) return 'fireball';
  if (/ice|frost|blizzard|snow/.test(v)) return 'ice-bolt';
  if (/holy|sun/.test(v)) return 'holy-symbol';
  if (/dark|void|eclipse|midnight/.test(v)) return 'vortex';
  if (/blood/.test(v)) return 'bleeding-wound';
  if (/poison/.test(v)) return 'poison-bottle';
  if (/heal/.test(v)) return 'heart-plus';
  if (/barrier|shield/.test(v)) return 'magic-shield';
  if (/arrow|shot|spear/.test(v)) return 'barbed-arrow';
  if (/clock|rewind|stillwater|sand|noon/.test(v)) return 'pocket-watch';
  if (/star|aurora|meteor/.test(v)) return 'star-swirl';
  if (/thorn|leaf|forest|earth/.test(v)) return 'thorny-vine';
  if (/claw/.test(v)) return 'claw-slashes';
  if (/threads|snip/.test(v)) return 'spider-web';
  if (/notes/.test(v)) return 'musical-notes';
  if (/mirror/.test(v)) return 'mirror-mirror';
  if (/scales/.test(v)) return 'crystal-ball';
  return SKILL_ICON[anim] || 'crossed-swords';
}

export async function runBattle(o: SessionOpts) {
  const root = h('div', { class: 'battle-root' });
  $ui().appendChild(root);
  void music(o.music || 'battle');
  const view = new BattleView3D(root, o.theme);
  const b = new Battle(o.config);
  const me: 0 | 1 = o.rta ? o.rta.you : 0;
  let auto = false;
  let speed = 1;
  let ended = false;
  let exiting = false;
  let pendingResolve: ((inp: Input) => void) | null = null;

  // ── HUD ──
  const tl = h('div', { class: 'timeline' }, h('div', { class: 'rail' }), h('div', { class: 'goal' }, 'ACT'));
  const autoBtn = h('button', { class: 'hud-btn', title: 'Auto battle (A)', onclick: () => setAuto(!auto) }, 'AUTO');
  const speedBtn = h('button', { class: 'hud-btn', title: 'Battle speed (S)', onclick: () => cycleSpeed() }, '1×');
  const menuBtn = h('button', { class: 'hud-btn', title: 'Menu', onclick: () => openMenu() }, icon('pause-button'));
  const fieldBanner = h('div', { class: 'field-banner hidden' });
  const soulsMine = h('div', { class: 'souls' }, h('div', { class: 'orb' }, '0'), h('div', {}, h('div', { class: 'tiny dim' }, 'SOULS'), h('div', { class: 'bar' }, h('i', { style: 'width:0%' }))));
  const soulsOpp = h('div', { class: 'souls enemy-souls' }, h('div', { class: 'orb' }, '0'), h('div', { class: 'tiny dim' }, 'ENEMY SOULS'));
  const actorInfo = h('div', { class: 'actor-info' });
  const skillBar = h('div', { class: 'skillbtns' });
  const tip = h('div', { class: 'skilltip panel hidden' });
  const hint = h('div', { class: 'target-hint hidden' });
  const timerEl = h('div', { class: 'timer hidden', style: 'position:absolute;top:80px;left:16px' });
  const hud = h('div', { class: 'hud' },
    h('div', { class: 'hud-top' }, tl, h('div', { class: 'hud-btns' }, autoBtn, speedBtn, menuBtn)),
    fieldBanner, hint, soulsOpp, timerEl,
    h('div', { class: 'hud-bottom' }, soulsMine, h('div', { class: 'actor-panel' }, actorInfo, h('div', { style: 'position:relative' }, tip, skillBar))),
  );
  root.appendChild(hud);

  const tlUnits = new Map<number, HTMLElement>();
  const updateTimeline = (crs?: { u: number; cr: number }[]) => {
    for (const u of b.units) {
      let el = tlUnits.get(u.uid);
      if (!el) {
        el = h('div', { class: `tl-unit t${u.team === me ? 0 : 1}` }, portraitImg(u.heroId, ''));
        tl.appendChild(el);
        tlUnits.set(u.uid, el);
      }
      const v = view.units.get(u.uid);
      const alive = v ? v.alive : u.alive;
      el.style.display = alive ? '' : 'none';
      const cr = crs?.find((x) => x.u === u.uid)?.cr ?? u.cr;
      el.style.left = `calc(30px + (100% - 90px) * ${Math.min(1, cr / 100)})`;
      el.classList.toggle('active', b.pending === u.uid || cr >= 100);
    }
  };
  const updateSouls = () => {
    const set = (el: HTMLElement, team: number) => {
      const v = b.souls[team];
      const cap = b.soulCap(team);
      const orb = el.querySelector('.orb') as HTMLElement;
      orb.textContent = String(v);
      orb.classList.toggle('oc', cap > 20);
      const bar = el.querySelector('.bar i') as HTMLElement | null;
      if (bar) bar.style.width = `${(v / cap) * 100}%`;
    };
    set(soulsMine, me);
    set(soulsOpp, 1 - me);
  };
  const updateField = () => {
    if (!b.field) { fieldBanner.classList.add('hidden'); return; }
    const f = FIELDS[b.field.id];
    fieldBanner.classList.remove('hidden');
    fieldBanner.style.color = f.color;
    fieldBanner.innerHTML = `${iconSvg(f.icon, f.color)} ${f.name} · ${b.field.turns}`;
    fieldBanner.title = f.desc;
  };

  // hover tooltips on 3D units
  view.onHover = (uid, ev) => {
    hideTip();
    if (uid === null) return;
    const u = b.units.find((x) => x.uid === uid);
    if (!u) return;
    const def = getHero(u.heroId);
    const sts = u.statuses.filter((s) => STATUSES[s.id] && !STATUSES[s.id].hidden);
    const el = h('div', { class: 'panel unit-tip', style: `left:${Math.min(innerWidth - 310, ev.clientX + 16)}px;top:${Math.min(innerHeight - 260, ev.clientY + 12)}px` },
      h('div', { class: 'row between' }, h('b', { class: 'gold' }, def.name), h('span', { class: 'tiny dim' }, `${ELEMENT_NAMES[def.element]} ${CLASS_NAMES[def.cls]}`)),
      h('div', { class: 'tiny dim', style: 'margin:4px 0' }, `HP ${fmt(u.hp)}/${fmt(b.maxHp(u))} · ATK ${fmt(b.stat(u, 'atk'))} · DEF ${fmt(b.stat(u, 'def'))} · SPD ${Math.round(b.stat(u, 'spd'))} · EFF ${Math.round(b.stat(u, 'eff') * 100)}% · RES ${Math.round(b.stat(u, 'res') * 100)}%`),
      sts.length ? sts.map((s) => h('div', { class: 'st' }, icon(STATUSES[s.id].icon, STATUSES[s.id].kind === 'buff' ? '#7ad8ff' : STATUSES[s.id].kind === 'debuff' ? '#ff6a7a' : '#ffd86a'), h('div', {}, h('b', {}, `${STATUSES[s.id].name}${s.turns < 99 ? ` (${s.turns})` : ''}${s.value && STATUSES[s.id].kind === 'state' ? ` ×${s.value}` : ''}`), h('div', { class: 'dim' }, STATUSES[s.id].desc)))) : h('div', { class: 'tiny mute' }, 'No effects'),
    );
    document.body.appendChild(el);
    const off = () => { el.remove(); view.stage.renderer.domElement.removeEventListener('pointerleave', off); };
    view.stage.renderer.domElement.addEventListener('pointerleave', off);
    setTimeout(() => el.remove(), 2500);
  };

  // ── controls ──
  function setAuto(on: boolean) {
    auto = on;
    autoBtn.classList.toggle('on', on);
    sfx('ui_toggle');
    if (o.rta) o.rta.send({ t: 'auto', on });
    if (on && pendingResolve && !o.rta) { const r = pendingResolve; pendingResolve = null; clearSkills(); r(chooseAction(b, 'normal')); }
  }
  function cycleSpeed() {
    speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
    speedBtn.textContent = `${speed}×`;
    setTimeScale(speed);
    view.speed = speed;
    sfx('ui_tick');
  }
  function openMenu() {
    const m = h('div', { class: 'modal-back' }, h('div', { class: 'modal panel gilded' },
      h('h2', { class: 'title' }, o.title),
      h('div', { class: 'col' },
        h('button', { class: 'btn', onclick: () => m.remove() }, 'Resume'),
        o.canSurrender !== false ? h('button', { class: 'btn red', onclick: () => { m.remove(); surrender(); } }, o.rta ? 'Surrender' : 'Retreat (counts as a loss)') : null,
      )));
    document.body.appendChild(m);
  }
  function surrender() {
    if (o.rta) { o.rta.send({ t: 'surrender' }); return; }
    ended = true;
    if (pendingResolve) { pendingResolve = null; }
    void finishLocal(1);
  }
  const keyH = (e: KeyboardEvent) => {
    if (e.key === 'a' || e.key === 'A') setAuto(!auto);
    if (e.key === 's' || e.key === 'S') cycleSpeed();
    if (['1', '2', '3'].includes(e.key)) selectSkill(('s' + e.key) as SkillSlot);
    if (e.key === 'Enter' || e.key === ' ') confirmDefault();
  };
  window.addEventListener('keydown', keyH);

  // ── skill selection ──
  let selected: SkillSlot = 's1';
  let sbOn = false;
  let actorU: Unit | null = null;
  function clearSkills() {
    skillBar.innerHTML = '';
    tip.classList.add('hidden');
    hint.classList.add('hidden');
    view.pickable.clear();
  }
  function renderSkills(u: Unit) {
    actorU = u;
    skillBar.innerHTML = '';
    const def = getHero(u.heroId);
    actorInfo.innerHTML = '';
    actorInfo.append(h('div', { class: 'an' }, def.name), h('div', { class: 'as', style: `color:${ELEMENT_COLORS[def.element]}` }, `${ELEMENT_NAMES[def.element]} ${CLASS_NAMES[def.cls]} · ${def.title}`));
    const opts = b.options(u);
    if (!opts.find((x) => x.slot === selected && x.ok)) selected = (opts.find((x) => x.ok)?.slot ?? 's1') as SkillSlot;
    for (const op of opts) {
      const sk = op.skill;
      const btn = h('button', { class: `skillbtn ${op.slot} ${op.ok ? '' : 'off'} ${selected === op.slot ? 'sel' : ''}`, title: sk.name, onclick: () => { if (!op.ok) { sfx('ui_error'); return; } if (selected === op.slot && !needsTarget(sk.target)) confirmDefault(); else selectSkill(op.slot); } },
        icon(skillIcon(sk.vfx, sk.anim)),
        u.cd[op.slot] > 0 ? h('div', { class: 'cdv' }, String(u.cd[op.slot])) : null,
        h('span', { class: 'key' }, op.slot.slice(1)),
      );
      if (sk.soulburn && b.souls[u.team] >= sk.soulburn.cost && op.ok && !u.has('fear')) {
        const t = h('span', { class: `sbtoggle ${sbOn && selected === op.slot ? 'on' : ''}`, title: `Soul Burn (${sk.soulburn.cost}): ${sk.soulburn.desc}`, onclick: (e: Event) => { e.stopPropagation(); selected = op.slot; sbOn = !sbOn; sfx('ui_toggle'); renderSkills(u); } }, `SB ${sk.soulburn.cost}`);
        btn.appendChild(t);
      }
      skillBar.appendChild(btn);
    }
    showTip(u);
    highlightTargets(u);
  }
  const needsTarget = (t: string) => t === 'enemy' || t === 'ally' || t === 'deadAlly';
  function showTip(u: Unit) {
    const sk = b.skillOf(u, selected)!;
    tip.innerHTML = '';
    tip.append(
      h('div', { class: 'row between' }, h('span', { class: 'stn' }, sk.name), h('span', { class: 'tiny dim' }, sk.cd ? `Cooldown ${sk.cd}` : 'No cooldown', ` · +${sk.souls} soul`)),
      h('div', { style: 'margin-top:6px' }, richText(sk.desc)),
    );
    if (sk.soulburn) tip.append(h('div', { class: 'ssb', style: 'margin-top:6px;color:#c9b2ff' }, h('b', {}, `Soul Burn (${sk.soulburn.cost}): `), sk.soulburn.desc));
    tip.classList.remove('hidden');
  }
  function selectSkill(slot: SkillSlot) {
    if (!actorU || !pendingResolve) return;
    const op = b.options(actorU).find((x) => x.slot === slot);
    if (!op || !op.ok) { sfx('ui_error'); return; }
    if (selected !== slot) sbOn = false;
    selected = slot;
    sfx('ui_select');
    renderSkills(actorU);
  }
  function highlightTargets(u: Unit) {
    const sk = b.skillOf(u, selected)!;
    view.pickable.clear();
    let label = '';
    if (sk.target === 'enemy') { for (const t of b.validTargets(u, selected)) view.pickable.add(t.uid); label = 'Select an enemy'; }
    else if (sk.target === 'ally' || sk.target === 'deadAlly') { for (const t of b.validTargets(u, selected)) view.pickable.add(t.uid); label = 'Select an ally'; }
    else if (sk.target === 'allEnemies') { for (const t of b.enemies(u)) view.pickable.add(t.uid); label = 'Tap any enemy (or the skill again) to cast'; }
    else { for (const t of b.allies(u)) view.pickable.add(t.uid); label = 'Tap any ally (or the skill again) to cast'; }
    hint.textContent = label;
    hint.classList.remove('hidden');
  }
  function confirmDefault() {
    if (!actorU || !pendingResolve) return;
    const sk = b.skillOf(actorU, selected)!;
    const valid = b.validTargets(actorU, selected);
    const t = needsTarget(sk.target) ? (sk.target === 'enemy' ? valid.slice().sort((a, c) => b.hpPct(a) - b.hpPct(c))[0] : valid[0]) : undefined;
    submit(t ? t.uid : -1);
  }
  view.onPick = (uid) => {
    if (!actorU || !pendingResolve) return;
    const sk = b.skillOf(actorU, selected)!;
    submit(needsTarget(sk.target) ? uid : -1);
  };
  function submit(target: number) {
    if (!actorU || !pendingResolve) return;
    const r = pendingResolve;
    pendingResolve = null;
    const inp: Input = { actor: actorU.uid, skill: selected, target, sb: sbOn };
    sbOn = false;
    sfx('ui_confirm');
    clearSkills();
    r(inp);
  }

  // ── event playback hooks ──
  const onEvent = (e: BEvent) => {
    if (e.t === 'crs') updateTimeline(e.v);
    else if (e.t === 'souls') updateSouls();
    else if (e.t === 'field') updateField();
    else if (e.t === 'turn') updateTimeline();
  };

  async function playNew() {
    const evs = b.flush();
    await view.playEvents(evs, { onEvent });
    updateSouls();
    updateField();
    updateTimeline();
  }

  // ── run ──
  b.start();
  const first = b.flush();
  const startEv = first.find((e) => e.t === 'start') as Extract<BEvent, { t: 'start' }> | undefined;
  if (startEv) await view.addUnits(startEv.units);
  updateTimeline();
  view.banner(o.title, '#e8c86a');
  await view.playEvents(first.filter((e) => e.t !== 'start'), { onEvent });
  updateSouls();

  // RTA: replay any inputs that happened before we (re)joined, then follow the server
  let rtaQueue: Input[] = [];
  let rtaWake: (() => void) | null = null;
  let rtaEnd: any = null;
  let unsub: (() => void) | null = null;
  let deadline = o.rta?.deadline ?? 0;
  if (o.rta) {
    for (const inp of o.rta.inputs) { b.act(inp); b.flush(); }
    unsub = o.rta.subscribe((m) => {
      if (m.t === 'input') { rtaQueue.push(m.input); rtaWake?.(); }
      if (m.t === 'turn') deadline = m.deadline;
      if (m.t === 'end') { rtaEnd = m; rtaWake?.(); }
      if (m.t === 'auto') { auto = !!m.on; autoBtn.classList.toggle('on', auto); }
      if (m.t === 'emote') view.banner(`Opponent: ${m.id}`, '#ff8a9a');
    });
    const tick = setInterval(() => {
      if (!deadline || ended) { timerEl.classList.add('hidden'); return; }
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      timerEl.textContent = `${s}s`;
      timerEl.classList.toggle('hidden', !(b.pending !== null && b.unit(b.pending).team === me));
    }, 250);
    root.addEventListener('remove', () => clearInterval(tick));
  }

  while (b.winner < 0 && !ended) {
    const actor = b.unit(b.pending!);
    view.setActive(actor.uid);
    updateTimeline();
    let inp: Input;
    if (o.rta) {
      if (actor.team === me && !auto && rtaQueue.length === 0) {
        renderSkills(actor);
        const choice = await new Promise<Input | null>((resolve) => { pendingResolve = resolve; rtaWake = () => { if (rtaQueue.length || rtaEnd) { pendingResolve = null; clearSkills(); resolve(null); } }; });
        if (choice) o.rta.send({ t: 'input', input: choice });
      }
      while (rtaQueue.length === 0 && !rtaEnd) await new Promise<void>((r) => { rtaWake = r; });
      if (rtaQueue.length === 0) break;
      inp = rtaQueue.shift()!;
      clearSkills();
    } else if (actor.team === me && !auto) {
      renderSkills(actor);
      const got = await new Promise<Input | null>((resolve) => { pendingResolve = resolve as (i: Input) => void; });
      if (!got || ended) break;
      inp = got;
    } else {
      await wait(actor.team === me ? 150 : 350);
      inp = chooseAction(b, actor.team === me ? 'normal' : o.ai);
    }
    try {
      b.act(inp);
    } catch (err) {
      console.error(err);
      if (o.rta) break;
      continue;
    }
    await playNew();
    if (o.rta) o.rta.send({ t: 'ready', n: b.inputs.length });
  }

  window.removeEventListener('keydown', keyH);
  if (o.rta) {
    while (!rtaEnd) await new Promise<void>((r) => { rtaWake = r; });
    unsub?.();
    const win = rtaEnd.winner === me;
    await showResult({ win, draw: rtaEnd.winner === 2, rewards: rtaEnd.rewards || undefined, extra: h('div', { class: 'dim' }, rtaEnd.reason || '', rtaEnd.delta ? h('div', { class: win ? 'gold big' : 'big', style: 'margin-top:8px' }, `${rtaEnd.delta > 0 ? '+' : ''}${rtaEnd.delta} MMR`) : null) });
  } else if (!ended) {
    await finishLocal(b.winner);
  }

  async function finishLocal(winner: number) {
    ended = true;
    let res: BattleResult = { win: winner === 0, draw: winner === 2 };
    try {
      if (o.finish) res = await o.finish(b.inputs.filter((x) => b.unit(x.actor).team === 0), winner);
    } catch (e) {
      res.extra = h('div', { class: 'dim' }, (e as Error).message);
    }
    await showResult(res);
  }

  async function showResult(res: BattleResult) {
    if (exiting) return;
    exiting = true;
    setTimeScale(1);
    clearSkills();
    sfx(res.win ? 'j_victory' : 'j_defeat');
    for (const u of view.units.values()) if (u.alive && u.team === me && res.win) u.hero.play('victory');
    view.camDefault();
    await wait(600);
    const rw = res.rewards || {};
    const chips: Node[] = [];
    const chip = (ic: string, color: string, label: string) => h('span', { class: 'cur', style: `font-size:15px` }, icon(ic, color), label);
    if (rw.gold) chips.push(chip('two-coins', '#ffd84a', `${fmt(rw.gold as number)}`));
    if (rw.crystals) chips.push(chip('crystal-cluster', '#8ad8ff', `${rw.crystals}`));
    if (rw.xp) chips.push(chip('upgrade', '#8aff9a', `${rw.xp} XP`));
    if (rw.mola) chips.push(chip('sprout', '#ff9ad8', `${rw.mola} Molagora`));
    if (rw.runes) chips.push(chip('rune-stone', '#c49aff', `${rw.runes} Runes`));
    const gear = (rw.gear as any[]) || [];
    for (const g of gear) chips.push(chip('battle-gear', ['#b8b8b8', '#7ae37a', '#6fb7ff', '#c48cff', '#ff6a5a'][g.rarity - 1], `${['', 'Normal', 'Good', 'Rare', 'Heroic', 'Epic'][g.rarity]} ${g.slot}`));
    const gift = rw.gift as { heroId: string } | undefined;
    const stars = rw.stars as number | undefined;
    await new Promise<void>((resolve) => {
      const box = h('div', { class: 'result' }, h('div', { class: 'result-box panel gilded' },
        h('h1', { class: res.win ? 'win' : 'lose' }, res.draw ? 'DRAW' : res.win ? 'VICTORY' : 'DEFEAT'),
        stars ? h('div', { class: 'stars3', style: 'font-size:30px;color:var(--r5)' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null,
        chips.length ? h('div', { class: 'rewards' }, chips) : null,
        gift ? h('div', { class: 'col center', style: 'margin:10px 0' }, h('div', { class: 'gold title' }, 'New hero joins you!'), h('div', { style: 'width:120px' }, h('div', { class: `hcard r${getHero(gift.heroId).rarity}` }, portraitImg(gift.heroId)))) : null,
        rw.artifact ? h('div', { class: 'gold' }, `Artifact obtained: ${rw.artifact}`) : null,
        res.extra ?? null,
        h('div', { class: 'row center', style: 'margin-top:16px' }, h('button', { class: 'btn big', onclick: () => resolve() }, 'Continue')),
      ));
      root.appendChild(box);
    });
    view.dispose();
    root.remove();
    setTimeScale(1);
    o.onExit();
  }
}
