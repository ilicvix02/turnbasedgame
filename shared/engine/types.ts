// Core type definitions shared by client, server and simulator.

export type Element = 'flame' | 'frost' | 'verdant' | 'radiant' | 'umbral';
export type HeroClass = 'knight' | 'warrior' | 'thief' | 'ranger' | 'mage' | 'soulweaver';
export type Role = 'dps' | 'bruiser' | 'tank' | 'healer' | 'support' | 'debuffer' | 'control' | 'anomaly';
export type Throne = 'aurelian' | 'umbral' | 'emberforge' | 'frostveil' | 'wildroot' | 'starfall' | 'chronos';
export type SkillSlot = 's1' | 's2' | 's3';
export type TargetKind = 'enemy' | 'ally' | 'self' | 'allEnemies' | 'allAllies' | 'deadAlly';
export type AnimKind = 'melee' | 'ranged' | 'cast' | 'buff' | 'heal' | 'ult' | 'dash' | 'spin';

export interface Stats {
  atk: number;
  hp: number;
  def: number;
  spd: number;
  cc: number; // crit chance 0..1
  cd: number; // crit damage multiplier, e.g. 1.5
  eff: number; // effectiveness 0..
  res: number; // effect resistance 0..
  dual: number; // dual attack chance 0..1
}
export type StatKey = keyof Stats;

export const ELEMENTS: Element[] = ['flame', 'frost', 'verdant', 'radiant', 'umbral'];
export const CLASSES: HeroClass[] = ['knight', 'warrior', 'thief', 'ranger', 'mage', 'soulweaver'];

/** Hit outcome classification, Epic Seven style. */
export type HitType = 'miss' | 'normal' | 'crush' | 'crit';

export interface EnhanceStep {
  dmg?: number; // +x damage multiplier (additive)
  chance?: number; // +x effect chance
  heal?: number; // +x heal
  cd?: number; // -x cooldown
}

/** Look parameters used by the procedural puppet renderer. */
export interface Look {
  body: 'slim' | 'normal' | 'broad' | 'tall' | 'small' | 'giant';
  skin: string;
  hair: { style: 'long' | 'short' | 'spiky' | 'ponytail' | 'twin' | 'bob' | 'mohawk' | 'bald' | 'flowing' | 'braid' | 'wild'; color: string };
  outfit: { primary: string; secondary: string; accent: string; style: 'robe' | 'plate' | 'leather' | 'dress' | 'coat' | 'tunic' | 'bodysuit' };
  weapon: 'sword' | 'greatsword' | 'staff' | 'bow' | 'dagger' | 'spear' | 'scythe' | 'hammer' | 'orb' | 'book' | 'gun' | 'fan' | 'shield' | 'claws' | 'lantern' | 'katana' | 'axe' | 'chakram' | 'whip' | 'harp' | 'gauntlet' | 'clock';
  head?: 'crown' | 'horns' | 'halo' | 'helm' | 'hat' | 'circlet' | 'mask' | 'ears' | 'hood' | 'antlers' | 'veil' | 'goggles' | 'flower';
  back?: 'cape' | 'wings' | 'angel' | 'demon' | 'tail' | 'gears' | 'quiver' | 'banner' | 'orbs' | 'scarf';
  eyes: string;
  aura: string;
  feminine?: boolean;
  scale?: number;
}

export interface SkillDef {
  slot: SkillSlot;
  name: string;
  passive?: boolean;
  cd: number; // cooldown in own turns, 0 = no cooldown
  souls: number; // souls gained when used
  target: TargetKind;
  desc: string;
  anim: AnimKind;
  vfx?: string; // vfx preset key
  enhance?: EnhanceStep[];
  soulburn?: { cost: number; desc: string };
  /** Only available in a given stance/form */
  form?: string;
  /** Activation script */
  run?: (c: import('./context').SkillCtx) => void;
  /** Starts battle on cooldown */
  startOnCd?: boolean;
  /** Skill cannot have its cooldown manipulated */
  lockedCd?: boolean;
  /** AI hint: higher → AI prefers */
  aiWeight?: number;
  /** This skill is unusable unless this predicate passes */
  usable?: (u: import('./battle').Unit, b: import('./battle').Battle) => boolean;
}

export interface HeroHooks {
  onBattleStart?: (h: import('./context').HookCtx) => void;
  onTurnStart?: (h: import('./context').HookCtx) => void;
  onTurnEnd?: (h: import('./context').HookCtx) => void;
  /** Self was hit by an attack */
  onAttacked?: (h: import('./context').HookCtx, attacker: import('./battle').Unit, info: import('./battle').HitInfo) => void;
  /** Any ally (not self) was hit */
  onAllyAttacked?: (h: import('./context').HookCtx, ally: import('./battle').Unit, attacker: import('./battle').Unit, info: import('./battle').HitInfo) => void;
  /** Self hit something */
  onHit?: (h: import('./context').HookCtx, target: import('./battle').Unit, info: import('./battle').HitInfo) => void;
  /** After self finishes a skill (main action only, not counters) */
  afterSkill?: (h: import('./context').HookCtx, slot: SkillSlot, targets: import('./battle').Unit[]) => void;
  /** After any unit (ally or enemy) finishes a main action */
  afterAnyAction?: (h: import('./context').HookCtx, actor: import('./battle').Unit, slot: SkillSlot) => void;
  onAllyDeath?: (h: import('./context').HookCtx, ally: import('./battle').Unit, killer?: import('./battle').Unit) => void;
  onEnemyDeath?: (h: import('./context').HookCtx, enemy: import('./battle').Unit, killer?: import('./battle').Unit) => void;
  /** Self is about to die; return true to prevent */
  onLethal?: (h: import('./context').HookCtx, attacker?: import('./battle').Unit) => boolean | void;
  onDeath?: (h: import('./context').HookCtx, killer?: import('./battle').Unit) => void;
  /** A debuff was applied to self */
  onDebuffed?: (h: import('./context').HookCtx, statusId: string, src?: import('./battle').Unit) => void;
  /** Self successfully applied a debuff to someone */
  onDebuffLanded?: (h: import('./context').HookCtx, target: import('./battle').Unit, statusId: string) => void;
  /** An enemy gained combat readiness */
  onEnemyCrGain?: (h: import('./context').HookCtx, enemy: import('./battle').Unit, amount: number) => void;
  /** An enemy was healed */
  onEnemyHealed?: (h: import('./context').HookCtx, enemy: import('./battle').Unit, amount: number) => void;
  /** Another ally dealt damage with an attack */
  onAllyHit?: (h: import('./context').HookCtx, ally: import('./battle').Unit, target: import('./battle').Unit, info: import('./battle').HitInfo) => void;
  /** An ally was healed */
  onAllyHealed?: (h: import('./context').HookCtx, ally: import('./battle').Unit, amount: number) => void;
  /** A Dominion (field) shattered or expired */
  onFieldEnd?: (h: import('./context').HookCtx, fieldId: string, shattered: boolean) => void;
  /** A Fate Thread created by self was broken */
  onLinkBroken?: (h: import('./context').HookCtx, unit: import('./battle').Unit) => void;
  /** Passive stat modifiers: percentage for atk/hp/def/spd, absolute for others */
  stats?: (u: import('./battle').Unit, b: import('./battle').Battle) => Partial<Stats>;
  /** Multiplicative outgoing damage modifier */
  dmgOut?: (u: import('./battle').Unit, target: import('./battle').Unit, b: import('./battle').Battle, slot?: SkillSlot) => number;
  /** Team aura: multiplies outgoing damage of every living ally (including self) */
  auraDmgOut?: (holder: import('./battle').Unit, src: import('./battle').Unit, target: import('./battle').Unit, b: import('./battle').Battle) => number;
  /** Multiplicative incoming damage modifier */
  dmgIn?: (u: import('./battle').Unit, attacker: import('./battle').Unit | undefined, b: import('./battle').Battle) => number;
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  rarity: 3 | 4 | 5;
  element: Element;
  cls: HeroClass;
  throne: Throne;
  role: Role;
  archetypes: string[];
  base: { atk: number; hp: number; def: number; spd: number; cc?: number; cd?: number; eff?: number; res?: number; dual?: number };
  skills: SkillDef[];
  hooks?: HeroHooks;
  /** Overcharge: raises team soul cap to 30 while alive */
  overcharge?: boolean;
  imprint: { kind: 'release' | 'concentration'; stat: StatKey; values: number[] };
  ee?: { name: string; options: string[] };
  lore: string;
  quote: string;
  look: Look;
  /** Short one-liner shown in roster */
  tagline: string;
  /** Bonds: hero ids that activate a bond passive */
  bonds?: string[];
  /** Hidden from gacha pool (bosses, monsters) */
  monster?: boolean;
  boss?: boolean;
}

export interface GearPiece {
  id: string;
  slot: 'weapon' | 'helmet' | 'armor' | 'necklace' | 'ring' | 'boots';
  set: string;
  rarity: 1 | 2 | 3 | 4 | 5; // normal..epic
  level: number; // item level tier (e.g. 85)
  enhance: number; // 0..15
  main: { stat: GearStat; value: number };
  subs: { stat: GearStat; value: number; rolls: number }[];
  equippedBy?: string | null;
  locked?: boolean;
}
export type GearStat = 'atk' | 'atk%' | 'hp' | 'hp%' | 'def' | 'def%' | 'spd' | 'cc' | 'cd' | 'eff' | 'res';

export interface UnitSetup {
  heroId: string;
  level: number;
  stars: number;
  stats: Stats; // final pre-battle stats with gear/imprint/awakening
  sets: string[]; // active set ids (one entry per completed set)
  artifact?: { id: string; level: number };
  skillLv: [number, number, number];
  ee?: number;
}

export interface TeamSetup {
  name: string;
  units: UnitSetup[];
}

export type BattleMode = 'campaign' | 'arena' | 'rta' | 'sim' | 'tutorial' | 'raid';

export interface BattleConfig {
  seed: number;
  mode: BattleMode;
  teams: [TeamSetup, TeamSetup];
  /** Additional enemy waves after teams[1] is cleared */
  waves?: TeamSetup[];
  maxActions?: number;
  /** Which teams are AI controlled by default */
  ai?: [boolean, boolean];
}

export interface Input {
  actor: number; // uid
  skill: SkillSlot;
  target: number; // uid (-1 for none)
  sb: boolean;
}
