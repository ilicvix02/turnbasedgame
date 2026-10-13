// Shared UI building blocks: router, top bar, hero cards, dialogue player, team picker.
import { getHero } from '@shared/engine/registry';
import { CLASS_NAMES, ELEMENT_COLORS, ELEMENT_NAMES, PLAYABLE, THRONE_NAMES } from '@shared/data/index';
import type { Line } from '@shared/data/campaign';
import type { HeroInstance } from '@shared/meta/progression';
import { HERO_TIER_LETTER } from '@shared/meta/tiers';
import { $ui, clear, fmt, h, icon, modal, toast } from './core/dom';
import { store } from './core/api';
import { sfx } from './core/audio';
import { portraitImg } from './g3d/portraits';

// ───────────────────────── router ─────────────────────────
type Screen = (arg?: any) => void | Promise<void>;
const screens: Record<string, Screen> = {};
let current = '';
let cleanup: (() => void) | null = null;
export function register(name: string, s: Screen) { screens[name] = s; }
export function onLeave(f: () => void) { cleanup = f; }
export async function go(name: string, arg?: any) {
  cleanup?.();
  cleanup = null;
  current = name;
  clear($ui());
  try { await screens[name](arg); } catch (e) { console.error(e); toast((e as Error).message, 'err'); }
}
export const currentScreen = () => current;

// ───────────────────────── chrome ─────────────────────────
export const ELEMENT_ICON: Record<string, string> = { flame: 'flame', frost: 'snowflake-1', verdant: 'oak-leaf', radiant: 'sun', umbral: 'moon' };
export const CLASS_ICON: Record<string, string> = { knight: 'checked-shield', warrior: 'sword-brandish', thief: 'dripping-blade', ranger: 'bow-arrow', mage: 'magic-swirl', soulweaver: 'heart-plus' };

export function currencies() {
  const box = h('div', { class: 'row wrap', style: 'gap:6px;justify-content:flex-end' });
  const render = () => {
    const p = store.profile;
    if (!p) return;
    box.innerHTML = '';
    box.append(
      h('span', { class: 'cur sta', title: 'Stamina' }, icon('lightning-arc'), `${p.stamina}`),
      h('span', { class: 'cur gold', title: 'Gold' }, icon('two-coins'), fmt(p.gold)),
      h('span', { class: 'cur crys', title: 'Aether Crystals (summons)' }, icon('crystal-cluster'), fmt(p.crystals)),
      h('span', { class: 'cur mola', title: 'Molagora (skill enhancement)' }, icon('sprout'), `${p.mola}`),
      h('span', { class: 'cur rune', title: 'Runes (promotion & awakening)' }, icon('rune-stone'), `${p.runes}`),
    );
  };
  render();
  const off = store.on(render);
  const obs = new MutationObserver(() => { if (!document.body.contains(box)) { off(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
  return box;
}

export function topbar(title: string, back: string | (() => void) = 'lobby') {
  return h('div', { class: 'topbar' },
    h('button', { class: 'iconbtn back', title: 'Back', onclick: () => { sfx('ui_back'); typeof back === 'string' ? void go(back) : back(); } }, icon('return-arrow')),
    h('div', { class: 'screen-title grow' }, title),
    currencies(),
  );
}

export function heroCard(inst: HeroInstance | { heroId: string; level?: number; stars?: number }, opts: { onclick?: () => void; selected?: boolean; disabled?: boolean; slot?: number; tag?: string } = {}) {
  const def = getHero(inst.heroId);
  const stars = (inst as HeroInstance).stars ?? def.rarity;
  const card = h('div', { class: `hcard r${def.rarity} ${opts.selected ? 'sel' : ''} ${opts.disabled ? 'dis' : ''}`, title: `${def.name} — ${def.title}`, onclick: () => { if (!opts.disabled && opts.onclick) { sfx('ui_click'); opts.onclick(); } } },
    portraitImg(def.id),
    h('div', { class: 'stars' }, '★'.repeat(stars)),
    h('div', { class: 'el', html: `<svg class="ico" viewBox="0 0 512 512" style="fill:${ELEMENT_COLORS[def.element]}"></svg>` }),
    h('div', { class: 'lv' }, h('span', { class: 'nm' }, def.name), (inst as HeroInstance).level ? h('span', {}, `Lv${(inst as HeroInstance).level}`) : null),
    opts.tag ? h('div', { class: 'tag' }, opts.tag) : null,
    (inst as HeroInstance).locked ? icon('padlock', '#e8c86a') : null,
    opts.slot !== undefined ? h('div', { class: 'slotnum' }, String(opts.slot)) : null,
  );
  const el = card.querySelector('.el')!;
  el.innerHTML = '';
  el.appendChild(icon(ELEMENT_ICON[def.element], ELEMENT_COLORS[def.element]));
  const lock = card.querySelector('.ico:not(.el .ico)');
  if ((inst as HeroInstance).locked && lock) lock.classList.add('lock');
  return card;
}

export function tierBadge(heroId: string) {
  const t = HERO_TIER_LETTER[heroId] || 'B';
  return h('span', { class: `tier ${t}` }, t);
}

export function heroMeta(heroId: string) {
  const d = getHero(heroId);
  return h('div', { class: 'row wrap', style: 'gap:6px' },
    h('span', { class: 'pill', style: `color:${ELEMENT_COLORS[d.element]}` }, icon(ELEMENT_ICON[d.element], ELEMENT_COLORS[d.element]), ELEMENT_NAMES[d.element]),
    h('span', { class: 'pill' }, icon(CLASS_ICON[d.cls]), CLASS_NAMES[d.cls]),
    h('span', { class: 'pill' }, THRONE_NAMES[d.throne]),
    h('span', { class: 'pill', style: 'text-transform:capitalize' }, d.role),
  );
}

// ───────────────────────── dialogue ─────────────────────────
export async function playDialogue(lines: Line[] | undefined) {
  if (!lines?.length) return;
  await new Promise<void>((resolve) => {
    let i = 0;
    let typing: number | null = null;
    const portrait = h('div', { class: 'who-portrait' });
    const name = h('div', { class: 'name' });
    const text = h('div', { class: 'text' });
    const box = h('div', { class: 'dialogue panel gilded' }, portrait, h('div', { class: 'grow' }, name, text), h('div', { class: 'next' }, '▼'));
    const skip = h('button', { class: 'btn ghost sm skipbtn', onclick: (e: Event) => { e.stopPropagation(); done(); } }, 'Skip ⏭');
    const wrap = h('div', {}, box, skip);
    document.getElementById('overlay')!.appendChild(wrap);
    const done = () => { if (typing) clearInterval(typing); wrap.remove(); window.removeEventListener('keydown', key); resolve(); };
    const show = () => {
      const l = lines[i];
      const narrator = l.who === 'narrator';
      box.classList.toggle('narrator', narrator);
      portrait.innerHTML = '';
      portrait.style.display = narrator ? 'none' : '';
      if (!narrator && l.who !== 'you') portrait.appendChild(portraitImg(l.who, ''));
      name.textContent = narrator ? '' : l.who === 'you' ? 'You' : getHero(l.who).name;
      text.textContent = '';
      let k = 0;
      if (typing) clearInterval(typing);
      typing = window.setInterval(() => {
        k += 2;
        text.textContent = l.text.slice(0, k);
        if (k >= l.text.length && typing) { clearInterval(typing); typing = null; }
      }, 16);
      sfx('ui_pluck', { vol: 0.4 });
    };
    const next = () => {
      if (typing) { clearInterval(typing); typing = null; text.textContent = lines[i].text; return; }
      i++;
      if (i >= lines.length) done();
      else show();
    };
    box.addEventListener('click', next);
    const key = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') next(); if (e.key === 'Escape') done(); };
    window.addEventListener('keydown', key);
    show();
  });
}

// ───────────────────────── team picker ─────────────────────────
export function pickTeam(opts: { title: string; max?: number; min?: number; initial?: string[]; confirm?: string; enemy?: string[] }): Promise<string[] | null> {
  const max = opts.max ?? 4;
  const min = opts.min ?? 1;
  return new Promise((resolve) => {
    const p = store.profile!;
    let team = (opts.initial || []).filter((u) => p.heroes.some((x) => x.uid === u)).slice(0, max);
    const bar = h('div', { class: 'teambar' });
    const syn = h('div', { class: 'synergy' });
    const grid = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(88px,1fr))' });
    let sort: 'level' | 'rarity' | 'tier' = 'level';
    const render = () => {
      bar.innerHTML = '';
      for (let i = 0; i < max; i++) {
        const uid = team[i];
        const inst = uid ? p.heroes.find((x) => x.uid === uid) : undefined;
        bar.appendChild(inst ? heroCard(inst, { onclick: () => { team = team.filter((x) => x !== uid); render(); }, slot: i + 1 }) : h('div', { class: 'empty-slot' }, i === 0 ? 'Vanguard' : `Slot ${i + 1}`));
      }
      // synergy summary
      const defs = team.map((u) => getHero(p.heroes.find((x) => x.uid === u)!.heroId));
      const thrones: Record<string, number> = {};
      for (const d of defs) thrones[d.throne] = (thrones[d.throne] || 0) + 1;
      const res = Object.entries(thrones).filter(([, n]) => n >= 2).map(([t, n]) => `${THRONE_NAMES[t]} ×${n}`);
      const arch: Record<string, number> = {};
      for (const d of defs) for (const a of d.archetypes) arch[a] = (arch[a] || 0) + 1;
      const best = Object.entries(arch).sort((a, b) => b[1] - a[1])[0];
      syn.innerHTML = '';
      syn.append(
        res.length ? h('div', {}, h('b', {}, 'Resonance: '), res.join(', '), ' — consecutive same-Throne actions deal +10% damage and grant a soul.') : h('div', {}, 'Tip: field 2+ heroes of the same Throne to trigger Resonance.'),
      );
      if (best && best[1] >= 2) syn.append(h('div', {}, h('b', {}, 'Archetype: '), `${best[0]} (${best[1]})`));
      grid.innerHTML = '';
      const usedHeroIds = new Set(team.map((u) => p.heroes.find((x) => x.uid === u)!.heroId));
      const list = p.heroes.slice().sort((a, b) => sort === 'level' ? b.level - a.level || b.stars - a.stars : sort === 'rarity' ? getHero(b.heroId).rarity - getHero(a.heroId).rarity || b.level - a.level : (HERO_ORDER[b.heroId] ?? 0) - (HERO_ORDER[a.heroId] ?? 0));
      for (const inst of list) {
        const sel = team.includes(inst.uid);
        const dupe = !sel && usedHeroIds.has(inst.heroId);
        grid.appendChild(heroCard(inst, { selected: sel, disabled: dupe, onclick: () => {
          if (sel) team = team.filter((x) => x !== inst.uid);
          else if (team.length < max) team.push(inst.uid);
          else { toast(`Team is full (${max}).`); return; }
          render();
        } }));
      }
    };
    const sortBtns = h('div', { class: 'tabs' }, (['level', 'rarity', 'tier'] as const).map((s) => h('div', { class: `tab ${sort === s ? 'on' : ''}`, onclick: (e: Event) => { sort = s; for (const t of (e.currentTarget as HTMLElement).parentElement!.children) t.classList.remove('on'); (e.currentTarget as HTMLElement).classList.add('on'); render(); } }, s[0].toUpperCase() + s.slice(1))));
    const enemyRow = opts.enemy?.length ? h('div', { class: 'col', style: 'gap:6px' }, h('div', { class: 'tiny dim' }, 'ENEMY'), h('div', { class: 'row wrap', style: 'gap:6px' }, opts.enemy.map((id) => h('div', { class: 'mini', title: getHero(id).name }, portraitImg(id, ''))))) : null;
    const m = modal(h('div', { class: 'col', style: 'gap:12px;min-height:0' },
      h('div', { class: 'row between' }, h('h2', { class: 'title' }, opts.title), sortBtns),
      enemyRow,
      bar, syn,
      h('div', { class: 'mbody scroll', style: 'max-height:42vh' }, grid),
      h('div', { class: 'row', style: 'justify-content:flex-end' },
        h('button', { class: 'btn ghost', onclick: () => { m.close(); } }, 'Cancel'),
        h('button', { class: 'btn big', onclick: () => { if (team.length < min) { toast(`Choose at least ${min}.`, 'err'); return; } done = true; m.close(); resolve(team); } }, opts.confirm || 'Start Battle'),
      ),
    ), { wide: true, onClose: () => { if (!done) resolve(null); } });
    let done = false;
    render();
  });
}

const HERO_ORDER: Record<string, number> = Object.fromEntries(PLAYABLE().map((h) => [h.id, h.rarity * 100]));
