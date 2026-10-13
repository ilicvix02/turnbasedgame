// Codex: the designed meta (archetypes & counters), simulator tier list, hero encyclopedia and full mechanics glossary.
import { getHero } from '@shared/engine/registry';
import { PLAYABLE, CLASS_NAMES, ELEMENT_COLORS, ELEMENT_NAMES, THRONE_NAMES } from '@shared/data/index';
import { ARCHETYPES } from '@shared/meta/meta';
import { HERO_TIER, HERO_TIER_LETTER } from '@shared/meta/tiers';
import { STATUSES } from '@shared/engine/statuses';
import { FIELDS } from '@shared/engine/fields';
import { GEAR_SETS } from '@shared/engine/sets';
import { ARTIFACTS } from '@shared/engine/artifacts';
import { $ui, h, icon, modal, richText } from '../core/dom';
import { music, sfx } from '../core/audio';
import { register, topbar, heroMeta, tierBadge, ELEMENT_ICON } from '../ui';
import { showHeroes } from '../menu3d';
import { portraitImg } from '../g3d/portraits';
import { skillIcon } from '../battle/session';

let tab = 'meta';

register('codex', async () => {
  void music('map');
  void showHeroes(['penumbra'], 'lobby');
  const body = h('div', { class: 'scroll grow' });
  const tabs = h('div', { class: 'tabs' });
  const renderTabs = () => {
    tabs.innerHTML = '';
    for (const [k, l] of [['meta', 'Meta'], ['tiers', 'Tier List'], ['heroes', 'Heroes'], ['rules', 'Rules'], ['effects', 'Effects'], ['gear', 'Gear & Artifacts']]) tabs.appendChild(h('div', { class: `tab ${tab === k ? 'on' : ''}`, onclick: () => { tab = k; sfx('book'); renderTabs(); render(); } }, l));
  };
  const render = () => {
    body.innerHTML = '';
    if (tab === 'meta') {
      body.append(h('div', { class: 'small dim', style: 'margin-bottom:10px' }, 'Aethra\'s meta was designed as a counter-cycle and verified with a headless simulator running thousands of AI-vs-AI battles at reference endgame builds. Each archetype has a plan, a core, flex options, and matchups it wins or loses.'));
      for (const a of Object.values(ARCHETYPES)) {
        body.appendChild(h('div', { class: 'arch', style: `border-left:3px solid ${a.color};margin-bottom:10px` },
          h('h3', { style: `color:${a.color}` }, a.name),
          h('div', { class: 'small', style: 'margin:6px 0' }, a.plan),
          h('div', { class: 'row wrap', style: 'gap:4px' }, a.core.map((id) => h('div', { class: 'mini', title: getHero(id).name, style: 'width:46px;height:46px' }, portraitImg(id, ''))), h('span', { class: 'tiny dim', style: 'margin:0 6px' }, 'flex:'), a.flex.map((id) => h('div', { class: 'mini', title: getHero(id).name, style: 'width:34px;height:34px;opacity:.85' }, portraitImg(id, '')))),
          h('div', { class: 'tiny', style: 'margin-top:6px' }, h('span', { style: 'color:var(--good)' }, `Beats: ${a.beats.join(', ')}`), ' · ', h('span', { style: 'color:var(--bad)' }, `Loses to: ${a.losesTo.join(', ')}`)),
        ));
      }
    } else if (tab === 'tiers') {
      const groups: Record<string, string[]> = { SS: [], S: [], A: [], B: [], C: [], D: [] };
      for (const h0 of PLAYABLE().sort((a, b) => (HERO_TIER[b.id] ?? 0) - (HERO_TIER[a.id] ?? 0))) groups[HERO_TIER_LETTER[h0.id] || 'B'].push(h0.id);
      body.append(h('div', { class: 'small dim', style: 'margin-bottom:10px' }, 'Win rate of each hero across random 4v4 battles in the balance simulator (all heroes at max investment). Lower-rarity heroes are intentionally weaker overall but each has a niche.'));
      for (const [t, ids] of Object.entries(groups)) {
        if (!ids.length) continue;
        body.appendChild(h('div', { class: 'row', style: 'align-items:flex-start;gap:10px;margin-bottom:10px' },
          h('span', { class: `tier ${t}`, style: 'min-width:40px;height:40px;font-size:18px' }, t),
          h('div', { class: 'row wrap', style: 'gap:6px' }, ids.map((id) => h('div', { class: 'col center', style: 'gap:2px;width:64px;cursor:pointer', onclick: () => heroModal(id) }, h('div', { class: 'mini', style: 'width:56px;height:56px' }, portraitImg(id, '')), h('span', { class: 'tiny' }, getHero(id).name.split(' ')[0]), h('span', { class: 'tiny mute' }, `${HERO_TIER[id]}%`)))),
        ));
      }
    } else if (tab === 'heroes') {
      const grid = h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fill,minmax(96px,1fr))' });
      for (const d of PLAYABLE().sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))) {
        grid.appendChild(h('div', { class: `hcard r${d.rarity}`, onclick: () => heroModal(d.id) }, portraitImg(d.id), h('div', { class: 'stars' }, '★'.repeat(d.rarity)), h('div', { class: 'el' }, icon(ELEMENT_ICON[d.element], ELEMENT_COLORS[d.element])), h('div', { class: 'lv' }, h('span', { class: 'nm' }, d.name), tierBadge(d.id))));
      }
      body.append(h('div', { class: 'small dim', style: 'margin-bottom:8px' }, `${PLAYABLE().length} heroes across seven Thrones. Tap any hero for the full kit.`), grid);
    } else if (tab === 'rules') {
      const rule = (title: string, text: string) => h('div', { class: 'arch', style: 'margin-bottom:8px' }, h('h3', {}, title), h('div', { class: 'small', style: 'margin-top:4px;line-height:1.5' }, richText(text)));
      body.append(
        rule('Combat Readiness', 'Every unit\'s turn gauge fills at a rate proportional to Speed; the first to reach 100% acts. Battles start with a random 0–5% head start. Skills can push allies forward or pull enemies back.'),
        rule('Damage', 'Damage = (Attack × multiplier + other scaling) × 1.871 × hit type × element ÷ (Defense ÷ 300 + 1). Hits can Miss (75%), be normal, Crushing (130%, 30% of non-crits) or Critical (Crit Damage).'),
        rule('Elements', 'Flame beats Verdant, Verdant beats Frost, Frost beats Flame; Radiant and Umbral beat each other. Advantage: +10% damage and +15% crit chance. Disadvantage: 50% chance to Miss (no debuffs on a Miss).'),
        rule('Effectiveness vs. Resistance', 'A debuff that passes its skill chance lands with probability 100% + Effectiveness − Effect Resistance, capped at 85% (there is always at least a 15% resist chance).'),
        rule('Souls & Soul Burn', 'Skills generate team souls (max 20). Soul Burn spends 10/20 souls to empower a skill. Overcharge heroes raise the cap to 30 and enable 30-soul Overburns.'),
        rule('Counterattacks, Dual Attacks, Extra Turns', 'Counterattacks answer an attack with the first skill (Counter set: 20%). Every attack has a 5% base Dual Attack chance. Extra turns let a hero act again immediately.'),
        rule('Dominions (new)', 'Some ultimates rewrite the battlefield for several turns — only one Dominion can exist, and casting a new one shatters the old. Dominions end early if their caster dies.'),
        rule('Resonance (new)', 'When two different allies of the same Throne act back-to-back, the second deals +10% damage and the team gains a soul. Resonance cannot chain twice in a row.'),
        rule('Echo (new)', 'A hero with Echo repeats their next skill on the same target at 40% damage.'),
        rule('Fate Threads (new)', 'Threaded enemies share 30% of the damage any of them takes. Breaking a thread (dispel, death, Snip) triggers the weaver\'s effect.'),
        rule('Grudge & Extinction', 'Revived heroes return with Grudge (−20% max Health for 2 turns). Extinction prevents revival entirely.'),
        rule('Vanguard (new)', 'The first living hero in formation is the Vanguard. Some passives depend on it, and Pierce attacks hit the Vanguard and the hero behind.'),
        rule('Tide of Ruin (new)', 'After 80 actions, damage rises and healing falls every 8 actions, so stalemates resolve.'),
        rule('World Arena draft', 'Pre-ban 2 (secret) → coin flip → picks 1-2-2-2-2-1 → each player\'s 3rd pick is protected → post-ban 1 enemy hero → 4v4 with a 30-second turn timer.'),
      );
    } else if (tab === 'effects') {
      const grid = h('div', { class: 'col', style: 'gap:6px' });
      for (const s of Object.values(STATUSES)) {
        if (s.hidden) continue;
        grid.appendChild(h('div', { class: 'gearitem', style: 'cursor:default' }, h('div', { class: 'gi' }, icon(s.icon, s.kind === 'buff' ? '#7ad8ff' : s.kind === 'debuff' ? '#ff6a7a' : '#ffd86a')), h('div', {}, h('b', {}, s.name), h('span', { class: 'tiny dim' }, ` · ${s.kind}`), h('div', { class: 'small dim' }, s.desc))));
      }
      const fields = h('div', { class: 'col', style: 'gap:6px' }, Object.values(FIELDS).map((f) => h('div', { class: 'gearitem', style: 'cursor:default' }, h('div', { class: 'gi' }, icon(f.icon, f.color)), h('div', {}, h('b', { style: `color:${f.color}` }, f.name), h('div', { class: 'small dim' }, f.desc)))));
      body.append(h('h3', { class: 'title', style: 'margin:6px 0' }, 'Dominions'), fields, h('h3', { class: 'title', style: 'margin:12px 0 6px' }, 'Buffs, debuffs & states'), grid);
    } else {
      const sets = h('div', { class: 'col', style: 'gap:6px' }, Object.values(GEAR_SETS).map((s) => h('div', { class: 'gearitem', style: 'cursor:default' }, h('div', { class: 'gi' }, icon(s.icon, s.color)), h('div', {}, h('b', {}, `${s.name} (${s.pieces}pc)`), h('div', { class: 'small dim' }, s.desc)))));
      const arts = h('div', { class: 'col', style: 'gap:6px' }, Object.values(ARTIFACTS).map((a) => h('div', { class: 'gearitem', style: 'cursor:default' }, h('div', { class: 'gi' }, icon(a.icon, '#ffcf5a')), h('div', {}, h('b', {}, `${a.name} ${'★'.repeat(a.rarity)}`), h('span', { class: 'tiny dim' }, a.cls ? ` · ${a.cls.map((c) => CLASS_NAMES[c]).join('/')}` : ' · all classes'), h('div', { class: 'small dim' }, a.desc)))));
      body.append(h('div', { class: 'small dim' }, '6 gear slots: weapon (Attack), helmet (Health), armor (Defense), necklace, ring and boots (variable main stats). Up to 4 substats; every +3 enhancement adds or upgrades a substat (max +15).'), h('h3', { class: 'title', style: 'margin:10px 0 6px' }, 'Gear sets'), sets, h('h3', { class: 'title', style: 'margin:12px 0 6px' }, 'Artifacts'), arts);
    }
  };
  $ui().appendChild(h('div', { class: 'screen page' },
    topbar('Codex'),
    h('div', { class: 'page-body' }, h('div', { class: 'mainpane', style: 'margin-left:auto;max-width:900px' }, h('div', { class: 'panel', style: 'padding:14px;display:flex;flex-direction:column;gap:12px;min-height:0;flex:1' }, tabs, body))),
  ));
  renderTabs();
  render();
});

export function heroModal(id: string) {
  const d = getHero(id);
  modal(h('div', { class: 'col', style: 'min-height:0' },
    h('div', { class: 'row', style: 'gap:14px' },
      h('div', { style: 'width:110px;flex:none' }, h('div', { class: `hcard r${d.rarity}` }, portraitImg(id))),
      h('div', { class: 'col', style: 'gap:6px' }, h('div', { class: 'hd-title' }, d.title), h('div', { class: 'hd-name' }, d.name, ' ', tierBadge(id)), heroMeta(id), h('div', { class: 'small dim' }, `${d.rarity}★ · ${THRONE_NAMES[d.throne]} · ${ELEMENT_NAMES[d.element]} ${CLASS_NAMES[d.cls]} · simulator win rate ${HERO_TIER[id] ?? '—'}%`), h('div', { class: 'small', style: 'font-style:italic;font-family:var(--serif)' }, d.tagline)),
    ),
    h('div', { class: 'mbody scroll', style: 'max-height:55vh' },
      d.skills.map((sk) => h('div', { class: 'skill', style: 'margin-bottom:8px' },
        h('div', { class: 'sicon' }, icon(sk.passive ? 'aura' : skillIcon(sk.vfx, sk.anim), ELEMENT_COLORS[d.element])),
        h('div', { class: 'grow' }, h('div', { class: 'sname' }, sk.name), h('div', { class: 'smeta' }, h('span', {}, sk.slot.toUpperCase()), sk.passive ? h('span', {}, 'Passive') : h('span', {}, sk.cd ? `Cooldown ${sk.cd}` : 'No cooldown'), sk.form ? h('span', {}, `${sk.form} form`) : null), h('div', { class: 'sdesc' }, richText(sk.desc)), sk.soulburn ? h('div', { class: 'ssb' }, h('b', {}, `Soul Burn (${sk.soulburn.cost}): `), sk.soulburn.desc) : null),
      )),
      h('div', { class: 'small', style: 'margin-top:8px;line-height:1.6' }, d.lore),
      h('div', { class: 'small gold', style: 'margin-top:6px;font-family:var(--serif)' }, `“${d.quote}”`),
    ),
  ), { wide: true });
}
