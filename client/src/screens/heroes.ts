// Heroes: roster grid + detail (3D turntable, skills, stats, gear, upgrades, artifacts, imprint, lore).
import { getHero } from '@shared/engine/registry';
import { CLASS_NAMES, ELEMENT_COLORS, ELEMENT_NAMES, THRONE_NAMES } from '@shared/data/index';
import { ARTIFACTS } from '@shared/engine/artifacts';
import { GEAR_SETS } from '@shared/engine/sets';
import type { GearPiece, SkillSlot } from '@shared/engine/types';
import { HERO_TIER, HERO_TIER_LETTER } from '@shared/meta/tiers';
import {
  awakenCost, computeStats, fmtGearStat, GEAR_SLOTS, GEAR_STAT_NAMES, gearEnhanceCost, gearScore, IMPRINT_GRADES, levelCap, promoteCost, RARITY_NAMES, releaseBonusFor, skillEnhanceCost, xpToNext,
} from '@shared/meta/progression';
import { $ui, confirmDialog, fmt, h, icon, modal, richText, toast } from '../core/dom';
import { api, store } from '../core/api';
import { music, sfx } from '../core/audio';
import { CLASS_ICON, ELEMENT_ICON, go, heroCard, heroMeta, onLeave, register, tierBadge, topbar } from '../ui';
import { rotateShowcase, setSpin, showHeroes, showcaseHero } from '../menu3d';
import { skillIcon } from '../battle/session';

const SLOT_ICON: Record<string, string> = { weapon: 'sword-brandish', helmet: 'visored-helm', armor: 'breastplate', necklace: 'emerald-necklace', ring: 'power-ring', boots: 'boots' };
let filter = { el: '', cls: '', sort: 'rarity' as 'rarity' | 'level' | 'tier' | 'name' };

register('heroes', async () => {
  void music('lobby');
  const p = store.profile!;
  void showHeroes([p.heroes[0]?.heroId || 'seraphine'], 'lobby');
  const grid = h('div', { class: 'grid' });
  const render = () => {
    grid.innerHTML = '';
    let list = store.profile!.heroes.slice();
    if (filter.el) list = list.filter((x) => getHero(x.heroId).element === filter.el);
    if (filter.cls) list = list.filter((x) => getHero(x.heroId).cls === filter.cls);
    list.sort((a, b) => {
      const A = getHero(a.heroId), B = getHero(b.heroId);
      if (filter.sort === 'level') return b.level - a.level || B.rarity - A.rarity;
      if (filter.sort === 'tier') return (HERO_TIER[b.heroId] ?? 0) - (HERO_TIER[a.heroId] ?? 0);
      if (filter.sort === 'name') return A.name.localeCompare(B.name);
      return B.rarity - A.rarity || b.stars - a.stars || b.level - a.level;
    });
    for (const inst of list) grid.appendChild(heroCard(inst, { onclick: () => void go('hero', inst.uid), tag: HERO_TIER_LETTER[inst.heroId] }));
  };
  const chip = (label: string, on: boolean, f: () => void, ic?: string, color?: string) => h('div', { class: `tab ${on ? 'on' : ''}`, onclick: () => { f(); void go('heroes'); } }, ic ? icon(ic, color) : null, label);
  $ui().appendChild(h('div', { class: 'screen page' },
    topbar(`Heroes · ${p.heroes.length}`),
    h('div', { class: 'page-body' },
      h('div', { class: 'mainpane', style: 'margin-left:auto;max-width:860px' },
        h('div', { class: 'panel', style: 'padding:12px;display:flex;flex-direction:column;gap:10px;min-height:0;flex:1' },
          h('div', { class: 'row wrap' },
            h('div', { class: 'tabs' }, chip('All', !filter.el, () => (filter.el = '')), ...(['flame', 'frost', 'verdant', 'radiant', 'umbral'] as const).map((e) => chip('', filter.el === e, () => (filter.el = filter.el === e ? '' : e), ELEMENT_ICON[e], ELEMENT_COLORS[e]))),
            h('div', { class: 'tabs' }, ...(['knight', 'warrior', 'thief', 'ranger', 'mage', 'soulweaver'] as const).map((c) => chip('', filter.cls === c, () => (filter.cls = filter.cls === c ? '' : c), CLASS_ICON[c]))),
            h('div', { class: 'tabs' }, ...(['rarity', 'level', 'tier', 'name'] as const).map((s) => chip(s[0].toUpperCase() + s.slice(1), filter.sort === s, () => (filter.sort = s)))),
          ),
          h('div', { class: 'scroll grow' }, grid),
        ),
      ),
    ),
  ));
  render();
});

register('hero', async (uid: string) => {
  const p = store.profile!;
  const inst = p.heroes.find((x) => x.uid === uid);
  if (!inst) return go('heroes');
  const def = getHero(inst.heroId);
  void music('lobby');
  await showHeroes([def.id], 'detail');
  let tab = 'skills';
  const body = h('div', { class: 'scroll grow', style: 'padding-right:4px' });
  const tabs = h('div', { class: 'tabs' });
  const header = h('div', { class: 'hd-header' });

  const renderHeader = () => {
    const i = store.profile!.heroes.find((x) => x.uid === uid)!;
    header.innerHTML = '';
    header.append(
      h('div', { class: 'row between' },
        h('div', {}, h('div', { class: 'hd-title' }, def.title), h('div', { class: 'hd-name' }, def.name)),
        h('div', { class: 'col', style: 'align-items:flex-end;gap:4px' }, h('div', { style: 'color:var(--r5);font-size:18px' }, '★'.repeat(i.stars)), h('div', { class: 'row', style: 'gap:6px' }, tierBadge(def.id), h('span', { class: 'pill' }, `Lv ${i.level}/${levelCap(i.stars)}`))),
      ),
      h('div', { style: 'margin-top:8px' }, heroMeta(def.id)),
      h('div', { class: 'dim small', style: 'margin-top:8px;font-style:italic;font-family:var(--serif)' }, def.tagline),
    );
  };
  const renderTabs = () => {
    tabs.innerHTML = '';
    for (const [k, label] of [['skills', 'Skills'], ['stats', 'Stats'], ['gear', 'Gear'], ['upgrade', 'Upgrade'], ['lore', 'Lore']]) tabs.appendChild(h('div', { class: `tab ${tab === k ? 'on' : ''}`, onclick: () => { tab = k; sfx('ui_tick'); renderTabs(); renderBody(); } }, label));
  };
  const refresh = () => { renderHeader(); renderBody(); };

  const renderBody = () => {
    const i = store.profile!.heroes.find((x) => x.uid === uid);
    if (!i) return void go('heroes');
    body.innerHTML = '';
    if (tab === 'skills') {
      for (const slot of ['s1', 's2', 's3'] as SkillSlot[]) {
        const list = def.skills.filter((s) => s.slot === slot);
        for (const sk of list) {
          const lv = i.skillLv[slot === 's1' ? 0 : slot === 's2' ? 1 : 2];
          body.appendChild(h('div', { class: 'skill', style: 'margin-bottom:8px' },
            h('div', { class: 'sicon', style: `color:${ELEMENT_COLORS[def.element]}` }, icon(sk.passive ? 'aura' : skillIcon(sk.vfx, sk.anim), ELEMENT_COLORS[def.element])),
            h('div', { class: 'grow' },
              h('div', { class: 'sname' }, sk.name, sk.form ? h('span', { class: 'pill', style: 'margin-left:6px' }, sk.form === 'base' ? 'Base form' : `${sk.form[0].toUpperCase()}${sk.form.slice(1)} form`) : null),
              h('div', { class: 'smeta' }, h('span', {}, slot.toUpperCase()), sk.passive ? h('span', {}, 'Passive') : h('span', {}, sk.cd ? `Cooldown ${sk.cd}` : 'No cooldown'), !sk.passive ? h('span', {}, `+${sk.souls} soul`) : null, sk.enhance?.length ? h('span', {}, `Enhance +${lv}/${sk.enhance.length}`) : null),
              h('div', { class: 'sdesc' }, richText(sk.desc)),
              sk.soulburn ? h('div', { class: 'ssb' }, h('b', {}, `Soul Burn (${sk.soulburn.cost}): `), sk.soulburn.desc) : null,
              sk.enhance?.length ? h('div', { class: 'tiny mute', style: 'margin-top:4px' }, sk.enhance.map((e, k) => `${k < lv ? '✓' : '·'} ${Object.entries(e).map(([a, b]) => a === 'cd' ? `cooldown −${b}` : `${a} +${Math.round((b as number) * 100)}%`).join(', ')}`).join('   ')) : null,
            ),
          ));
        }
      }
      body.appendChild(h('div', { class: 'small dim', style: 'margin-top:6px' }, h('b', { class: 'gold' }, 'Archetypes: '), def.archetypes.join(', ') || '—'));
    } else if (tab === 'stats') {
      const gearById = Object.fromEntries(store.profile!.gear.map((g) => [g.id, g]));
      const gear = Object.values(i.gear).map((id) => gearById[id!]).filter(Boolean) as GearPiece[];
      const art = i.artifactUid ? store.profile!.artifacts.find((a) => a.uid === i.artifactUid) : undefined;
      const { stats, sets } = computeStats({ ...i, artifact: art ? { id: art.id, level: art.level } : null }, gear, releaseBonusFor([i]));
      const row = (k: string, v: string) => h('div', { class: 's' }, h('span', { class: 'dim' }, k), h('span', {}, v));
      body.append(
        h('div', { class: 'statgrid' },
          row('Attack', fmt(stats.atk)), row('Health', fmt(stats.hp)), row('Defense', fmt(stats.def)), row('Speed', String(stats.spd)),
          row('Crit Chance', `${Math.round(stats.cc * 100)}%`), row('Crit Damage', `${Math.round(stats.cd * 100)}%`), row('Effectiveness', `${Math.round(stats.eff * 100)}%`), row('Effect Resistance', `${Math.round(stats.res * 100)}%`), row('Dual Attack', `${Math.round(stats.dual * 100)}%`),
        ),
        h('div', { class: 'sep' }),
        h('div', { class: 'small' }, h('b', { class: 'gold' }, 'Active sets: '), sets.length ? sets.map((s) => GEAR_SETS[s].name).join(', ') : 'none'),
        h('div', { class: 'small', style: 'margin-top:6px' }, h('b', { class: 'gold' }, `Imprint (${def.imprint.kind === 'release' ? 'Release · whole team' : 'Concentration · self'}): `), `${IMPRINT_GRADES[i.imprint]} — ${def.imprint.stat.toUpperCase()} +${Math.round((def.imprint.values[i.imprint] ?? 0) * 1000) / 10}%`),
        h('div', { class: 'small', style: 'margin-top:6px' }, h('b', { class: 'gold' }, 'Awakening: '), `${i.awaken}/6`),
      );
    } else if (tab === 'gear') {
      renderGear(i);
    } else if (tab === 'upgrade') {
      renderUpgrade(i);
    } else {
      body.append(h('div', { class: 'col' },
        h('div', { style: 'font-family:var(--serif);font-size:18px;color:var(--gold2)' }, `“${def.quote}”`),
        h('div', { style: 'line-height:1.6' }, def.lore),
        h('div', { class: 'tiny dim' }, `${THRONE_NAMES[def.throne]} · ${ELEMENT_NAMES[def.element]} ${CLASS_NAMES[def.cls]} · ${def.rarity}★`),
      ));
    }
  };

  const renderGear = (i: typeof inst) => {
    const prof = store.profile!;
    const slots = h('div', { class: 'gearslots' });
    for (const slot of GEAR_SLOTS) {
      const g = prof.gear.find((x) => x.id === i.gear[slot]);
      slots.appendChild(h('div', { class: `gslot ${g ? 'filled gear-r' + g.rarity : ''}`, title: slot, onclick: () => openGearPicker(i.uid, slot) },
        h('span', { class: 'gs' }, slot), icon(g ? SLOT_ICON[slot] : SLOT_ICON[slot], g ? GEAR_SETS[g.set]?.color : undefined),
        g ? h('span', { class: 'gl' }, `+${g.enhance}`) : null,
      ));
    }
    const art = i.artifactUid ? prof.artifacts.find((a) => a.uid === i.artifactUid) : undefined;
    const artDef = art ? ARTIFACTS[art.id] : undefined;
    body.append(slots,
      h('div', { class: 'sep' }),
      h('div', { class: 'gearitem', onclick: () => openArtifactPicker(i.uid) },
        h('div', { class: 'gi' }, icon(artDef?.icon || 'gem-pendant', artDef ? '#ffcf5a' : '#555')),
        h('div', { class: 'grow' }, h('b', {}, artDef ? `${artDef.name} (Lv ${art!.level})` : 'No artifact — tap to equip'), artDef ? h('div', { class: 'tiny dim' }, artDef.desc) : null),
      ),
      h('div', { class: 'tiny mute', style: 'margin-top:8px' }, 'Tip: tap a slot to equip, enhance or swap gear. Sets: 2-piece/4-piece bonuses as in the Codex.'),
    );
  };

  const renderUpgrade = (i: typeof inst) => {
    const prof = store.profile!;
    const cap = levelCap(i.stars);
    const lvCost = Math.floor(xpToNext(i.level) * 2.5);
    const pc = promoteCost(i.stars);
    const ac = awakenCost(i.awaken);
    const act = async (op: string, args: Record<string, unknown>, okMsg: string, sound = 'j_level') => {
      try { await api.action(op, { uid: i.uid, ...args }); sfx(sound); toast(okMsg, 'ok'); refresh(); } catch (e) { toast((e as Error).message, 'err'); }
    };
    const dupes = prof.heroes.filter((x) => x.heroId === i.heroId && x.uid !== i.uid);
    body.append(
      h('div', { class: 'col' },
        h('div', { class: 'skill' }, h('div', { class: 'sicon' }, icon('upgrade')), h('div', { class: 'grow' }, h('div', { class: 'sname' }, `Level ${i.level} / ${cap}`), h('div', { class: 'tiny dim' }, `Next level: ${fmt(lvCost)} gold`), h('div', { class: 'row', style: 'margin-top:6px' },
          h('button', { class: 'btn sm', onclick: () => act('levelUp', { levels: 1 }, 'Level up!') }, '+1'),
          h('button', { class: 'btn sm', onclick: () => act('levelUp', { levels: 5 }, 'Level up!') }, '+5'),
          h('button', { class: 'btn sm ghost', onclick: () => act('levelUp', { levels: 60 }, 'Levelled to the cap!') }, 'Max'),
        ))),
        h('div', { class: 'skill' }, h('div', { class: 'sicon' }, icon('laurel-crown')), h('div', { class: 'grow' }, h('div', { class: 'sname' }, `Promote ${i.stars}★ → ${Math.min(6, i.stars + 1)}★`), h('div', { class: 'tiny dim' }, i.stars >= 6 ? 'Maximum stars.' : `Requires level ${cap}. Cost ${fmt(pc.gold)} gold + ${pc.crystals * 5} runes. Raises the level cap by 10.`), i.stars < 6 ? h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: () => act('promote', {}, 'Promoted!', 'j_rare') }, 'Promote') : null)),
        h('div', { class: 'skill' }, h('div', { class: 'sicon' }, icon('rune-stone')), h('div', { class: 'grow' }, h('div', { class: 'sname' }, `Awakening ${i.awaken}/6`), h('div', { class: 'tiny dim' }, i.awaken >= 6 ? 'Fully awakened.' : `+3% Attack/Health/Defense and Speed at stages 2/4/6. Cost ${fmt(ac.gold)} gold + ${ac.runes} runes.`), i.awaken < 6 ? h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: () => act('awaken', {}, 'Awakened!') }, 'Awaken') : null)),
        h('div', { class: 'skill' }, h('div', { class: 'sicon' }, icon('sprout')), h('div', { class: 'grow' }, h('div', { class: 'sname' }, 'Skill Enhancement'), h('div', { class: 'tiny dim' }, 'Spend Molagora and gold to raise skill power, effect chance or reduce cooldowns.'),
          h('div', { class: 'row wrap', style: 'margin-top:6px' }, ([0, 1, 2] as const).map((s) => {
            const sk = def.skills.find((x) => x.slot === (['s1', 's2', 's3'] as const)[s]);
            const max = sk?.enhance?.length ?? 0;
            const c = skillEnhanceCost(i.skillLv[s]);
            return h('button', { class: 'btn sm ghost', disabled: i.skillLv[s] >= max ? true : undefined, title: `${fmt(c.gold)} gold + ${c.mola} molagora`, onclick: () => act('enhanceSkill', { slot: s }, `${sk?.name} enhanced!`) }, `S${s + 1} +${i.skillLv[s]}/${max}`);
          })),
        )),
        h('div', { class: 'skill' }, h('div', { class: 'sicon' }, icon('dna1')), h('div', { class: 'grow' }, h('div', { class: 'sname' }, `Memory Imprint: ${IMPRINT_GRADES[i.imprint]}`), h('div', { class: 'tiny dim' }, `Fuse a duplicate to raise the imprint (D→SSS). ${dupes.length} duplicate(s) owned.`),
          dupes.length && i.imprint < 6 ? h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: async () => { if (await confirmDialog('Imprint', `Consume a duplicate ${def.name} to raise the imprint?`)) await act('imprint', { fodder: dupes.sort((a, b) => a.level - b.level)[0].uid }, 'Imprint raised!', 'j_rare'); } }, 'Imprint') : null)),
        h('div', { class: 'row', style: 'justify-content:space-between;margin-top:6px' },
          h('button', { class: 'btn sm ghost', onclick: () => act('lock', { locked: !i.locked }, i.locked ? 'Unlocked' : 'Locked', 'latch') }, icon(i.locked ? 'padlock-open' : 'padlock'), i.locked ? 'Unlock' : 'Lock'),
          h('button', { class: 'btn sm red', onclick: async () => { if (await confirmDialog('Release hero', `Release ${def.name}? You receive gold and runes. This cannot be undone.`, 'Release')) { try { const r = await api.action<any>('release', { uid: i.uid }); toast(`Released for ${fmt(r.gold)} gold and ${r.runes} runes.`); void go('heroes'); } catch (e) { toast((e as Error).message, 'err'); } } } }, 'Release'),
        ),
      ),
    );
  };

  const openGearPicker = (heroUid: string, slot: GearPiece['slot']) => {
    const prof = store.profile!;
    const list = prof.gear.filter((g) => g.slot === slot).sort((a, b) => b.rarity - a.rarity || b.enhance - a.enhance || gearScore(b) - gearScore(a));
    const cur = prof.gear.find((g) => g.id === prof.heroes.find((x) => x.uid === heroUid)!.gear[slot]);
    const listEl = h('div', { class: 'col', style: 'gap:6px' });
    const m = modal(h('div', { class: 'col', style: 'min-height:0' },
      h('h2', { class: 'title' }, `${slot[0].toUpperCase()}${slot.slice(1)}`),
      cur ? gearRow(cur, true) : h('div', { class: 'dim' }, 'Nothing equipped.'),
      cur ? h('div', { class: 'row' },
        h('button', { class: 'btn sm', onclick: async () => { try { await api.action('enhanceGear', { gear: cur.id, levels: 1 }); sfx('latch'); m.close(); openGearPicker(heroUid, slot); refresh(); } catch (e) { toast((e as Error).message, 'err'); } } }, `Enhance (${fmt(gearEnhanceCost(cur))}g)`),
        h('button', { class: 'btn sm ghost', onclick: async () => { try { await api.action('enhanceGear', { gear: cur.id, levels: 15 }); sfx('latch'); m.close(); openGearPicker(heroUid, slot); refresh(); } catch (e) { toast((e as Error).message, 'err'); } } }, 'Enhance to +15'),
        h('button', { class: 'btn sm ghost', onclick: async () => { await api.action('unequipGear', { gear: cur.id }); sfx('cloth'); m.close(); refresh(); } }, 'Unequip'),
      ) : null,
      h('div', { class: 'sep' }),
      h('div', { class: 'mbody scroll', style: 'max-height:46vh' }, listEl),
    ), { wide: true });
    if (!list.length) listEl.appendChild(h('div', { class: 'dim' }, 'No gear for this slot yet — clear campaign stages to find more.'));
    for (const g of list) {
      if (g === cur) continue;
      const owner = g.equippedBy ? prof.heroes.find((x) => x.uid === g.equippedBy) : undefined;
      const row = gearRow(g, false, owner ? getHero(owner.heroId).name : undefined);
      row.addEventListener('click', async () => { await api.action('equipGear', { gear: g.id, hero: heroUid }); sfx('cloth'); m.close(); refresh(); });
      listEl.appendChild(row);
    }
  };

  const openArtifactPicker = (heroUid: string) => {
    const prof = store.profile!;
    const hd = def;
    const list = h('div', { class: 'col', style: 'gap:6px' });
    const m = modal(h('div', { class: 'col' }, h('h2', { class: 'title' }, 'Artifacts'), h('div', { class: 'mbody scroll', style: 'max-height:56vh' }, list)), { wide: true });
    list.appendChild(h('div', { class: 'gearitem', onclick: async () => { await api.action('equipArtifact', { artifact: null, hero: heroUid }); m.close(); refresh(); } }, h('div', { class: 'gi' }, icon('cancel')), h('b', {}, 'Unequip')));
    for (const a of prof.artifacts) {
      const ad = ARTIFACTS[a.id];
      const ok = !ad.cls || ad.cls.includes(hd.cls);
      list.appendChild(h('div', { class: `gearitem ${ok ? '' : 'dis'}`, style: ok ? '' : 'opacity:.4', onclick: async () => { if (!ok) return toast(`${ad.name} is for ${ad.cls!.join('/')}`, 'err'); await api.action('equipArtifact', { artifact: a.uid, hero: heroUid }); sfx('latch'); m.close(); refresh(); } },
        h('div', { class: 'gi' }, icon(ad.icon, '#ffcf5a')),
        h('div', { class: 'grow' }, h('b', {}, `${ad.name} · ${'★'.repeat(ad.rarity)} · Lv ${a.level}`), h('div', { class: 'tiny dim' }, ad.desc), ad.cls ? h('div', { class: 'tiny mute' }, `Classes: ${ad.cls.map((c) => CLASS_NAMES[c]).join(', ')}`) : null),
        h('button', { class: 'btn sm ghost', onclick: async (e: Event) => { e.stopPropagation(); try { await api.action('enhanceArtifact', { artifact: a.uid }); sfx('latch'); m.close(); openArtifactPicker(heroUid); } catch (err) { toast((err as Error).message, 'err'); } } }, 'Enhance'),
      ));
    }
  };

  $ui().appendChild(h('div', { class: 'screen page' },
    topbar(def.name, 'heroes'),
    h('div', { class: 'page-body' },
      h('div', { class: 'mainpane', style: 'justify-content:flex-end;align-items:flex-start;pointer-events:none' },
        h('div', { class: 'row', style: 'pointer-events:auto;gap:6px' },
          h('button', { class: 'iconbtn', title: 'Rotate', onpointerdown: () => setSpin(1.5), onpointerup: () => setSpin(0), onpointerleave: () => setSpin(0) }, icon('cycle')),
          h('button', { class: 'iconbtn', title: 'Attack', onclick: () => { void showcaseHero()?.oneShot(showcaseHero()!.melee ? 'attack' : 'cast', 1); } }, icon('crossed-swords')),
          h('button', { class: 'iconbtn', title: 'Victory pose', onclick: () => { showcaseHero()?.play('victory'); } }, icon('podium-winner')),
        ),
      ),
      h('div', { class: 'side panel', style: 'padding:0;overflow:hidden' }, header, h('div', { style: 'padding:0 14px' }, tabs), h('div', { style: 'padding:12px 14px;display:flex;flex-direction:column;min-height:0;flex:1' }, body)),
    ),
  ));
  // drag to rotate the 3D model
  let dragging = false;
  let lastX = 0;
  const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; };
  const move = (e: PointerEvent) => { if (dragging) { rotateShowcase((e.clientX - lastX) * 0.01); lastX = e.clientX; } };
  const up = () => { dragging = false; };
  const ui = document.getElementById('ui')!;
  const onDown = (e: PointerEvent) => { if ((e.target as HTMLElement).closest('.mainpane')) down(e); };
  ui.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  onLeave(() => { ui.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); });
  renderHeader();
  renderTabs();
  renderBody();
});

export function gearRow(g: GearPiece, equipped: boolean, owner?: string) {
  const set = GEAR_SETS[g.set];
  return h('div', { class: `gearitem ${equipped ? 'sel' : ''}` },
    h('div', { class: `gi gear-r${g.rarity}` }, icon(SLOT_ICON[g.slot], set?.color), h('span', { class: 'tiny', style: 'position:absolute;bottom:0;right:3px;font-weight:800' }, `+${g.enhance}`)),
    h('div', { class: 'grow' },
      h('div', { class: 'row between' }, h('b', { class: `gear-r${g.rarity}` }, `${RARITY_NAMES[g.rarity]} ${set?.name || g.set} ${g.slot}`), h('span', { class: 'tiny dim' }, owner ? `on ${owner}` : `iLv ${g.level}`)),
      h('div', { class: 'small' }, `${GEAR_STAT_NAMES[g.main.stat]} ${fmtGearStat(g.main.stat, g.main.value)}`),
      h('div', { class: 'subs' }, g.subs.map((s) => h('span', {}, `${GEAR_STAT_NAMES[s.stat]} ${fmtGearStat(s.stat, s.value)}${s.rolls > 1 ? ` (${s.rolls})` : ''}`))),
      h('div', { class: 'tiny mute' }, `${set?.pieces}pc: ${set?.desc} · score ${gearScore(g)}`),
    ),
  );
}
