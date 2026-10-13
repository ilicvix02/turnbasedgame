// EMBERFORGE — the dragon-forges of Cindermount.
import type { HeroDef } from '../../engine/types';
import { E, imprint, stats } from '../kit';

export const EMBERFORGE: HeroDef[] = [
  {
    id: 'ignara', name: 'Ignara', title: 'Pyreheart', rarity: 5, element: 'flame', cls: 'mage', throne: 'emberforge', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'The premier cleaver: breaks armor, burns, and chains extra turns on kills.',
    base: stats('mage', 5, { spd: 112, atk: 1.03 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Cinder Lance', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'fire_bolt', desc: 'Attacks with a 50% chance to inflict Burn for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'burn', 1, 0.5); } },
      { slot: 's2', name: 'Ashen Wind', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'fire_wave', desc: 'Attacks all enemies with a 65% chance to Decrease Defense for 2 turns.', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.85 }); c.debuffAll('def_down', 2, 0.65); } },
      { slot: 's3', name: 'Pyre of Kings', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'fire_big', desc: 'Attacks all enemies. Damage +10% for each debuff on the target. If any enemy is defeated, grants an extra turn (once per battle cycle: not after another extra turn).', enhance: E.cd,
        soulburn: { cost: 20, desc: 'Damage +30%.' },
        run: (c) => {
          let kill = false;
          for (const e of c.enemies()) { const r = c.hit(e, { atk: 1.15, aoe: true, mult: (1 + 0.1 * e.debuffs().length) * (c.sb ? 1.3 : 1) }); if (r.killed) kill = true; }
          if (kill && !c.get('pyreChain')) { c.set('pyreChain', 1); c.extraTurn(); } else c.set('pyreChain', 0);
        } },
    ],
    lore: 'Ignara was born in the heart of the great forge and has the bad habit of trying to go back in.',
    quote: 'Kneel to the fire. It\'s warmer down there.',
    look: { body: 'slim', feminine: true, skin: '#f0c8a8', hair: { style: 'wild', color: '#ff5a1a' }, outfit: { primary: '#2a1410', secondary: '#ff7a2a', accent: '#ffd24a', style: 'dress' }, weapon: 'staff', head: 'horns', back: 'wings', eyes: '#ffd24a', aura: '#ff7a2a' },
  },
  {
    id: 'brakka', name: 'Brakka', title: 'Forgefist', rarity: 4, element: 'flame', cls: 'warrior', throne: 'emberforge', role: 'dps',
    archetypes: ['DoT Rot'],
    tagline: 'Stacks Burns, then quenches them all at once.',
    base: stats('warrior', 4, { hp: 1.05 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Anvil Punch', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_smash', desc: 'Attacks with a 60% chance to inflict Burn for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'burn', 2, 0.6); } },
      { slot: 's2', name: 'Bellows', cd: 3, souls: 1, target: 'allEnemies', anim: 'spin', vfx: 'fire_wave', desc: 'Attacks all enemies with a 50% chance to inflict Burn for 2 turns.', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.85 }); c.debuffAll('burn', 2, 0.5); } },
      { slot: 's3', name: 'Quench', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'steam', desc: 'Attacks the enemy, then detonates all of their Burns.', enhance: E.cd,
        run: (c) => { c.hit(c.t, { atk: 1.3 }); if (c.t.alive) c.detonate(c.t, 'burn', 1); } },
    ],
    lore: 'Brakka quit smithing when she realized she could just punch the metal into shape.',
    quote: 'Hot. Hotter. Done.',
    look: { body: 'broad', feminine: true, skin: '#b8754f', hair: { style: 'mohawk', color: '#ff7a2a' }, outfit: { primary: '#5a3a2a', secondary: '#c0c0c0', accent: '#ff7a2a', style: 'leather' }, weapon: 'gauntlet', head: 'goggles', eyes: '#ffb24a', aura: '#ff7a2a' },
  },
  {
    id: 'solenne', name: 'Solenne', title: 'Cinderhalo', rarity: 5, element: 'flame', cls: 'soulweaver', throne: 'emberforge', role: 'support',
    archetypes: ['DoT Rot', 'Cleave', 'Dominion Control'],
    tagline: 'Crowns the battlefield in Inferno: longer debuffs and +15% damage.',
    base: stats('soulweaver', 5, { spd: 112, atk: 1.15 }),
    imprint: imprint('release', 'atk'),
    skills: [
      { slot: 's1', name: 'Ember Psalm', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'fire_bolt', desc: 'Attacks the enemy and increases the Combat Readiness of the ally with the highest Attack by 10%.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); const a = c.highest(c.others(), 'atk'); if (a) c.cr(a, 10); } },
      { slot: 's2', name: 'Kindled Hearts', cd: 3, souls: 1, target: 'allAllies', anim: 'buff', vfx: 'fire_buff', desc: 'Grants all allies Greater Attack for 2 turns and heals them by 10% of the caster\'s max Health.', enhance: E.cdOnly,
        run: (c) => { for (const a of c.allies()) { c.buff(a, 'atk_up_g', 2); c.heal(a, c.maxHp() * 0.1); } } },
      { slot: 's3', name: 'Inferno Crown', cd: 6, souls: 3, target: 'allAllies', anim: 'ult', vfx: 'inferno', desc: 'Creates the Dominion "Inferno Crown" for 3 turns (debuffs last +1 turn; allies deal +15% damage) and increases all allies\' Combat Readiness by 20%.', enhance: E.cdOnly,
        run: (c) => { c.field('inferno', 3); for (const a of c.allies()) c.cr(a, 20); } },
    ],
    lore: 'Solenne\'s halo is a ring of cinders that never cools. The smiths of Cindermount temper their best blades by holding them near her while she prays.',
    quote: 'Burn bright. Burn together.',
    look: { body: 'slim', feminine: true, skin: '#f3d0b0', hair: { style: 'long', color: '#ffb24a' }, outfit: { primary: '#fff0e0', secondary: '#ff7a2a', accent: '#c0302a', style: 'robe' }, weapon: 'fan', head: 'halo', back: 'wings', eyes: '#ff5a2a', aura: '#ffb24a' },
  },
  {
    id: 'vulkar', name: 'Vulkar', title: 'the Anvil', rarity: 5, element: 'verdant', cls: 'knight', throne: 'emberforge', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Living mountain. Every crit against him gets an answer.',
    base: stats('knight', 5, { def: 1.05, hp: 1.0, spd: 98 }),
    imprint: imprint('concentration', 'def'),
    skills: [
      { slot: 's1', name: 'Magma Knuckle', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'earth_smash', desc: 'Attacks with damage proportional to Defense. When used as a counterattack, deals 25% more damage and grants the caster a Barrier equal to 8% of max Health for 1 turn.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 0.4, def: 1.1, mult: c.isCounter ? 1.25 : 1 }); if (c.isCounter) c.barrier(c.self, c.maxHp() * 0.08, 1); } },
      { slot: 's2', name: 'Living Forge', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'When attacked, has a 20% chance to counterattack; always counterattacks when hit by a critical hit (once per turn).', enhance: [] },
      { slot: 's3', name: 'Mountain\'s Vow', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'earth_wave', desc: 'Grants the caster Counterattack for 1 turn and Increased Defense for 2 turns, then has a 70% chance to Provoke all enemies for 1 turn.', enhance: E.chance,
        run: (c) => { c.buff(c.self, 'counter', 1); c.buff(c.self, 'def_up', 2); c.debuffAll('provoke', 1, 0.7); } },
    ],
    hooks: {
      onAttacked: (h, att, info) => {
        if (info.isCounter || info.isDot || !att.alive) return;
        if ((info.type === 'crit' || h.chance(0.2)) && h.once('forge')) h.react('counter', att);
      },
    },
    lore: 'Vulkar was the anvil before he was a man. A god struck him ten thousand times to forge the first sword, and on the last blow he hit back.',
    quote: 'Again.',
    look: { body: 'giant', skin: '#7a5a4a', hair: { style: 'bald', color: '#000' }, outfit: { primary: '#4a3a2a', secondary: '#ff7a2a', accent: '#5a8a3a', style: 'plate' }, weapon: 'gauntlet', head: 'horns', eyes: '#ff9a3a', aura: '#ff9a3a' },
  },
  {
    id: 'rexa', name: 'Rexa', title: 'Ashfang', rarity: 4, element: 'flame', cls: 'thief', throne: 'emberforge', role: 'dps',
    archetypes: ['DoT Rot', 'Cleave'],
    tagline: 'Multi-hit Bleeder that speeds up against bleeding prey.',
    base: stats('thief', 4, { spd: 120 }),
    imprint: imprint('concentration', 'spd'),
    skills: [
      { slot: 's1', name: 'Twin Fang', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'claw', desc: 'Attacks twice, each with a 35% chance to inflict Bleed for 2 turns.', enhance: E.mix,
        run: (c) => { for (let i = 0; i < 2; i++) { if (!c.t.alive) break; c.hit(c.t, { atk: 0.55 }); c.debuff(c.t, 'bleed', 2, 0.35); } } },
      { slot: 's2', name: 'Hunter\'s Rhythm', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'After attacking a Bleeding enemy, Combat Readiness +12% (once per turn).', enhance: [] },
      { slot: 's3', name: 'Ash Frenzy', cd: 3, souls: 2, target: 'allEnemies', anim: 'spin', vfx: 'claw_big', desc: 'Attacks random enemies 4 times, each with a 50% chance to inflict Bleed for 2 turns.', enhance: E.cd,
        run: (c) => { for (let i = 0; i < 4; i++) { const es = c.enemies().filter((e) => !e.has('imprison')); if (!es.length) break; const t = c.random(es)[0]; c.hit(t, { atk: 0.42, aoe: true }); c.debuff(t, 'bleed', 2, 0.5); } } },
    ],
    hooks: {
      onHit: (h, t, info) => { if (!info.isDot && t.has('bleed') && h.once('rhythm')) h.cr(h.self, 12); },
    },
    lore: 'Rexa runs messages between the forges, which in Cindermount means sprinting across lava. She bites people who suggest bridges.',
    quote: 'Too slow, too slow, too SLOW!',
    look: { body: 'small', feminine: true, skin: '#d89a70', hair: { style: 'spiky', color: '#2a1a1a' }, outfit: { primary: '#3a2a2a', secondary: '#ff5a2a', accent: '#ffe04a', style: 'bodysuit' }, weapon: 'claws', head: 'ears', back: 'tail', eyes: '#ffe04a', aura: '#ff5a2a' },
  },
  {
    id: 'tobin', name: 'Tobin', title: 'Sparkwright', rarity: 3, element: 'flame', cls: 'ranger', throne: 'emberforge', role: 'dps',
    archetypes: ['DoT Rot'],
    tagline: 'Fireworks engineer: easy Burns for new players.',
    base: stats('ranger', 3),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Spark Bolt', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'spark', desc: 'Attacks the enemy.', enhance: E.dmg, run: (c) => { c.hit(c.t, { atk: 1.0 }); } },
      { slot: 's2', name: 'Firecracker', cd: 2, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'fire_bolt', desc: 'Attacks with a 60% chance to inflict Burn for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.1 }); c.debuff(c.t, 'burn', 2, 0.6); } },
      { slot: 's3', name: 'Big Boom', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'explosion', desc: 'Attacks all enemies with a 40% chance to inflict Burn for 1 turn.', enhance: E.cd,
        run: (c) => { c.hitAll({ atk: 0.9 }); c.debuffAll('burn', 1, 0.4); } },
    ],
    lore: 'Tobin\'s workshop has exploded eleven times. He considers ten of them successes.',
    quote: 'Stand back! No, further. Further!',
    look: { body: 'small', skin: '#f0c8a0', hair: { style: 'wild', color: '#ff9a3a' }, outfit: { primary: '#6a4a2a', secondary: '#ffcc6a', accent: '#ff5a2a', style: 'tunic' }, weapon: 'gun', head: 'goggles', eyes: '#3a6aff', aura: '#ffcc6a' },
  },
  {
    id: 'odda', name: 'Hearth-Mother Odda', title: 'of Cindermount', rarity: 3, element: 'flame', cls: 'soulweaver', throne: 'emberforge', role: 'healer',
    archetypes: ['Cleave', 'Revive Sustain'],
    tagline: 'Team Attack buffer and comfort healer.',
    base: stats('soulweaver', 3, { hp: 1.06 }),
    imprint: imprint('release', 'atk'),
    skills: [
      { slot: 's1', name: 'Warm Ladle', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_smash', desc: 'Attacks the enemy and heals the ally with the lowest Health by 5% of the caster\'s max Health.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 0.85 }); const a = c.lowestHp(c.allies()); if (a) c.heal(a, c.maxHp() * 0.05); } },
      { slot: 's2', name: 'Hearthsong', cd: 3, souls: 1, target: 'allAllies', anim: 'buff', vfx: 'fire_buff', desc: 'Grants all allies Increased Attack for 2 turns.', enhance: E.cdOnly,
        run: (c) => { c.buffAll('atk_up', 2); } },
      { slot: 's3', name: 'Feast', cd: 4, souls: 2, target: 'allAllies', anim: 'heal', vfx: 'heal_big', desc: 'Heals all allies by 16% of the caster\'s max Health and removes 1 debuff from each.', enhance: E.heal,
        run: (c) => { for (const a of c.allies()) { c.heal(a, c.maxHp() * 0.16); c.cleanse(a, 1); } } },
    ],
    lore: 'Odda has fed every smith in Cindermount for forty years. They are more afraid of her ladle than of dragons.',
    quote: 'Eat first. Then you can be brave.',
    look: { body: 'broad', feminine: true, skin: '#e0a880', hair: { style: 'braid', color: '#d8d0c8' }, outfit: { primary: '#8a3a2a', secondary: '#f0e0c0', accent: '#ffb24a', style: 'dress' }, weapon: 'lantern', head: 'veil', eyes: '#6a3a2a', aura: '#ffb24a' },
  },
  {
    id: 'drakon', name: 'Drakon', title: 'Emberwake', rarity: 5, element: 'flame', cls: 'ranger', throne: 'emberforge', role: 'dps',
    archetypes: ['Bruiser Counter', 'Cleave'],
    tagline: 'Tank-buster: deals bonus damage from the target\'s max Health.',
    base: stats('ranger', 5, { atk: 1.02, spd: 107 }),
    imprint: imprint('concentration', 'cd'),
    skills: [
      { slot: 's1', name: 'Wyrmshot', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'fire_arrow', desc: 'Attacks the enemy with bonus damage equal to 3% of the target\'s max Health.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 0.9, tgtHp: c.t.boss ? 0.006 : 0.03 }); } },
      { slot: 's2', name: 'Dragonblood', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Critical Hit Chance +25% when attacking enemies above 50% Health.', enhance: [] },
      { slot: 's3', name: 'Emberwake Volley', cd: 4, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'fire_rain', desc: 'Attacks all enemies with bonus damage equal to 5% of each target\'s max Health. Critical Hit Damage +20% for this skill.', enhance: E.cd,
        run: (c) => { for (const e of c.enemies()) c.hit(e, { atk: 0.95, tgtHp: e.boss ? 0.01 : 0.05, aoe: true, cdBonus: 0.2, ccBonus: c.hpPct(e) > 0.5 ? 0.25 : 0 }); } },
    ],
    hooks: {},
    lore: 'Drakon is half dragon on his mother\'s side, which in his family is the side that gets to keep the hoard.',
    quote: 'The bigger they are, the more there is to burn.',
    look: { body: 'tall', skin: '#c88a6a', hair: { style: 'spiky', color: '#c02a1a' }, outfit: { primary: '#5a1a1a', secondary: '#d8a04a', accent: '#ff5a2a', style: 'leather' }, weapon: 'bow', head: 'horns', back: 'tail', eyes: '#ffb02a', aura: '#ff5a2a' },
  },
];

// Drakon's passive is applied through his attacks (ccBonus) — S1 also benefits:
const drakon = EMBERFORGE.find((h) => h.id === 'drakon')!;
drakon.skills[0].run = (c) => { c.hit(c.t, { atk: 0.9, tgtHp: c.t.boss ? 0.006 : 0.03, ccBonus: c.hpPct(c.t) > 0.5 ? 0.25 : 0 }); };
