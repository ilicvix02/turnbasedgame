// STARFALL ACADEMY — astronomers and astral mages of the Observatory City.
import type { HeroDef } from '../../engine/types';
import { registerStatus } from '../../engine/statuses';
import { E, imprint, stats } from '../kit';

registerStatus({ id: 'thesis', name: 'Thesis', kind: 'state', icon: 'scroll-unfurled', sticky: true, desc: 'Thesis stacks: Critical Hit Damage +10% each (max 5).' });

export const STARFALL: HeroDef[] = [
  {
    id: 'altair', name: 'Professor Altair', title: 'Quill of Stars', rarity: 5, element: 'radiant', cls: 'mage', throne: 'starfall', role: 'dps',
    archetypes: ['Cleave', 'Dominion Control'],
    tagline: 'Crits build Thesis; Grand Theory spends it — devastating in Starfield.',
    base: stats('mage', 5, { atk: 1.04, spd: 105, cc: 0.2 }),
    imprint: imprint('concentration', 'cd'),
    skills: [
      { slot: 's1', name: 'Footnote', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'star_bolt', desc: 'Attacks the enemy. On a critical hit, gains 1 Thesis.', enhance: E.dmg,
        run: (c) => { const r = c.hit(c.t, { atk: 1.0 }); if (r.type === 'crit') c.showStacks('thesis', c.add('thesis', 1, 5)); } },
      { slot: 's2', name: 'Peer Review', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Each Thesis increases Critical Hit Damage by 10% (max 5). At battle start, gains 1 Thesis per Starfall ally.', enhance: [] },
      { slot: 's3', name: 'Grand Theory', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'star_big', desc: 'Attacks all enemies, consuming all Thesis: damage +8% per Thesis. Damage +20% in Starfield.', enhance: E.cd,
        run: (c) => { const th = c.get('thesis'); c.hitAll({ atk: 1.2, mult: (1 + 0.08 * th) * (c.fieldIs('starfield') ? 1.2 : 1) }); c.set('thesis', 0); c.showStacks('thesis', 0); } },
    ],
    hooks: {
      stats: (u) => ({ cd: 0.1 * (u.data.thesis || 0) }),
      onBattleStart: (h) => { const n = h.others().filter((a) => a.def.throne === 'starfall').length; if (n) h.showStacks('thesis', h.add('thesis', n, 5)); },
    },
    lore: 'Altair has been writing the same paper for sixty years: a complete proof that the stars are, in fact, listening.',
    quote: 'Citation needed? Here. Have several.',
    look: { body: 'tall', skin: '#e8d0b8', hair: { style: 'short', color: '#d8d8e8' }, outfit: { primary: '#1a1a4a', secondary: '#e8d88a', accent: '#8ab0ff', style: 'robe' }, weapon: 'book', head: 'hat', back: 'orbs', eyes: '#8ab0ff', aura: '#8ab0ff' },
  },
  {
    id: 'lyra', name: 'Lyra', title: 'Cometsong', rarity: 4, element: 'radiant', cls: 'soulweaver', throne: 'starfall', role: 'support',
    archetypes: ['Soul Engine'],
    tagline: 'Soul battery: +souls every turn, and cooldown-skips for allies.',
    base: stats('soulweaver', 4, { spd: 110 }),
    imprint: imprint('release', 'atk'),
    skills: [
      { slot: 's1', name: 'Comet Chord', cd: 0, souls: 2, target: 'enemy', anim: 'cast', vfx: 'star_bolt', desc: 'Attacks the enemy. Generates 2 souls.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Encore', cd: 3, souls: 1, target: 'ally', anim: 'buff', vfx: 'notes', desc: 'Decreases all skill cooldowns of an ally by 1 turn and increases their Combat Readiness by 20%.', enhance: E.cdOnly,
        run: (c) => { c.reduceCd(c.t, 1); if (c.t !== c.self) c.cr(c.t, 20); } },
      { slot: 's3', name: 'Starlit Overture', cd: 5, souls: 5, target: 'allAllies', anim: 'ult', vfx: 'notes_big', desc: 'Heals all allies by 15% of the caster\'s max Health, grants Increased Attack for 2 turns and generates 5 souls.', enhance: E.heal,
        soulburn: { cost: 20, desc: 'Also increases all allies\' Combat Readiness by 30% and grants Echo to the ally with the highest Attack.' },
        run: (c) => { for (const a of c.allies()) { c.heal(a, c.maxHp() * 0.15); c.buff(a, 'atk_up', 2); if (c.sb && a !== c.self) c.cr(a, 30); } if (c.sb) { const top = c.highest(c.others(), 'atk'); if (top) c.buff(top, 'echo', 2); } } },
    ],
    lore: 'Lyra tunes her harp to passing comets. She has to wait seventy-six years between some notes.',
    quote: 'Again, from the top — and louder!',
    look: { body: 'slim', feminine: true, skin: '#f6e0d0', hair: { style: 'twin', color: '#ffd0f0' }, outfit: { primary: '#f0f0ff', secondary: '#b0a0ff', accent: '#ffd76a', style: 'dress' }, weapon: 'harp', head: 'circlet', back: 'wings', eyes: '#b0a0ff', aura: '#ffd0f0' },
  },
  {
    id: 'orion', name: 'Orion Vex', title: 'Constellation Hunter', rarity: 5, element: 'umbral', cls: 'ranger', throne: 'starfall', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'Follows up whenever an ally crits a Targeted enemy.',
    base: stats('ranger', 5, { atk: 1.03, spd: 109 }),
    imprint: imprint('concentration', 'cc'),
    skills: [
      { slot: 's1', name: 'Shadowstring', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'arrow_dark', desc: 'Attacks with a 50% chance to inflict Target for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'mark', 1, 0.5); } },
      { slot: 's2', name: 'Hunter\'s Constellation', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'When an ally lands a critical hit on a Targeted enemy, follows up with Shadowstring (once per turn).', enhance: [] },
      { slot: 's3', name: 'Starfall Arrow', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'star_arrow', desc: 'Attacks the enemy, ignoring 30% of Defense. Critical Hit Damage +40% against Targeted enemies.', enhance: E.cd,
        soulburn: { cost: 10, desc: 'Inflicts Target for 2 turns before attacking.' },
        run: (c) => { if (c.sb) c.debuff(c.t, 'mark', 2, 1, { unres: true }); c.hit(c.t, { atk: 2.0, pen: 0.3, cdBonus: c.t.has('mark') ? 0.4 : 0 }); } },
    ],
    hooks: {
      onAllyHit: (h, ally, t, info) => { if (info.type === 'crit' && t.alive && t.has('mark') && !info.isCounter && !info.isDual && h.once('constellation')) { void ally; h.react('followup', t); } },
    },
    lore: 'Orion once shot a star out of the sky to prove a point. The Academy still argues about what the point was.',
    quote: 'Look up. That\'s the last thing you\'ll see.',
    look: { body: 'tall', skin: '#c8b8b0', hair: { style: 'long', color: '#1a1a3a' }, outfit: { primary: '#14142a', secondary: '#6a6aaa', accent: '#ffe88a', style: 'coat' }, weapon: 'bow', head: 'hood', back: 'quiver', eyes: '#ffe88a', aura: '#6a6aff' },
  },
  {
    id: 'nova', name: 'Nova', title: 'Starling', rarity: 3, element: 'radiant', cls: 'mage', throne: 'starfall', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'First-year student with two AoEs.',
    base: stats('mage', 3),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Twinkle', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'star_bolt', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Meteor Shower', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'meteor', desc: 'Attacks all enemies.', enhance: E.cd, run: (c) => { c.hitAll({ atk: 0.8 }); } },
      { slot: 's3', name: 'Supernova', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'star_big', desc: 'Attacks all enemies with a 30% chance to Decrease Defense for 1 turn.', enhance: E.mix,
        run: (c) => { c.hitAll({ atk: 1.0 }); c.debuffAll('def_down', 1, 0.3); } },
    ],
    lore: 'Nova failed the Academy entrance exam by setting the examiner\'s beard on fire. They let her in anyway; they wanted to know how.',
    quote: 'Wait, I know this one!',
    look: { body: 'small', feminine: true, skin: '#f6e0d0', hair: { style: 'twin', color: '#ffe88a' }, outfit: { primary: '#2a2a6a', secondary: '#ffe88a', accent: '#ff8ab0', style: 'robe' }, weapon: 'staff', head: 'hat', eyes: '#ffe88a', aura: '#ffe88a' },
  },
  {
    id: 'vega', name: 'Vega', title: 'Lunaris', rarity: 4, element: 'frost', cls: 'mage', throne: 'starfall', role: 'debuffer',
    archetypes: ['Dominion Control', 'Bruiser Counter'],
    tagline: 'Buff remover and Unbuffable lock.',
    base: stats('mage', 4, { eff: 0.15, spd: 107 }),
    imprint: imprint('concentration', 'eff'),
    skills: [
      { slot: 's1', name: 'Lunar Needle', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'moon_bolt', desc: 'Attacks with a 50% chance to remove 1 buff.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); if (c.t.alive && c.chance(0.5 + c.lv.chance)) c.dispel(c.t, 1); } },
      { slot: 's2', name: 'Moonwash', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'moon_wave', desc: 'Attacks all enemies and removes 1 buff from each.', enhance: E.cd,
        run: (c) => { c.hitAll({ atk: 0.75 }); for (const e of c.enemies()) c.dispel(e, 1); } },
      { slot: 's3', name: 'Tidal Lock', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'moon_big', desc: 'Attacks with an 85% chance to inflict Unbuffable for 2 turns. If the target had no buffs, also attempts to Stun for 1 turn (60%).', enhance: E.chance,
        run: (c) => { const none = c.t.buffs().length === 0; c.hit(c.t, { atk: 1.4 }); c.debuff(c.t, 'unbuffable', 2, 0.85); if (none) c.debuff(c.t, 'stun', 1, 0.6); } },
    ],
    lore: 'Vega studies the tides of the moon and has concluded that it is, in fact, pushing back.',
    quote: 'Gravity is a debuff, you know.',
    look: { body: 'slim', feminine: true, skin: '#e8eaf6', hair: { style: 'long', color: '#a8c8ff' }, outfit: { primary: '#1a2a5a', secondary: '#d8e8ff', accent: '#a8c8ff', style: 'robe' }, weapon: 'orb', head: 'circlet', back: 'orbs', eyes: '#a8c8ff', aura: '#a8c8ff' },
  },
  {
    id: 'ceres', name: 'Ceres', title: 'Moonwell', rarity: 4, element: 'umbral', cls: 'soulweaver', throne: 'starfall', role: 'healer',
    archetypes: ['Soul Engine', 'Revive Sustain'],
    tagline: 'Overcharge: raises the soul cap to 30 and heals with souls.',
    base: stats('soulweaver', 4, { hp: 1.06, spd: 104 }),
    overcharge: true,
    imprint: imprint('release', 'hp'),
    skills: [
      { slot: 's1', name: 'Well Water', cd: 0, souls: 2, target: 'enemy', anim: 'cast', vfx: 'water', desc: 'Attacks the enemy. Generates 2 souls.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 0.8 }); } },
      { slot: 's2', name: 'Tidewell', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Overcharge: while alive, the team\'s soul cap is 30. At the start of each turn generates 2 souls. Allies deal 2% more damage for every soul above 10 (max +40%).', enhance: [] },
      { slot: 's3', name: 'Moonwell Overflow', cd: 4, souls: 2, target: 'allAllies', anim: 'heal', vfx: 'water_big', desc: 'Heals all allies by 1% of the caster\'s max Health per soul held (max 25%).', enhance: E.heal,
        soulburn: { cost: 30, desc: 'Overburn: heals 30%, removes all debuffs and increases all allies\' Combat Readiness by 30%.' },
        run: (c) => {
          if (c.sb) { for (const a of c.allies()) { c.heal(a, c.maxHp() * 0.3); c.cleanse(a, 99); if (a !== c.self) c.cr(a, 30); } return; }
          const pct = Math.min(0.25, 0.01 * c.b.souls[c.self.team]);
          c.healAll(c.maxHp() * pct);
        } },
    ],
    hooks: { onTurnStart: (h) => h.souls(2), auraDmgOut: (holder, _s, _t, b) => 1 + Math.min(0.4, 0.02 * Math.max(0, b.souls[holder.team] - 10)) },
    lore: 'Ceres keeps the Academy\'s moonwell, a pool that reflects the moon even at noon. Students drop wishes in it. She fishes them out and grades them.',
    quote: 'Drink deep. There\'s always more.',
    look: { body: 'slim', feminine: true, skin: '#d8d0e8', hair: { style: 'flowing', color: '#4a3a7a' }, outfit: { primary: '#2a2a4a', secondary: '#8ab0d8', accent: '#e8e8ff', style: 'robe' }, weapon: 'orb', head: 'veil', back: 'orbs', eyes: '#e8e8ff', aura: '#8ab0d8' },
  },
  {
    id: 'juno', name: 'Juno', title: 'Stargazer', rarity: 3, element: 'radiant', cls: 'ranger', throne: 'starfall', role: 'support',
    archetypes: ['Cleave'],
    tagline: 'Budget push: +10% Combat Readiness to the whole team.',
    base: stats('ranger', 3, { spd: 109 }),
    imprint: imprint('release', 'cc'),
    skills: [
      { slot: 's1', name: 'Lens Flare', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'star_bolt', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Guiding Star', cd: 3, souls: 1, target: 'allAllies', anim: 'buff', vfx: 'star_buff', desc: 'Increases all allies\' Combat Readiness by 10% and grants Increased Critical Hit Chance for 2 turns.', enhance: E.cdOnly,
        run: (c) => { for (const a of c.allies()) { if (a !== c.self) c.cr(a, 10); c.buff(a, 'crit_up', 2); } } },
      { slot: 's3', name: 'Telescope Shot', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'arrow_big', desc: 'Attacks with a 60% chance to inflict Exposed for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.5 }); c.debuff(c.t, 'crit_vuln', 2, 0.6); } },
    ],
    lore: 'Juno named a star after herself and then, when nobody objected, named three more.',
    quote: 'Right there! Second star to the left!',
    look: { body: 'small', feminine: true, skin: '#e8c8b0', hair: { style: 'ponytail', color: '#ff9a6a' }, outfit: { primary: '#3a3a7a', secondary: '#ffe8a8', accent: '#ff9a6a', style: 'tunic' }, weapon: 'gun', head: 'goggles', eyes: '#6a8aff', aura: '#ffe8a8' },
  },
  {
    id: 'penumbra', name: 'Arcanist Penumbra', title: 'of the Eclipse', rarity: 5, element: 'umbral', cls: 'mage', throne: 'starfall', role: 'dps',
    archetypes: ['Dominion Control', 'Cleave'],
    tagline: 'Casts Eclipse and grows stronger every time a Dominion shatters.',
    base: stats('mage', 5, { spd: 107 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Penumbral Bolt', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'dark_bolt', desc: 'Attacks with a 35% chance to Decrease Hit Chance for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.05 }); c.debuff(c.t, 'hit_down', 1, 0.35); } },
      { slot: 's2', name: 'Twilight Scholar', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Whenever any Dominion shatters or expires, gains Increased Attack for 2 turns and 15% Combat Readiness.', enhance: [] },
      { slot: 's3', name: 'Total Eclipse', cd: 5, souls: 3, target: 'allEnemies', anim: 'ult', vfx: 'eclipse', desc: 'Creates the Dominion "Eclipse" for 3 turns (Radiant/Umbral advantage inverts, crit chance +10%), removes 1 buff from all enemies and attacks them.', enhance: E.cd,
        run: (c) => { c.field('eclipse', 3); for (const e of c.enemies()) c.dispel(e, 1); c.hitAll({ atk: 1.05 }); } },
    ],
    hooks: {
      onFieldEnd: (h) => { h.buff(h.self, 'atk_up', 2); h.cr(h.self, 15); },
    },
    lore: 'Penumbra lives in the narrow band of the world that is neither lit nor dark. She says it is quieter there. It is also, conveniently, where most people stand during an eclipse.',
    quote: 'Neither light nor dark. Just me.',
    look: { body: 'slim', feminine: true, skin: '#d0c8d8', hair: { style: 'long', color: '#ffffff' }, outfit: { primary: '#0a0a14', secondary: '#ffe8a8', accent: '#a07aff', style: 'dress' }, weapon: 'orb', head: 'halo', back: 'wings', eyes: '#ffe8a8', aura: '#a07aff' },
  },
];
