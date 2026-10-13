// WILDROOT — druid circles and beast-clans of the Elderwood.
import type { HeroDef } from '../../engine/types';
import { registerStatus } from '../../engine/statuses';
import { E, imprint, stats } from '../kit';

registerStatus({ id: 'feral', name: 'Feral Form', kind: 'state', icon: 'wolf-howl', desc: 'Transformed into the Feral beast. Skills change.' });

export const WILDROOT: HeroDef[] = [
  {
    id: 'thalia', name: 'Thalia', title: 'Rootsinger', rarity: 5, element: 'verdant', cls: 'soulweaver', throne: 'wildroot', role: 'support',
    archetypes: ['Revive Sustain', 'Soul Engine'],
    tagline: 'Verdant Court: buffs last longer, souls double, and the first fallen ally rises.',
    base: stats('soulweaver', 5, { hp: 1.08, spd: 106 }),
    imprint: imprint('release', 'hp'),
    skills: [
      { slot: 's1', name: 'Seedsong', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'leaf', desc: 'Attacks the enemy and grants Continuous Heal for 1 turn to the ally with the lowest Health.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 0.9 }); const a = c.lowestHp(c.allies()); if (a) c.buff(a, 'regen', 1); } },
      { slot: 's2', name: 'Deep Roots', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Once per battle, when an ally dies, revives them with 25% Health and grants Bloom for 2 turns.', enhance: [] },
      { slot: 's3', name: 'Verdant Court', cd: 5, souls: 3, target: 'allAllies', anim: 'ult', vfx: 'forest', desc: 'Creates the Dominion "Verdant Court" for 3 turns (buffs last +1 turn, soul gain ×2). Heals all allies by 12% of max Health and grants Increased Defense for 2 turns.', enhance: E.cdOnly,
        run: (c) => { c.field('verdant_court', 3); for (const a of c.allies()) { c.heal(a, c.maxHp() * 0.12); c.buff(a, 'def_up', 2); } } },
    ],
    hooks: {
      onAllyDeath: (h, ally) => {
        if (h.get('rootUsed') || ally.has('extinction')) return;
        if (h.b.revive(ally, 0.25, h.self)) { h.set('rootUsed', 1); h.text('Deep Roots', '#5be37a', ally); h.buff(ally, 'bloom', 2); }
      },
    },
    lore: 'Thalia\'s songs are slow. A verse can take a season. The forest keeps the rhythm for her.',
    quote: 'Root. Rise. Again.',
    look: { body: 'slim', feminine: true, skin: '#c8a888', hair: { style: 'flowing', color: '#3a7a3a' }, outfit: { primary: '#2a5a2a', secondary: '#c8e8a8', accent: '#ffd76a', style: 'robe' }, weapon: 'staff', head: 'antlers', back: 'cape', eyes: '#a8ff8a', aura: '#5be37a' },
  },
  {
    id: 'grom', name: 'Grom', title: 'Barkhide', rarity: 4, element: 'verdant', cls: 'knight', throne: 'wildroot', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Anti-cleave wall: takes 30% less AoE damage.',
    base: stats('knight', 4, { hp: 1.15, spd: 97 }),
    imprint: imprint('release', 'hp'),
    skills: [
      { slot: 's1', name: 'Bark Slam', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'earth_smash', desc: 'Attacks with damage proportional to max Health.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 0.4, hp: 0.08 }); } },
      { slot: 's2', name: 'Barkskin', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'At battle start gains a Barrier equal to 20% of max Health for 2 turns. Damage taken from area attacks −30%.', enhance: [] },
      { slot: 's3', name: 'Thornwall', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'thorns', desc: 'Has a 70% chance to Provoke all enemies for 1 turn and grants the caster Continuous Heal and Increased Defense for 2 turns.', enhance: E.chance,
        run: (c) => { c.debuffAll('provoke', 1, 0.7); c.buff(c.self, 'regen', 2); c.buff(c.self, 'def_up', 2); } },
    ],
    hooks: {
      onBattleStart: (h) => { h.barrier(h.self, h.maxHp() * 0.2, 2); },
      dmgIn: (_u, att, b) => { const ax = b.actx; if (!ax || !att) return 1; const sk = b.skillOf(att, ax.slot); return sk?.target === 'allEnemies' ? 0.7 : 1; },
    },
    lore: 'Grom has stood in the same clearing for two hundred years. He only moved when someone tried to cut the clearing down.',
    quote: 'Hmm. No.',
    look: { body: 'giant', skin: '#7a5a3a', hair: { style: 'wild', color: '#4a8a3a' }, outfit: { primary: '#5a4a2a', secondary: '#7aaa4a', accent: '#c8a86a', style: 'plate' }, weapon: 'hammer', head: 'antlers', eyes: '#c8ff6a', aura: '#7aaa4a' },
  },
  {
    id: 'fenra', name: 'Fenra', title: 'Wildclaw', rarity: 5, element: 'verdant', cls: 'warrior', throne: 'wildroot', role: 'bruiser',
    archetypes: ['DoT Rot', 'Cleave'],
    tagline: 'Stance hero: Huntress marks, Feral form rends and chains kills.',
    base: stats('warrior', 5, { hp: 1.04, spd: 110 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', form: 'base', name: 'Spear Toss', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'spear', desc: '[Huntress] Attacks with a 50% chance to inflict Bleed for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'bleed', 1, 0.5); } },
      { slot: 's1', form: 'feral', name: 'Rend', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'claw', desc: '[Feral] Attacks twice, each with a 60% chance to inflict Bleed for 2 turns, recovering 20% of damage dealt.', enhance: E.mix,
        run: (c) => { for (let i = 0; i < 2; i++) { if (!c.t.alive) break; const r = c.hit(c.t, { atk: 0.62 }); c.debuff(c.t, 'bleed', 2, 0.6); c.heal(c.self, r.dmg * 0.2); } } },
      { slot: 's2', form: 'base', name: 'Scent of Blood', cd: 2, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'spear', desc: '[Huntress] Attacks and inflicts Target for 2 turns (85% chance).', enhance: E.cd,
        run: (c) => { c.hit(c.t, { atk: 1.2 }); c.debuff(c.t, 'mark', 2, 0.85); } },
      { slot: 's2', form: 'feral', name: 'Pounce', cd: 2, souls: 1, target: 'enemy', anim: 'dash', vfx: 'claw_big', desc: '[Feral] Attacks; damage +12% per Bleed on the target. Grants an extra turn if the target dies.', enhance: E.cd,
        run: (c) => { const r = c.hit(c.t, { atk: 1.35, mult: 1 + 0.12 * c.t.count('bleed') }); if (r.killed) c.extraTurn(); } },
      { slot: 's3', name: 'Moonlit Shift', cd: 4, souls: 2, target: 'self', anim: 'ult', vfx: 'moon_shift', desc: 'Switches form. Entering Feral: Greater Attack for 3 turns, Increased Speed for 2 turns, heals 20% of max Health. Returning to Huntress: removes all debuffs and gains a Barrier of 20% max Health for 2 turns. Resets the second skill\'s cooldown.', enhance: E.cdOnly,
        run: (c) => {
          if (c.self.form === 'feral') { c.form('base'); c.showStacks('feral', 0); c.cleanse(c.self, 99); c.barrier(c.self, c.maxHp() * 0.2, 2); }
          else { c.form('feral'); c.state(c.self, 'feral', 99); c.buff(c.self, 'atk_up_g', 3); c.buff(c.self, 'spd_up', 2); c.heal(c.self, c.maxHp() * 0.2); }
          c.self.cd.s2 = 0;
        } },
    ],
    lore: 'Fenra hunts with a spear by day and without one by night. The Elderwood has learned not to ask which Fenra is coming when it hears her.',
    quote: 'Run. It\'s more fun when you run.',
    look: { body: 'tall', feminine: true, skin: '#b88a68', hair: { style: 'wild', color: '#e8e0d0' }, outfit: { primary: '#4a3a2a', secondary: '#8aaa5a', accent: '#d84a3a', style: 'leather' }, weapon: 'spear', head: 'ears', back: 'tail', eyes: '#ffd24a', aura: '#8aff6a' },
  },
  {
    id: 'myco', name: 'Myco', title: 'the Sporeking', rarity: 4, element: 'verdant', cls: 'mage', throne: 'wildroot', role: 'debuffer',
    archetypes: ['DoT Rot'],
    tagline: 'Poison everywhere; when the poisoned die, the spores spread.',
    base: stats('mage', 4, { eff: 0.2, hp: 1.05 }),
    imprint: imprint('concentration', 'eff'),
    skills: [
      { slot: 's1', name: 'Spore Puff', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'poison', desc: 'Attacks with a 75% chance to inflict Poison for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'poison', 2, 0.75); } },
      { slot: 's2', name: 'Mycelial Net', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'When a Poisoned enemy dies, all other enemies are Poisoned for 2 turns (cannot be resisted).', enhance: [] },
      { slot: 's3', name: 'Rot Garden', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'poison_big', desc: 'Attacks all enemies, inflicting 2 Poison stacks (85% chance each) and Unhealable (60% chance), all for 2 turns.', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.85 }); c.debuffAll('poison', 2, 0.85); c.debuffAll('poison', 2, 0.85); c.debuffAll('unhealable', 2, 0.6); } },
    ],
    hooks: {
      onEnemyDeath: (h, enemy) => {
        if (enemy.diedWith.includes('poison')) { h.text('Mycelial Net', '#9aff5a', enemy); for (const e of h.enemies()) h.debuff(e, 'poison', 2, 1, { unres: true }); }
      },
    },
    lore: 'Myco is a colony of nine hundred mushrooms who agreed on a single king. The king is also a mushroom. It\'s complicated.',
    quote: 'We are many. You are... compost.',
    look: { body: 'small', skin: '#c8b8a8', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#5a3a5a', secondary: '#c8a8d8', accent: '#9aff5a', style: 'robe' }, weapon: 'staff', head: 'hat', eyes: '#9aff5a', aura: '#b8ff7a' },
  },
  {
    id: 'pip', name: 'Pip', title: 'Thistlewhisk', rarity: 3, element: 'verdant', cls: 'thief', throne: 'wildroot', role: 'support',
    archetypes: ['Cleave'],
    tagline: 'Tiny team pusher: +15% CR for all allies.',
    base: stats('thief', 3, { spd: 118 }),
    imprint: imprint('release', 'spd'),
    skills: [
      { slot: 's1', name: 'Thistle Jab', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'leaf', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Scamper', cd: 3, souls: 1, target: 'allAllies', anim: 'buff', vfx: 'wind', desc: 'Increases all other allies\' Combat Readiness by 15%.', enhance: E.cdOnly,
        run: (c) => { for (const a of c.others()) c.cr(a, 15); } },
      { slot: 's3', name: 'Prickle Rush', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'thorns', desc: 'Attacks with a 50% chance to Decrease Hit Chance for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.5 }); c.debuff(c.t, 'hit_down', 1, 0.5); } },
    ],
    lore: 'Pip is a hedgehog-kin courier who has never delivered a letter late, though several have arrived slightly punctured.',
    quote: 'Coming through! Sorry! Coming through!',
    look: { body: 'small', skin: '#d8b898', hair: { style: 'spiky', color: '#8a6a4a' }, outfit: { primary: '#6a8a3a', secondary: '#e8d8a8', accent: '#d84a6a', style: 'tunic' }, weapon: 'dagger', head: 'ears', eyes: '#2a2a2a', aura: '#c8ff8a' },
  },
  {
    id: 'oakhart', name: 'Oakhart', title: 'the Elder', rarity: 3, element: 'verdant', cls: 'knight', throne: 'wildroot', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Old oak: +15% Health and a single-target Provoke.',
    base: stats('knight', 3, { hp: 1.1 }),
    imprint: imprint('release', 'hp'),
    skills: [
      { slot: 's1', name: 'Branch Swing', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'earth_smash', desc: 'Attacks with damage proportional to max Health.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 0.45, hp: 0.065 }); } },
      { slot: 's2', name: 'Heartwood', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Max Health +15%.', enhance: [] },
      { slot: 's3', name: 'Elder\'s Rebuke', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'thorns', desc: 'Attacks and Provokes the target for 2 turns (100% chance), then gains a Barrier of 25% max Health for 2 turns.', enhance: E.cd,
        run: (c) => { c.hit(c.t, { atk: 0.5, hp: 0.08 }); c.debuff(c.t, 'provoke', 2, 1); c.barrier(c.self, c.maxHp() * 0.25, 2); } },
    ],
    hooks: { stats: () => ({ hp: 0.15 }) },
    lore: 'Oakhart is an oak. He is also a knight. These two facts have never once been in conflict.',
    quote: 'Patience is a kind of armor.',
    look: { body: 'giant', skin: '#8a6a4a', hair: { style: 'wild', color: '#5a8a3a' }, outfit: { primary: '#6a5a3a', secondary: '#8aaa5a', accent: '#c8a86a', style: 'plate' }, weapon: 'shield', head: 'antlers', eyes: '#c8ff6a', aura: '#8aaa5a' },
  },
  {
    id: 'silvana', name: 'Silvana', title: 'Thornbow', rarity: 4, element: 'verdant', cls: 'ranger', throne: 'wildroot', role: 'dps',
    archetypes: ['DoT Rot', 'Cleave'],
    tagline: 'Piercing shots that hit the Vanguard and the one behind.',
    base: stats('ranger', 4, { spd: 110 }),
    imprint: imprint('concentration', 'cc'),
    skills: [
      { slot: 's1', name: 'Thorn Shot', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'arrow_leaf', desc: 'Attacks with a 50% chance to inflict Bleed for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'bleed', 2, 0.5); } },
      { slot: 's2', name: 'Pinning Shot', cd: 3, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'arrow_big', desc: 'Pierce: attacks the target and the enemy behind it (50% damage), each with a 60% chance to Decrease Speed for 2 turns.', enhance: E.chance,
        run: (c) => { const hs = c.pierce(c.t, { atk: 1.2 }); void hs; c.debuff(c.t, 'spd_down', 2, 0.6); const bh = c.b.behind(c.t); if (bh) c.debuff(bh, 'spd_down', 2, 0.6); } },
      { slot: 's3', name: 'Briar Storm', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'arrow_rain', desc: 'Attacks all enemies with a 60% chance to inflict Bleed for 2 turns. Damage +10% per debuff on each target.', enhance: E.cd,
        run: (c) => { for (const e of c.enemies()) { c.hit(e, { atk: 1.0, aoe: true, mult: 1 + 0.1 * e.debuffs().length }); c.debuff(e, 'bleed', 2, 0.6); } } },
    ],
    lore: 'Silvana grows her arrows. They take a month to ripen. She will tell you that a month is a very short time.',
    quote: 'One arrow, two lessons.',
    look: { body: 'slim', feminine: true, skin: '#d8b898', hair: { style: 'ponytail', color: '#8a4a2a' }, outfit: { primary: '#3a5a2a', secondary: '#c8d8a8', accent: '#d8a84a', style: 'leather' }, weapon: 'bow', head: 'hood', back: 'quiver', eyes: '#6aaa3a', aura: '#8aff6a' },
  },
  {
    id: 'hesk', name: 'Bramblewitch Hesk', title: 'Weaver of Fates', rarity: 5, element: 'verdant', cls: 'mage', throne: 'wildroot', role: 'anomaly',
    archetypes: ['DoT Rot', 'Cleave'],
    tagline: 'Binds enemies with Fate Threads — every snapped thread bleeds them.',
    base: stats('mage', 5, { spd: 108, eff: 0.2 }),
    imprint: imprint('concentration', 'eff'),
    skills: [
      { slot: 's1', name: 'Thorn Hex', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'thorns', desc: 'Attacks the enemy. Deals 25% more damage to targets bound by a Fate Thread.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0, mult: c.t.has('link') ? 1.25 : 1 }); } },
      { slot: 's2', name: 'Fate Weave', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'threads', desc: 'Attacks all enemies and binds them with a Fate Thread for 2 turns (85% chance each). Threaded enemies share 30% of damage taken. Whenever one of Hesk\'s threads is broken (dispel, death, or Snip), the unit takes damage equal to 60% of Hesk\'s Attack and Hesk gains 5% Combat Readiness.', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.6 }); c.link(c.enemies(), 2, 0.85); } },
      { slot: 's3', name: 'Snip', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'snip', desc: 'Cuts every Fate Thread on the enemy team (each triggers its break effect), then attacks the target. Damage +20% per thread cut.', enhance: E.cd,
        run: (c) => {
          let n = 0;
          for (const e of c.enemies()) { const l = e.get('link'); if (l) { c.b.removeInst(e, l, 'snip'); n++; } }
          if (c.t.alive) c.hit(c.t, { atk: 1.5, mult: 1 + 0.2 * n });
        } },
    ],
    hooks: {
      onLinkBroken: (h, u) => { if (u.alive) h.trueDmg(u, h.atk() * 0.6, 'snap'); h.cr(h.self, 5); },
    },
    lore: 'Hesk spins thread out of brambles and fate out of thread. She has been asked many times to cut someone\'s fate short. She always charges extra for the scissors.',
    quote: 'Everyone\'s connected, darling. Some of you just don\'t know it yet.',
    look: { body: 'slim', feminine: true, skin: '#b8c8a8', hair: { style: 'wild', color: '#2a3a2a' }, outfit: { primary: '#2a3a2a', secondary: '#8a5a8a', accent: '#d8ff8a', style: 'dress' }, weapon: 'whip', head: 'hat', back: 'orbs', eyes: '#d8ff8a', aura: '#b8ff6a' },
  },
];
