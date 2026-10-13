// UMBRAL COURT — the moonless aristocracy of Nethermarch.
import type { HeroDef } from '../../engine/types';
import { registerStatus } from '../../engine/statuses';
import { E, imprint, stats } from '../kit';

registerStatus({ id: 'thirst', name: 'Thirst', kind: 'state', icon: 'blood', sticky: true, desc: 'Thirst stacks: damage dealt +8% each (max 5). Gained when enemies are healed.' });

export const UMBRAL: HeroDef[] = [
  {
    id: 'nocturne', name: 'Nocturne Vael', title: 'Blood Sovereign', rarity: 5, element: 'umbral', cls: 'warrior', throne: 'umbral', role: 'dps',
    archetypes: ['DoT Rot', 'Dominion Control'],
    tagline: 'Turns the enemy\'s healing into Thirst — and under Bloodmoon, into wounds.',
    base: stats('warrior', 5, { atk: 1.04, hp: 1.03, spd: 108 }),
    imprint: imprint('concentration', 'atk'),
    skills: [
      { slot: 's1', name: 'Crimson Rend', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'blood_slash', desc: 'Attacks with a 65% chance to inflict Bleed for 2 turns and recovers Health equal to 25% of damage dealt.', enhance: E.mix,
        run: (c) => { const r = c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'bleed', 2, 0.65); c.heal(c.self, r.dmg * 0.25); } },
      { slot: 's2', name: 'Sovereign\'s Thirst', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Whenever an enemy is healed, gains 1 Thirst (max 5). Each Thirst increases damage dealt by 8%. When an enemy dies, recovers 20% of max Health.', enhance: [] },
      { slot: 's3', name: 'Bloodmoon Ascension', cd: 5, souls: 3, target: 'allEnemies', anim: 'ult', vfx: 'bloodmoon', desc: 'Creates the Dominion "Bloodmoon" for 3 turns (enemy healing becomes damage, damage +10%), then attacks all enemies with a 75% chance to inflict Unhealable for 2 turns.', enhance: E.cd,
        soulburn: { cost: 20, desc: 'Bloodmoon lasts 4 turns and Unhealable cannot be resisted.' },
        run: (c) => { c.field('bloodmoon', c.sb ? 4 : 3); c.hitAll({ atk: 1.25 }); for (const e of c.enemies()) c.debuff(e, 'unhealable', 2, 0.75, { unres: c.sb }); } },
    ],
    hooks: {
      dmgOut: (u) => 1 + 0.08 * (u.data.thirst || 0),
      onEnemyHealed: (h) => { const n = h.add('thirst', 1, 5); h.showStacks('thirst', n); },
      onEnemyDeath: (h) => h.heal(h.self, h.maxHp() * 0.2),
    },
    lore: 'Nocturne has ruled the Umbral Court for three hundred years by a simple law: anything that grows back belongs to the crown. That includes flesh.',
    quote: 'Heal. Please. I\'m so very thirsty.',
    look: { body: 'tall', skin: '#e6d6d6', hair: { style: 'long', color: '#e8e8f0' }, outfit: { primary: '#3a0d1a', secondary: '#121018', accent: '#ff2b48', style: 'coat' }, weapon: 'sword', head: 'crown', back: 'cape', eyes: '#ff2b48', aura: '#ff2b48' },
  },
  {
    id: 'mordessa', name: 'Mordessa', title: 'the Hollow Queen', rarity: 5, element: 'umbral', cls: 'mage', throne: 'umbral', role: 'debuffer',
    archetypes: ['DoT Rot'],
    tagline: 'Curses and Dooms; her ultimate makes the dead stay dead.',
    base: stats('mage', 5, { spd: 106, eff: 0.2 }),
    imprint: imprint('concentration', 'eff'),
    skills: [
      { slot: 's1', name: 'Hollow Bolt', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'dark_bolt', desc: 'Attacks with a 60% chance to inflict Curse for 2 turns. Enemies defeated by Mordessa gain Extinction (cannot be revived).', enhance: E.mix,
        run: (c) => { const r = c.hit(c.t, { atk: 1.0 }); if (r.killed) c.b.applyStatus(c.self, c.t, 'extinction', 99, { unres: true }); c.debuff(c.t, 'curse', 2, 0.6); } },
      { slot: 's2', name: 'Requiem', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'dark_wave', desc: 'Attacks all enemies with a 65% chance to inflict Doom for 2 turns (on natural expiry: damage equal to 30% of max Health).', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.85 }); c.debuffAll('doom', 2, 0.65); } },
      { slot: 's3', name: 'Crown of Ash', cd: 5, souls: 3, target: 'allEnemies', anim: 'ult', vfx: 'dark_big', desc: 'Triggers every Curse on the enemy team, then attacks all enemies. Enemies defeated by this skill gain Extinction (cannot be revived).', enhance: E.cd,
        run: (c) => {
          for (const e of c.enemies()) { const cu = e.get('curse'); if (cu) { c.b.removeInst(e, cu, 'trigger'); c.trueDmg(e, cu.value * 0.5, 'curse'); } }
          for (const e of c.enemies()) {
            const r = c.hit(e, { atk: 1.25, aoe: true });
            if (r.killed) c.b.applyStatus(c.self, e, 'extinction', 99, { unres: true });
          }
        } },
    ],
    hooks: {},
    lore: 'Mordessa wears a crown of ash from a kingdom she has never named. Every king she burns adds a little to it. It is very heavy now.',
    quote: 'Stay down. Stay gone.',
    look: { body: 'slim', feminine: true, skin: '#d7d0e6', hair: { style: 'flowing', color: '#120f1c' }, outfit: { primary: '#120f1c', secondary: '#5e4b8b', accent: '#bba7ff', style: 'dress' }, weapon: 'staff', head: 'crown', back: 'demon', eyes: '#bba7ff', aura: '#7b5cff' },
  },
  {
    id: 'kaz', name: 'Kaz', title: 'Shroudstep', rarity: 4, element: 'umbral', cls: 'thief', throne: 'umbral', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'Executioner who vanishes after every kill.',
    base: stats('thief', 4, { spd: 119 }),
    imprint: imprint('concentration', 'cc'),
    skills: [
      { slot: 's1', name: 'Shiv', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'dark_slash', desc: 'Attacks the enemy. Deals 30% more damage if the target is below 50% Health.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 1.0, mult: c.hpPct(c.t) < 0.5 ? 1.3 : 1 }); } },
      { slot: 's2', name: 'Shroud', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Gains Stealth for 1 turn at the start of battle. When an enemy dies, gains Stealth for 1 turn and +20% Combat Readiness.', enhance: [] },
      { slot: 's3', name: 'Throatcut', cd: 3, souls: 2, target: 'enemy', anim: 'ult', vfx: 'dark_big', desc: 'Attacks the enemy; damage increases the lower the target\'s Health (up to +100%). Grants an extra turn when the target is defeated.', enhance: E.cd,
        soulburn: { cost: 10, desc: 'Ignores 50% of Defense.' },
        run: (c) => { const r = c.hit(c.t, { atk: 1.45, mult: 2 - c.hpPct(c.t), pen: c.sb ? 0.5 : 0 }); if (r.killed) c.extraTurn(); } },
    ],
    hooks: {
      onBattleStart: (h) => { h.buff(h.self, 'stealth', 1); },
      onEnemyDeath: (h) => { h.buff(h.self, 'stealth', 1); h.cr(h.self, 20); },
    },
    lore: 'Kaz was raised in the walls of the Umbral palace and has never once used a door.',
    quote: 'You blinked.',
    look: { body: 'slim', skin: '#c7b8a8', hair: { style: 'spiky', color: '#2a2a3a' }, outfit: { primary: '#1c1b26', secondary: '#3c3a52', accent: '#9a8cff', style: 'leather' }, weapon: 'dagger', head: 'mask', back: 'scarf', eyes: '#9a8cff', aura: '#5a4cff' },
  },
  {
    id: 'lilith', name: 'Lilith', title: 'Gloamveil', rarity: 4, element: 'umbral', cls: 'soulweaver', throne: 'umbral', role: 'healer',
    archetypes: ['DoT Rot', 'Revive Sustain'],
    tagline: 'Heals her team from every debuff on the enemy.',
    base: stats('soulweaver', 4, { spd: 107, eff: 0.15 }),
    imprint: imprint('release', 'eff'),
    skills: [
      { slot: 's1', name: 'Gloam Touch', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'dark_bolt', desc: 'Attacks with a 65% chance to Decrease Attack for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 0.9 }); c.debuff(c.t, 'atk_down', 1, 0.65); } },
      { slot: 's2', name: 'Leech Veil', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'dark_wave', desc: 'Has a 60% chance to inflict Unhealable on all enemies for 2 turns. Then heals all allies by 3% of the caster\'s max Health for every debuff on the enemy team (max 30%).', enhance: E.chance,
        run: (c) => {
          c.debuffAll('unhealable', 2, 0.6);
          const n = c.enemies().reduce((s, e) => s + e.debuffs().length, 0);
          c.healAll(c.maxHp() * Math.min(0.3, 0.03 * n));
        } },
      { slot: 's3', name: 'Night Nurse', cd: 4, souls: 2, target: 'allAllies', anim: 'heal', vfx: 'dark_heal', desc: 'Heals all allies by 18% of the caster\'s max Health and grants Vampirism for 2 turns.', enhance: E.heal,
        run: (c) => { for (const a of c.allies()) { c.heal(a, c.maxHp() * 0.18); c.buff(a, 'vamp', 2); } } },
    ],
    lore: 'Lilith runs the night hospital of Nethermarch. Patients pay in blood, of course — just never their own.',
    quote: 'Your pain is someone else\'s medicine.',
    look: { body: 'slim', feminine: true, skin: '#e9dbe6', hair: { style: 'twin', color: '#5c1a3a' }, outfit: { primary: '#2a1424', secondary: '#f0e6ef', accent: '#c4285a', style: 'dress' }, weapon: 'lantern', head: 'veil', eyes: '#c4285a', aura: '#c4285a' },
  },
  {
    id: 'vesper', name: 'Vesper', title: 'Nightlace', rarity: 3, element: 'umbral', cls: 'ranger', throne: 'umbral', role: 'dps',
    archetypes: ['Cleave'],
    tagline: 'Marks targets for the team, then pins them.',
    base: stats('ranger', 3),
    imprint: imprint('concentration', 'cc'),
    skills: [
      { slot: 's1', name: 'Barbed Shot', cd: 0, souls: 1, target: 'enemy', anim: 'ranged', vfx: 'arrow_dark', desc: 'Attacks with a 40% chance to inflict Target for 1 turn.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'mark', 1, 0.4); } },
      { slot: 's2', name: 'Twilight Volley', cd: 3, souls: 1, target: 'allEnemies', anim: 'ranged', vfx: 'arrow_rain', desc: 'Attacks all enemies.', enhance: E.cd, run: (c) => { c.hitAll({ atk: 0.75 }); } },
      { slot: 's3', name: 'Nightpin', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'arrow_big', desc: 'Attacks the enemy, ignoring 30% of Defense. Critical Hit Chance +30% against Targeted enemies.', enhance: E.cd,
        run: (c) => { c.hit(c.t, { atk: 1.7, pen: 0.3, ccBonus: c.t.has('mark') ? 0.3 : 0 }); } },
    ],
    lore: 'Vesper sews her bowstrings from spider silk harvested under a new moon. She will tell you the spiders volunteered.',
    quote: 'Hold still. This one\'s for keeps.',
    look: { body: 'slim', feminine: true, skin: '#d9c9e0', hair: { style: 'ponytail', color: '#3a2a5a' }, outfit: { primary: '#2b2140', secondary: '#7a64b0', accent: '#d8c8ff', style: 'leather' }, weapon: 'bow', head: 'hood', back: 'quiver', eyes: '#d8c8ff', aura: '#8a6cff' },
  },
  {
    id: 'grimmald', name: 'Grimmald', title: 'Bonewright', rarity: 3, element: 'verdant', cls: 'mage', throne: 'umbral', role: 'debuffer',
    archetypes: ['DoT Rot'],
    tagline: 'Cheap poison spreader with a detonation ultimate.',
    base: stats('mage', 3, { eff: 0.1 }),
    imprint: imprint('release', 'eff'),
    skills: [
      { slot: 's1', name: 'Bone Dart', cd: 0, souls: 1, target: 'enemy', anim: 'cast', vfx: 'poison', desc: 'Attacks with a 40% chance to inflict Poison for 2 turns.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); c.debuff(c.t, 'poison', 2, 0.4); } },
      { slot: 's2', name: 'Ossuary Mist', cd: 3, souls: 1, target: 'allEnemies', anim: 'cast', vfx: 'poison_cloud', desc: 'Attacks all enemies with a 50% chance to inflict Poison for 2 turns.', enhance: E.chance,
        run: (c) => { c.hitAll({ atk: 0.7 }); c.debuffAll('poison', 2, 0.5); } },
      { slot: 's3', name: 'Marrow Bloom', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'poison_big', desc: 'Attacks all enemies, then detonates their Poison at 60% of its remaining damage.', enhance: E.cd,
        run: (c) => { c.hitAll({ atk: 0.9 }); for (const e of c.enemies()) c.detonate(e, 'poison', 0.6); } },
    ],
    lore: 'Grimmald builds furniture from bones. Good furniture. Comfortable. Please do not ask whose.',
    quote: 'Everyone has a skeleton. Mine are just... out.',
    look: { body: 'small', skin: '#c9d6b8', hair: { style: 'wild', color: '#d8d8c8' }, outfit: { primary: '#4a5a3a', secondary: '#d8d8c8', accent: '#9aff5a', style: 'robe' }, weapon: 'staff', head: 'hat', eyes: '#9aff5a', aura: '#9aff5a' },
  },
  {
    id: 'sable', name: 'Sable', title: 'of the Thousand Eyes', rarity: 5, element: 'umbral', cls: 'thief', throne: 'umbral', role: 'anomaly',
    archetypes: ['Soul Engine', 'Cleave'],
    tagline: 'Steals buffs, and copies the enemy\'s ultimates as Echoes.',
    base: stats('thief', 5, { spd: 121, hp: 1.04 }),
    imprint: imprint('concentration', 'spd'),
    skills: [
      { slot: 's1', name: 'Pilfer', cd: 0, souls: 1, target: 'enemy', anim: 'dash', vfx: 'dark_slash', desc: 'Attacks with a 75% chance to steal 1 buff.', enhance: E.mix,
        run: (c) => { c.hit(c.t, { atk: 1.0 }); if (c.t.alive && c.chance(0.75 + c.lv.chance)) c.steal(c.t, 1); } },
      { slot: 's2', name: 'Thousand Eyes', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'Begins battle with Echo. Whenever an enemy uses their third skill, gains Echo for 2 turns (repeat next skill at 40% damage).', enhance: [] },
      { slot: 's3', name: 'Mirror Heist', cd: 4, souls: 2, target: 'enemy', anim: 'ult', vfx: 'mirror', desc: 'Attacks the enemy and steals all of their buffs. If 2 or more buffs are stolen, gains an extra turn.', enhance: E.cd,
        soulburn: { cost: 10, desc: 'Always grants an extra turn and damage +30%.' },
        run: (c) => { c.hit(c.t, { atk: 1.45, mult: c.sb ? 1.3 : 1 }); if (c.t.alive) { const n = c.steal(c.t, 99); if (n >= 2 || c.sb) c.extraTurn(); } else if (c.sb) c.extraTurn(); } },
    ],
    hooks: {
      onBattleStart: (h) => { h.buff(h.self, 'echo', 2); },
      afterAnyAction: (h, actor, slot) => { if (actor.team !== h.self.team && slot === 's3') h.buff(h.self, 'echo', 2); },
    },
    lore: 'Sable claims to have one eye in every mirror in Aethra. Nobody has proven her wrong, and nobody has found a mirror she couldn\'t walk out of.',
    quote: 'Pretty trick. Mine now.',
    look: { body: 'slim', feminine: true, skin: '#cbb8c9', hair: { style: 'bob', color: '#6a5a8a' }, outfit: { primary: '#22202e', secondary: '#c9c3e0', accent: '#ff7ae0', style: 'bodysuit' }, weapon: 'chakram', head: 'mask', back: 'orbs', eyes: '#ff7ae0', aura: '#ff7ae0' },
  },
  {
    id: 'orlov', name: 'Count Orlov', title: 'Ash', rarity: 4, element: 'flame', cls: 'knight', throne: 'umbral', role: 'tank',
    archetypes: ['Bruiser Counter'],
    tagline: 'Vampiric counter-tank who provokes the whole court.',
    base: stats('knight', 4, { hp: 1.1, spd: 99 }),
    imprint: imprint('release', 'hp'),
    skills: [
      { slot: 's1', name: 'Ashen Rebuke', cd: 0, souls: 1, target: 'enemy', anim: 'melee', vfx: 'fire_slash', desc: 'Attacks with damage proportional to max Health. When used as a counterattack, recovers 8% of max Health.', enhance: E.dmg,
        run: (c) => { c.hit(c.t, { atk: 0.45, hp: 0.075 }); if (c.isCounter) c.heal(c.self, c.maxHp() * 0.08); } },
      { slot: 's2', name: 'Old Blood', passive: true, cd: 0, souls: 0, target: 'self', anim: 'buff', desc: 'When attacked, has a 30% chance to counterattack (once per turn).', enhance: [] },
      { slot: 's3', name: 'Night Court', cd: 5, souls: 2, target: 'allEnemies', anim: 'ult', vfx: 'fire_wave', desc: 'Has a 75% chance to Provoke all enemies for 1 turn and grants the caster Vampirism and Increased Defense for 2 turns.', enhance: E.chance,
        run: (c) => { c.debuffAll('provoke', 1, 0.75); c.buff(c.self, 'vamp', 2); c.buff(c.self, 'def_up', 2); } },
    ],
    hooks: {
      onAttacked: (h, att, info) => { if (!info.isCounter && !info.isDot && att.alive && h.once('oldblood') && h.chance(0.3)) h.react('counter', att); },
    },
    lore: 'The Count\'s castle burned in the Ember Rebellion. He rebuilt it out of the ash and has been insufferable about fire ever since.',
    quote: 'Come, sit. Stay a while. Stay forever.',
    look: { body: 'broad', skin: '#d8c8c0', hair: { style: 'short', color: '#4a4a4a' }, outfit: { primary: '#5a1a1a', secondary: '#2a2a2a', accent: '#ff6a3a', style: 'plate' }, weapon: 'shield', head: 'circlet', back: 'cape', eyes: '#ff6a3a', aura: '#ff6a3a' },
  },
];
