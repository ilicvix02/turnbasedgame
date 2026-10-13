// Procedural 2.5D hero puppets: layered, gradient-shaded, rim-lit vector rigs generated from each hero's Look.
import { ColorMatrixFilter, Container, FillGradient, Graphics, Sprite } from 'pixi.js';
import type { HeroDef, Look } from '@shared/engine/types';
import { hex, mix, onFrame, shade } from './app';
import { fxTex } from './textures';

const gradCache = new Map<string, FillGradient>();
function lin(c1: string, c2: string, dir: 'v' | 'h' | 'd' = 'v', mid?: string): FillGradient {
  const key = `l${c1}${c2}${dir}${mid ?? ''}`;
  let g = gradCache.get(key);
  if (!g) {
    const stops = mid ? [{ offset: 0, color: c1 }, { offset: 0.5, color: mid }, { offset: 1, color: c2 }] : [{ offset: 0, color: c1 }, { offset: 1, color: c2 }];
    g = new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: dir === 'v' ? { x: 0, y: 1 } : dir === 'h' ? { x: 1, y: 0 } : { x: 1, y: 1 }, colorStops: stops, textureSpace: 'local' });
    gradCache.set(key, g);
  }
  return g;
}
function rad(c1: string, c2: string, cx = 0.38, cy = 0.32): FillGradient {
  const key = `r${c1}${c2}${cx}${cy}`;
  let g = gradCache.get(key);
  if (!g) {
    g = new FillGradient({ type: 'radial', center: { x: cx, y: cy }, innerRadius: 0, outerCenter: { x: 0.5, y: 0.5 }, outerRadius: 0.72, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }], textureSpace: 'local' });
    gradCache.set(key, g);
  }
  return g;
}

const OUT = 0x0a0812;

/** Soft additive glow sprite (no filters → no filter-bounds artefacts, cheap). */
export function glowSprite(color: string | number, w: number, h = w, alpha = 0.6): Sprite {
  const s = new Sprite(fxTex('circle_05'));
  s.anchor.set(0.5);
  s.tint = typeof color === 'string' ? hex(color) : color;
  s.width = w;
  s.height = h;
  s.alpha = alpha;
  s.blendMode = 'add';
  return s;
}
const outline = (g: Graphics, w = 2.2, a = 0.75) => g.stroke({ width: w, color: OUT, alpha: a, join: 'round', cap: 'round' });

export interface Rig {
  root: Container; // positioned in the world (feet)
  body: Container; // bobbing body
  aura: Container;
  back: Container;
  hairBack: Container;
  armB: Container;
  legs: Container;
  torso: Container;
  head: Container;
  armF: Container;
  weapon: Container;
  weaponTip: Container;
  flash: ColorMatrixFilter;
  height: number;
  look: Look;
  facing: 1 | -1;
  t0: number;
  stop: () => void;
  state: { lunge: number; cast: number; hurt: number; dead: number; breathe: number; armSwing: number; armRaise: number };
}

const BODY: Record<Look['body'], { w: number; h: number }> = {
  slim: { w: 0.88, h: 1.0 }, normal: { w: 1.0, h: 1.0 }, broad: { w: 1.22, h: 1.0 }, tall: { w: 0.95, h: 1.12 }, small: { w: 0.9, h: 0.84 }, giant: { w: 1.32, h: 1.22 },
};

/** Build a puppet. `size` is roughly the standing height in px. */
export function buildPuppet(def: HeroDef, size = 220, facing: 1 | -1 = 1): Rig {
  const L = def.look;
  const B = BODY[L.body];
  const Hh = size * B.h * (L.scale ?? 1);
  const w = B.w;
  const fem = !!L.feminine;
  const P = L.outfit.primary, S = L.outfit.secondary, A = L.outfit.accent;
  const skin = L.skin;

  const root = new Container();
  const body = new Container();
  root.addChild(body);
  body.scale.x = facing;

  // ── aura (behind everything) ──
  const aura = new Container();
  const auraS = glowSprite(L.aura, Hh * 1.05 * w, Hh * 1.25, 0.32);
  auraS.y = -Hh * 0.5;
  aura.addChild(auraS);
  body.addChild(aura);

  const shoulderY = -Hh * 0.72;
  const hipY = -Hh * 0.42;
  const shoulderW = Hh * 0.145 * w * (fem ? 0.88 : 1);
  const headY = -Hh * 0.85;
  const headR = Hh * (fem ? 0.1 : 0.102);

  // ── back accessory ──
  const back = new Container();
  back.position.set(0, shoulderY + Hh * 0.02);
  drawBack(back, L, Hh, w);
  body.addChild(back);

  // ── back hair ──
  const hairBack = new Container();
  hairBack.position.set(0, headY);
  drawHairBack(hairBack, L, headR, Hh);
  body.addChild(hairBack);

  // ── rear arm ──
  const armB = new Container();
  armB.position.set(-shoulderW * 0.75, shoulderY + Hh * 0.02);
  drawArm(armB, Hh, shade(P, -0.35), shade(skin, -0.25), fem, w, L);
  armB.rotation = 0.25;
  body.addChild(armB);

  // ── legs ──
  const legs = new Container();
  legs.position.set(0, hipY);
  drawLegs(legs, L, Hh, w, fem);
  body.addChild(legs);

  // ── torso ──
  const torso = new Container();
  torso.position.set(0, hipY);
  drawTorso(torso, L, Hh, w, fem, shoulderY - hipY, shoulderW);
  body.addChild(torso);

  // ── head ──
  const head = new Container();
  head.position.set(0, headY);
  drawHead(head, L, headR, fem, def);
  body.addChild(head);

  // ── front arm + weapon ──
  const armF = new Container();
  armF.position.set(shoulderW * 0.8, shoulderY + Hh * 0.02);
  const weapon = new Container();
  const weaponTip = new Container();
  drawArm(armF, Hh, shade(P, -0.05), skin, fem, w, L);
  const armLen = Hh * 0.29;
  weapon.position.set(0, armLen);
  drawWeapon(weapon, weaponTip, L, Hh);
  const raised: Record<string, number> = { sword: 2.45, katana: 2.5, greatsword: 2.55, spear: 2.75, scythe: 2.7, staff: 2.85, hammer: 2.5, axe: 2.5, dagger: 2.3, gun: 1.75, whip: 0.3, bow: 0.15, fan: 0.6, book: 0.4 };
  weapon.rotation = raised[L.weapon] ?? 0;
  armF.addChild(weapon);
  armF.rotation = -0.35;
  body.addChild(armF);

  const flash = new ColorMatrixFilter();

  const rig: Rig = { root, body, aura, back, hairBack, armB, legs, torso, head, armF, weapon, weaponTip, flash, height: Hh, look: L, facing, t0: Math.random() * 1000, stop: () => {}, state: { lunge: 0, cast: 0, hurt: 0, dead: 0, breathe: 1, armSwing: 0, armRaise: 0 } };
  const phase = Math.random() * Math.PI * 2;
  rig.stop = onFrame((_dt, time) => {
    if (root.destroyed) { rig.stop(); return; }
    const t = time / 1000 + phase;
    const st = rig.state;
    const br = Math.sin(t * 2.1) * st.breathe;
    body.y = br * Hh * 0.008 - st.dead * Hh * 0.05;
    torso.scale.y = 1 + br * 0.012;
    head.y = headY + br * Hh * 0.006 + st.hurt * Hh * 0.01;
    head.rotation = Math.sin(t * 0.9) * 0.03 - st.hurt * 0.15 + st.dead * 0.4;
    hairBack.rotation = Math.sin(t * 1.6) * 0.04;
    hairBack.y = head.y;
    back.rotation = Math.sin(t * 1.3) * 0.03;
    back.skew.x = Math.sin(t * 1.7) * 0.05;
    armF.rotation = -0.35 + Math.sin(t * 1.4) * 0.05 - st.armSwing * 2.2 - st.armRaise * 1.9;
    armB.rotation = 0.25 - Math.sin(t * 1.4) * 0.04 - st.armRaise * 0.9;
    aura.alpha = 0.7 + Math.sin(t * 2.6) * 0.25 + st.cast * 1.5;
    aura.scale.set(1 + st.cast * 0.35);
    body.rotation = -st.hurt * 0.12 + st.lunge * 0.08 + st.dead * 0.25;
  });
  return rig;
}

// ───────────────────────────── parts ─────────────────────────────
function drawLegs(c: Container, L: Look, Hh: number, w: number, fem: boolean) {
  const g = new Graphics();
  const legW = Hh * 0.066 * w;
  const len = Hh * 0.42;
  const P = L.outfit.primary, S = L.outfit.secondary;
  const pant = L.outfit.style === 'dress' || L.outfit.style === 'robe' ? shade(S, -0.35) : shade(P, -0.25);
  for (const side of [-1, 1]) {
    const x = side * Hh * 0.042 * w;
    const col = side < 0 ? shade(pant, -0.2) : pant;
    g.moveTo(x - legW * 0.62, 0).lineTo(x + legW * 0.62, 0).lineTo(x + legW * 0.45, len * 0.8).lineTo(x - legW * 0.42, len * 0.8).closePath().fill(lin(shade(col, 0.18), shade(col, -0.3), 'h'));
    outline(g, 1.6, 0.5);
    // boots
    const bootC = L.outfit.style === 'plate' ? shade(S, -0.1) : shade('#3a2a22', side < 0 ? -0.2 : 0);
    g.roundRect(x - legW * 0.62, len * 0.62, legW * 1.24, len * 0.36, legW * 0.35).fill(lin(shade(bootC, 0.25), shade(bootC, -0.35)));
    outline(g, 1.6, 0.6);
    g.ellipse(x + legW * 0.25, len * 0.97, legW * 0.85, legW * 0.32).fill({ color: hex(shade(bootC, -0.3)) });
    if (L.outfit.style === 'plate') g.roundRect(x - legW * 0.55, len * 0.35, legW * 1.1, len * 0.14, 4).fill(lin(shade(S, 0.4), shade(S, -0.2)));
  }
  if (fem && (L.outfit.style === 'bodysuit' || L.outfit.style === 'leather')) g.alpha = 1;
  c.addChild(g);
}

function drawTorso(c: Container, L: Look, Hh: number, w: number, fem: boolean, torsoH: number, shoulderW: number) {
  const g = new Graphics();
  const P = L.outfit.primary, S = L.outfit.secondary, A = L.outfit.accent;
  const top = torsoH; // negative number
  const waist = Hh * 0.085 * w * (fem ? 0.82 : 1);
  const sw = shoulderW * 1.05;
  const style = L.outfit.style;
  // skirt / coat tails / robe below waist
  if (style === 'robe' || style === 'dress' || style === 'coat') {
    const len = style === 'robe' ? Hh * 0.4 : style === 'dress' ? Hh * 0.3 : Hh * 0.33;
    const flare = style === 'dress' ? Hh * 0.17 * w : style === 'robe' ? Hh * 0.15 * w : Hh * 0.13 * w;
    g.moveTo(-waist, -Hh * 0.02).bezierCurveTo(-waist * 1.3, len * 0.4, -flare, len * 0.7, -flare * 1.05, len).lineTo(flare * 1.05, len).bezierCurveTo(flare, len * 0.7, waist * 1.3, len * 0.4, waist, -Hh * 0.02).closePath()
      .fill(lin(shade(style === 'coat' ? P : S, 0.1), shade(style === 'coat' ? P : S, -0.45), 'v'));
    outline(g);
    // hem trim
    g.moveTo(-flare * 1.05, len).quadraticCurveTo(0, len + Hh * 0.025, flare * 1.05, len).stroke({ width: Hh * 0.018, color: hex(A), alpha: 0.9 });
    // folds
    for (let i = -2; i <= 2; i++) g.moveTo(i * waist * 0.4, Hh * 0.02).quadraticCurveTo(i * flare * 0.45, len * 0.6, i * flare * 0.55, len * 0.97).stroke({ width: 1.4, color: OUT, alpha: 0.25 });
    if (style === 'coat') {
      g.moveTo(0, 0).lineTo(0, len).stroke({ width: 2, color: OUT, alpha: 0.5 });
    }
  }
  // chest
  const chest = new Graphics();
  chest.moveTo(-waist, 0).bezierCurveTo(-waist * 1.05, top * 0.5, -sw * 1.05, top * 0.8, -sw, top).quadraticCurveTo(0, top * 1.06, sw, top).bezierCurveTo(sw * 1.05, top * 0.8, waist * 1.05, top * 0.5, waist, 0).quadraticCurveTo(0, Hh * 0.015, -waist, 0).closePath()
    .fill(lin(shade(P, 0.25), shade(P, -0.35), 'h', P));
  outline(chest);
  // rim light (top-left)
  chest.moveTo(-sw * 0.95, top * 0.97).bezierCurveTo(-sw * 1.0, top * 0.75, -waist * 1.0, top * 0.45, -waist * 0.95, top * 0.05).stroke({ width: 2.2, color: 0xffffff, alpha: 0.18 });
  // details by style
  if (style === 'plate') {
    // breastplate
    chest.moveTo(-sw * 0.72, top * 0.92).quadraticCurveTo(0, top * 0.55, sw * 0.72, top * 0.92).lineTo(waist * 0.8, top * 0.25).quadraticCurveTo(0, top * 0.1, -waist * 0.8, top * 0.25).closePath()
      .fill(lin(shade(S, 0.5), shade(S, -0.3), 'd'));
    outline(chest, 1.6, 0.6);
    chest.moveTo(0, top * 0.85).lineTo(0, top * 0.18).stroke({ width: 1.5, color: OUT, alpha: 0.35 });
    // pauldrons
    for (const s of [-1, 1]) {
      chest.ellipse(s * sw * 1.02, top * 0.96, Hh * 0.065 * w, Hh * 0.045).fill(rad(shade(S, 0.55), shade(S, -0.35)));
      outline(chest, 1.6, 0.6);
      chest.ellipse(s * sw * 1.02, top * 0.96 - Hh * 0.01, Hh * 0.04 * w, Hh * 0.012).fill({ color: 0xffffff, alpha: 0.25 });
    }
  } else if (style === 'leather' || style === 'tunic') {
    chest.moveTo(-sw * 0.5, top * 0.98).lineTo(waist * 0.6, top * 0.1).stroke({ width: Hh * 0.016, color: hex(shade(S, -0.2)), alpha: 0.95 });
    chest.circle(sw * 0.1, top * 0.55, Hh * 0.012).fill({ color: hex(A) });
  } else if (style === 'bodysuit') {
    chest.moveTo(-sw * 0.6, top * 0.95).quadraticCurveTo(0, top * 0.6, sw * 0.6, top * 0.95).stroke({ width: 2, color: hex(A), alpha: 0.9 });
    chest.moveTo(-waist * 0.9, top * 0.35).lineTo(waist * 0.9, top * 0.35).stroke({ width: 1.5, color: hex(A), alpha: 0.7 });
  } else {
    // robe / dress / coat: collar + sash
    chest.moveTo(-sw * 0.55, top).lineTo(0, top * 0.55).lineTo(sw * 0.55, top).stroke({ width: Hh * 0.014, color: hex(S), alpha: 0.95 });
    chest.moveTo(-sw * 0.3, top * 0.95).lineTo(0, top * 0.6).lineTo(sw * 0.3, top * 0.95).fill({ color: hex(shade(L.skin, -0.05)) });
  }
  // belt
  chest.roundRect(-waist * 1.05, -Hh * 0.03, waist * 2.1, Hh * 0.04, 3).fill(lin(shade(A, 0.2), shade(A, -0.45)));
  outline(chest, 1.4, 0.6);
  chest.roundRect(-Hh * 0.016, -Hh * 0.034, Hh * 0.032, Hh * 0.048, 2).fill(lin('#fff4c0', '#a8842a'));
  // emblem gem
  chest.circle(0, top * 0.62, Hh * 0.016).fill(rad('#ffffff', hex(A) === 0 ? '#888' : A, 0.35, 0.3));
  chest.circle(0, top * 0.62, Hh * 0.016).stroke({ width: 1.2, color: OUT, alpha: 0.6 });
  // neck
  chest.roundRect(-Hh * 0.025, top - Hh * 0.04, Hh * 0.05, Hh * 0.05, 6).fill(lin(shade(L.skin, -0.15), shade(L.skin, -0.35)));
  c.addChild(g, chest);
}

function drawArm(c: Container, Hh: number, sleeve: string, skin: string, fem: boolean, w: number, L: Look) {
  const g = new Graphics();
  const len = Hh * 0.29;
  const aw = Hh * (fem ? 0.05 : 0.058) * w;
  g.roundRect(-aw / 2, -aw * 0.3, aw, len * 0.62, aw * 0.45).fill(lin(shade(sleeve, 0.2), shade(sleeve, -0.3), 'h'));
  outline(g, 1.6, 0.6);
  // gauntlet / forearm
  const fore = L.outfit.style === 'plate' ? shade(L.outfit.secondary, 0.1) : skin;
  g.roundRect(-aw * 0.45, len * 0.52, aw * 0.9, len * 0.42, aw * 0.4).fill(lin(shade(fore, 0.18), shade(fore, -0.28), 'h'));
  outline(g, 1.4, 0.55);
  // cuff
  g.roundRect(-aw * 0.58, len * 0.5, aw * 1.16, aw * 0.42, 3).fill({ color: hex(L.outfit.accent) });
  // hand
  g.circle(0, len * 0.98, aw * 0.55).fill(rad(shade(skin, 0.15), shade(skin, -0.3)));
  outline(g, 1.3, 0.55);
  c.addChild(g);
}

function drawHead(c: Container, L: Look, r: number, fem: boolean, def: HeroDef) {
  const g = new Graphics();
  const skin = L.skin;
  const monsterish = !!def.monster;
  // face
  g.moveTo(-r * 0.95, -r * 0.2).bezierCurveTo(-r * 1.0, -r * 1.15, r * 1.0, -r * 1.15, r * 0.95, -r * 0.2).bezierCurveTo(r * 0.92, r * 0.55, r * 0.35, r * 1.02, 0, r * 1.05).bezierCurveTo(-r * 0.35, r * 1.02, -r * 0.92, r * 0.55, -r * 0.95, -r * 0.2).closePath()
    .fill(rad(shade(skin, 0.18), shade(skin, -0.32), 0.62, 0.35));
  outline(g, 2, 0.7);
  // cheek blush / jaw shadow
  g.ellipse(r * 0.45, r * 0.35, r * 0.2, r * 0.1).fill({ color: 0xff7a7a, alpha: fem ? 0.22 : 0.08 });
  g.moveTo(-r * 0.8, r * 0.25).quadraticCurveTo(-r * 0.4, r * 0.95, 0, r * 1.0).stroke({ width: r * 0.12, color: OUT, alpha: 0.12 });
  // eyes (facing right: front eye bigger)
  const eyeY = r * 0.05;
  const eyeR = r * (fem ? 0.2 : 0.16);
  for (const [ex, sc] of [[r * 0.42, 1], [-r * 0.12, 0.85]] as [number, number][]) {
    g.ellipse(ex, eyeY, eyeR * 0.85 * sc, eyeR * sc).fill({ color: 0xffffff, alpha: monsterish ? 0.2 : 0.95 });
    g.ellipse(ex + eyeR * 0.12, eyeY + eyeR * 0.05, eyeR * 0.6 * sc, eyeR * 0.8 * sc).fill(rad(shade(L.eyes, 0.5), shade(L.eyes, -0.45), 0.4, 0.3));
    g.circle(ex + eyeR * 0.15, eyeY + eyeR * 0.1, eyeR * 0.28 * sc).fill({ color: OUT });
    g.circle(ex - eyeR * 0.15, eyeY - eyeR * 0.3, eyeR * 0.2 * sc).fill({ color: 0xffffff, alpha: 0.95 });
    g.moveTo(ex - eyeR * 0.95 * sc, eyeY - eyeR * 0.9 * sc).quadraticCurveTo(ex, eyeY - eyeR * 1.35 * sc, ex + eyeR * 0.95 * sc, eyeY - eyeR * 0.85 * sc).stroke({ width: fem ? 2.6 : 2.2, color: OUT, alpha: 0.9, cap: 'round' });
  }
  // eye glow
  const glow = glowSprite(L.eyes, eyeR * 4, eyeR * 3, 0.45);
  glow.position.set(r * 0.42, eyeY);
  // nose + mouth
  g.moveTo(r * 0.28, r * 0.35).lineTo(r * 0.35, r * 0.48).stroke({ width: 1.4, color: OUT, alpha: 0.35 });
  g.moveTo(r * 0.1, r * 0.68).quadraticCurveTo(r * 0.28, r * 0.74, r * 0.42, r * 0.66).stroke({ width: 1.6, color: 0x5a2a2a, alpha: 0.7, cap: 'round' });
  c.addChild(g, glow);
  // front hair + headwear
  drawHairFront(c, L, r);
  drawHeadwear(c, L, r);
}

function drawHairBack(c: Container, L: Look, r: number, Hh: number) {
  const g = new Graphics();
  const col = L.hair.color;
  const fill = lin(shade(col, 0.15), shade(col, -0.4), 'v');
  const st = L.hair.style;
  if (st === 'bald') { c.addChild(g); return; }
  if (st === 'long' || st === 'flowing') {
    const len = st === 'flowing' ? Hh * 0.42 : Hh * 0.3;
    g.moveTo(-r * 1.05, -r * 0.3).bezierCurveTo(-r * 1.5, len * 0.4, -r * 1.3, len * 0.8, -r * 0.6, len).quadraticCurveTo(0, len * 1.05, r * 0.5, len * 0.95).bezierCurveTo(r * 1.0, len * 0.7, r * 1.2, len * 0.3, r * 1.05, -r * 0.3).closePath().fill(fill);
    outline(g, 1.8, 0.6);
    for (let i = -2; i <= 2; i++) g.moveTo(i * r * 0.25, 0).quadraticCurveTo(i * r * 0.4, len * 0.6, i * r * 0.3, len * 0.95).stroke({ width: 1.2, color: OUT, alpha: 0.25 });
  } else if (st === 'ponytail' || st === 'braid') {
    const len = Hh * 0.3;
    if (st === 'braid') {
      for (let i = 0; i < 6; i++) g.ellipse(-r * 0.85 - i * r * 0.05, -r * 0.1 + i * len * 0.16, r * 0.24, r * 0.19).fill(fill);
    } else g.moveTo(-r * 0.7, -r * 0.6).bezierCurveTo(-r * 1.9, -r * 0.2, -r * 1.6, len * 0.6, -r * 1.2, len).quadraticCurveTo(-r * 0.9, len * 0.5, -r * 0.4, -r * 0.4).closePath().fill(fill);
    outline(g, 1.6, 0.55);
  } else if (st === 'twin') {
    for (const s of [-1, 1]) {
      g.moveTo(s * r * 0.8, -r * 0.5).bezierCurveTo(s * r * 1.8, -r * 0.2, s * r * 1.7, Hh * 0.18, s * r * 1.3, Hh * 0.25).quadraticCurveTo(s * r * 1.1, Hh * 0.1, s * r * 0.7, -r * 0.2).closePath().fill(fill);
      outline(g, 1.6, 0.55);
    }
  } else if (st === 'wild') {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.55 + (i / 8) * 0.9);
      g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6 - r * 0.2).lineTo(Math.cos(a - 0.15) * r * 1.6, Math.sin(a - 0.15) * r * 1.6).lineTo(Math.cos(a + 0.2) * r * 0.9, Math.sin(a + 0.2) * r * 0.9).closePath().fill(fill);
    }
    g.circle(0, -r * 0.2, r * 1.08).fill(fill);
    outline(g, 1.6, 0.4);
  } else {
    g.circle(0, -r * 0.18, r * 1.1).fill(fill);
    outline(g, 1.8, 0.5);
  }
  c.addChild(g);
}

function drawHairFront(c: Container, L: Look, r: number) {
  const g = new Graphics();
  const col = L.hair.color;
  const fill = lin(shade(col, 0.3), shade(col, -0.25), 'v');
  const st = L.hair.style;
  if (st === 'bald') {
    g.moveTo(-r * 0.9, -r * 0.5).quadraticCurveTo(0, -r * 1.2, r * 0.9, -r * 0.5).stroke({ width: 2, color: 0xffffff, alpha: 0.15 });
    c.addChild(g);
    return;
  }
  if (st === 'spiky' || st === 'mohawk') {
    const n = st === 'mohawk' ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = st === 'mohawk' ? -r * 0.3 + t * r * 0.6 : -r * 1.0 + t * r * 2.0;
      const tipY = st === 'mohawk' ? -r * 1.9 + Math.abs(t - 0.5) * r * 0.8 : -r * 1.55 + Math.abs(t - 0.5) * r * 0.6;
      g.moveTo(x - r * 0.28, -r * 0.55).lineTo(x + r * 0.15, tipY).lineTo(x + r * 0.32, -r * 0.5).closePath().fill(fill);
    }
    if (st === 'spiky') g.moveTo(-r * 1.0, -r * 0.3).bezierCurveTo(-r * 0.9, -r * 1.2, r * 0.9, -r * 1.2, r * 1.0, -r * 0.3).quadraticCurveTo(r * 0.5, -r * 0.55, r * 0.15, -r * 0.2).lineTo(-r * 0.2, -r * 0.55).quadraticCurveTo(-r * 0.6, -r * 0.3, -r * 1.0, -r * 0.3).closePath().fill(fill);
    outline(g, 1.6, 0.6);
  } else {
    // cap + bangs
    g.moveTo(-r * 1.05, -r * 0.05).bezierCurveTo(-r * 1.15, -r * 1.3, r * 1.15, -r * 1.3, r * 1.05, -r * 0.1);
    if (st === 'bob' || st === 'short') g.quadraticCurveTo(r * 0.9, -r * 0.45, r * 0.55, -r * 0.42).lineTo(r * 0.35, -r * 0.15).lineTo(r * 0.12, -r * 0.48).lineTo(-r * 0.2, -r * 0.2).lineTo(-r * 0.4, -r * 0.5).quadraticCurveTo(-r * 0.85, -r * 0.4, -r * 1.05, -r * 0.05);
    else g.quadraticCurveTo(r * 0.85, -r * 0.6, r * 0.45, -r * 0.55).lineTo(r * 0.5, -r * 0.05).lineTo(r * 0.15, -r * 0.5).lineTo(-r * 0.15, -r * 0.3).lineTo(-r * 0.35, -r * 0.55).quadraticCurveTo(-r * 0.95, -r * 0.5, -r * 1.05, -r * 0.05);
    g.closePath().fill(fill);
    outline(g, 1.8, 0.65);
    // side locks
    if (st !== 'short' && st !== 'mohawk') {
      g.moveTo(r * 0.95, -r * 0.3).quadraticCurveTo(r * 1.15, r * 0.4, r * 0.85, r * 0.85).quadraticCurveTo(r * 0.8, r * 0.2, r * 0.7, -r * 0.2).closePath().fill(fill);
      outline(g, 1.4, 0.5);
    }
  }
  // shine
  g.moveTo(-r * 0.55, -r * 0.85).quadraticCurveTo(0, -r * 1.12, r * 0.45, -r * 0.88).stroke({ width: r * 0.12, color: 0xffffff, alpha: 0.22, cap: 'round' });
  c.addChild(g);
}

function drawHeadwear(c: Container, L: Look, r: number) {
  const g = new Graphics();
  const A = L.outfit.accent, S = L.outfit.secondary, P = L.outfit.primary;
  const gold = lin('#fff6c8', '#b08a2a');
  switch (L.head) {
    case 'crown': {
      g.moveTo(-r * 0.8, -r * 0.85).lineTo(-r * 0.85, -r * 1.45).lineTo(-r * 0.45, -r * 1.12).lineTo(0, -r * 1.65).lineTo(r * 0.45, -r * 1.12).lineTo(r * 0.85, -r * 1.45).lineTo(r * 0.8, -r * 0.85).closePath().fill(gold);
      outline(g, 1.6, 0.7);
      for (const x of [-0.5, 0, 0.5]) g.circle(x * r, -r * 1.0, r * 0.1).fill(rad('#ffffff', A));
      break;
    }
    case 'circlet':
      g.moveTo(-r * 1.0, -r * 0.55).quadraticCurveTo(0, -r * 0.82, r * 1.0, -r * 0.55).stroke({ width: r * 0.12, color: hex('#e8c86a') });
      g.circle(r * 0.05, -r * 0.72, r * 0.12).fill(rad('#ffffff', A));
      break;
    case 'halo': {
      const halo = new Graphics();
      halo.ellipse(0, -r * 1.55, r * 0.95, r * 0.25).stroke({ width: r * 0.12, color: 0xfff2a0, alpha: 0.95 });
      const glow = glowSprite('#ffe27a', r * 3, r * 1.2, 0.7);
      glow.y = -r * 1.55;
      c.addChild(glow, halo);
      break;
    }
    case 'horns':
      for (const s of [-1, 1]) {
        g.moveTo(s * r * 0.55, -r * 0.8).bezierCurveTo(s * r * 1.2, -r * 1.3, s * r * 1.5, -r * 1.9, s * r * 1.05, -r * 2.15).quadraticCurveTo(s * r * 1.1, -r * 1.4, s * r * 0.25, -r * 0.95).closePath().fill(lin(shade(S, 0.3), shade(S, -0.5)));
        outline(g, 1.6, 0.7);
      }
      break;
    case 'antlers':
      for (const s of [-1, 1]) {
        const col = hex(mix(S, '#8a6a4a', 0.6));
        g.moveTo(s * r * 0.5, -r * 0.85).lineTo(s * r * 1.0, -r * 1.7).stroke({ width: r * 0.14, color: col, cap: 'round' });
        g.moveTo(s * r * 0.78, -r * 1.3).lineTo(s * r * 1.35, -r * 1.45).stroke({ width: r * 0.1, color: col, cap: 'round' });
        g.moveTo(s * r * 0.92, -r * 1.55).lineTo(s * r * 0.8, -r * 2.0).stroke({ width: r * 0.09, color: col, cap: 'round' });
        g.moveTo(s * r * 1.0, -r * 1.7).lineTo(s * r * 1.45, -r * 1.95).stroke({ width: r * 0.08, color: col, cap: 'round' });
      }
      break;
    case 'helm':
      g.moveTo(-r * 1.1, r * 0.1).bezierCurveTo(-r * 1.25, -r * 1.45, r * 1.25, -r * 1.45, r * 1.1, r * 0.1).lineTo(r * 0.95, r * 0.15).lineTo(r * 0.95, -r * 0.25).lineTo(-r * 0.5, -r * 0.25).lineTo(-r * 0.75, r * 0.5).closePath().fill(lin(shade(S, 0.5), shade(S, -0.35), 'd'));
      outline(g, 2, 0.75);
      g.moveTo(-r * 0.2, -r * 1.25).quadraticCurveTo(r * 0.8, -r * 1.7, r * 1.3, -r * 1.2).stroke({ width: r * 0.16, color: hex(A), cap: 'round' });
      break;
    case 'hat':
      g.ellipse(0, -r * 0.75, r * 1.6, r * 0.32).fill(lin(shade(P, 0.15), shade(P, -0.45)));
      outline(g, 1.6, 0.7);
      g.moveTo(-r * 0.75, -r * 0.8).lineTo(-r * 0.2, -r * 2.3).quadraticCurveTo(r * 0.35, -r * 2.5, r * 0.75, -r * 2.05).quadraticCurveTo(r * 0.4, -r * 1.8, r * 0.75, -r * 0.8).closePath().fill(lin(shade(P, 0.25), shade(P, -0.35), 'h'));
      outline(g, 1.6, 0.7);
      g.moveTo(-r * 0.72, -r * 0.95).quadraticCurveTo(0, -r * 1.1, r * 0.72, -r * 0.95).stroke({ width: r * 0.14, color: hex(A) });
      break;
    case 'hood':
      g.moveTo(-r * 1.25, r * 0.6).bezierCurveTo(-r * 1.45, -r * 1.25, r * 0.4, -r * 1.85, r * 1.2, -r * 0.6).bezierCurveTo(r * 1.1, -r * 1.1, -r * 0.6, -r * 1.25, -r * 0.85, r * 0.2).closePath().fill(lin(shade(P, 0.2), shade(P, -0.45), 'h'));
      outline(g, 1.8, 0.7);
      break;
    case 'mask':
      g.moveTo(-r * 0.9, -r * 0.15).quadraticCurveTo(r * 0.2, -r * 0.4, r * 0.95, -r * 0.1).lineTo(r * 0.9, r * 0.25).quadraticCurveTo(r * 0.2, r * 0.0, -r * 0.85, r * 0.25).closePath().fill(lin(shade(S, 0.35), shade(S, -0.35)));
      outline(g, 1.6, 0.75);
      g.ellipse(r * 0.42, r * 0.05, r * 0.16, r * 0.07).fill({ color: hex(L.eyes) });
      break;
    case 'ears':
      for (const [s, z] of [[-1, 0.85], [1, 1]] as [number, number][]) {
        g.moveTo(s * r * 0.35, -r * 0.85).lineTo(s * r * 0.95, -r * 1.85 * z).lineTo(s * r * 0.95, -r * 0.6).closePath().fill(lin(shade(L.hair.color, 0.2), shade(L.hair.color, -0.3)));
        outline(g, 1.6, 0.7);
        g.moveTo(s * r * 0.5, -r * 0.85).lineTo(s * r * 0.86, -r * 1.55 * z).lineTo(s * r * 0.86, -r * 0.75).closePath().fill({ color: 0xffb0c0, alpha: 0.7 });
      }
      break;
    case 'veil':
      g.moveTo(-r * 1.15, -r * 0.4).bezierCurveTo(-r * 1.2, -r * 1.4, r * 1.2, -r * 1.4, r * 1.15, -r * 0.4).lineTo(r * 1.35, r * 1.6).quadraticCurveTo(0, r * 1.9, -r * 1.45, r * 1.7).closePath().fill({ color: hex(S), alpha: 0.38 });
      g.moveTo(-r * 1.0, -r * 0.65).quadraticCurveTo(0, -r * 0.95, r * 1.0, -r * 0.65).stroke({ width: r * 0.1, color: hex(A) });
      break;
    case 'goggles':
      g.moveTo(-r * 1.0, -r * 0.6).quadraticCurveTo(0, -r * 0.9, r * 1.0, -r * 0.6).stroke({ width: r * 0.14, color: 0x3a2a1a });
      for (const x of [-0.25, 0.45]) { g.circle(x * r, -r * 0.75, r * 0.24).fill(rad('#e8fbff', A)); outline(g, 2, 0.8); }
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.circle(r * 0.75 + Math.cos(a) * r * 0.2, -r * 0.75 + Math.sin(a) * r * 0.2, r * 0.17).fill({ color: hex(A) }); }
      g.circle(r * 0.75, -r * 0.75, r * 0.12).fill({ color: 0xfff2a0 });
      break;
  }
  c.addChild(g);
}

function drawBack(c: Container, L: Look, Hh: number, w: number) {
  const g = new Graphics();
  const P = L.outfit.primary, S = L.outfit.secondary, A = L.outfit.accent;
  switch (L.back) {
    case 'cape': {
      const len = Hh * 0.6;
      g.moveTo(-Hh * 0.12 * w, 0).bezierCurveTo(-Hh * 0.22 * w, len * 0.4, -Hh * 0.3 * w, len * 0.8, -Hh * 0.26 * w, len).quadraticCurveTo(-Hh * 0.05, len * 1.05, Hh * 0.1 * w, len * 0.92).bezierCurveTo(Hh * 0.12 * w, len * 0.5, Hh * 0.15 * w, len * 0.2, Hh * 0.12 * w, 0).closePath()
        .fill(lin(shade(A === '#ffffff' ? S : A, -0.1), shade(A === '#ffffff' ? S : A, -0.6), 'h'));
      outline(g, 1.8, 0.6);
      break;
    }
    case 'scarf':
      g.moveTo(-Hh * 0.05, 0).bezierCurveTo(-Hh * 0.2, Hh * 0.02, -Hh * 0.32, Hh * 0.1, -Hh * 0.4, Hh * 0.05).lineTo(-Hh * 0.38, Hh * 0.12).bezierCurveTo(-Hh * 0.28, Hh * 0.16, -Hh * 0.15, Hh * 0.1, -Hh * 0.04, Hh * 0.05).closePath().fill(lin(shade(A, 0.1), shade(A, -0.4), 'h'));
      outline(g, 1.4, 0.5);
      break;
    case 'wings':
    case 'angel':
    case 'demon':
    case 'gears': {
      for (const s of [-1, 1]) {
        const k = s < 0 ? 1 : 0.8;
        if (L.back === 'angel') {
          for (let i = 0; i < 5; i++) {
            g.moveTo(s * Hh * 0.05, Hh * 0.05).quadraticCurveTo(s * Hh * (0.28 + i * 0.04) * k, -Hh * (0.25 - i * 0.07), s * Hh * (0.42 - i * 0.04) * k, -Hh * (0.22 - i * 0.1)).quadraticCurveTo(s * Hh * (0.2 + i * 0.03) * k, Hh * (0.02 + i * 0.03), s * Hh * 0.04, Hh * 0.1).closePath().fill(lin('#ffffff', shade(L.aura, -0.15)));
          }
          outline(g, 1.2, 0.35);
        } else if (L.back === 'demon') {
          g.moveTo(s * Hh * 0.05, Hh * 0.02).lineTo(s * Hh * 0.38 * k, -Hh * 0.3).lineTo(s * Hh * 0.33 * k, Hh * 0.05).lineTo(s * Hh * 0.25 * k, -Hh * 0.08).lineTo(s * Hh * 0.2 * k, Hh * 0.15).lineTo(s * Hh * 0.12 * k, Hh * 0.02).lineTo(s * Hh * 0.06, Hh * 0.16).closePath().fill(lin(shade(S, 0.1), shade(P, -0.5)));
          outline(g, 1.6, 0.7);
        } else if (L.back === 'gears') {
          const gr = Hh * 0.09;
          const cx = s * Hh * 0.18 * k, cy = -Hh * 0.02;
          for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.rect(cx + Math.cos(a) * gr - 4, cy + Math.sin(a) * gr - 4, 8, 8).fill({ color: 0xc8a84a }); }
          g.circle(cx, cy, gr).fill(rad('#fff0b0', '#8a6a1a'));
          outline(g, 1.6, 0.6);
          g.circle(cx, cy, gr * 0.4).fill({ color: hex(A) });
        } else {
          g.moveTo(s * Hh * 0.04, Hh * 0.04).bezierCurveTo(s * Hh * 0.25 * k, -Hh * 0.35, s * Hh * 0.45 * k, -Hh * 0.18, s * Hh * 0.4 * k, Hh * 0.08).bezierCurveTo(s * Hh * 0.3 * k, Hh * 0.0, s * Hh * 0.22 * k, Hh * 0.12, s * Hh * 0.05, Hh * 0.14).closePath().fill(lin(shade(L.aura, 0.3), shade(L.aura, -0.4)));
          outline(g, 1.5, 0.5);
        }
      }
      break;
    }
    case 'tail':
      g.moveTo(-Hh * 0.03, Hh * 0.28).bezierCurveTo(-Hh * 0.25, Hh * 0.35, -Hh * 0.35, Hh * 0.1, -Hh * 0.3, -Hh * 0.08).bezierCurveTo(-Hh * 0.22, Hh * 0.05, -Hh * 0.15, Hh * 0.25, Hh * 0.02, Hh * 0.22).closePath().fill(lin(shade(L.hair.color, 0.2), shade(L.hair.color, -0.4)));
      outline(g, 1.6, 0.6);
      g.circle(-Hh * 0.3, -Hh * 0.06, Hh * 0.03).fill({ color: 0xffffff, alpha: 0.7 });
      break;
    case 'quiver':
      g.roundRect(-Hh * 0.13, -Hh * 0.08, Hh * 0.07, Hh * 0.28, 6).fill(lin(shade('#6a4a2a', 0.2), shade('#6a4a2a', -0.4), 'h'));
      outline(g, 1.4, 0.6);
      for (let i = 0; i < 3; i++) g.moveTo(-Hh * 0.12 + i * Hh * 0.02, -Hh * 0.08).lineTo(-Hh * 0.13 + i * Hh * 0.025, -Hh * 0.16).stroke({ width: 2, color: hex(A) });
      break;
    case 'banner':
      g.moveTo(-Hh * 0.12, Hh * 0.1).lineTo(-Hh * 0.12, -Hh * 0.45).stroke({ width: 4, color: 0x6a4a2a });
      g.moveTo(-Hh * 0.12, -Hh * 0.44).lineTo(-Hh * 0.34, -Hh * 0.4).lineTo(-Hh * 0.3, -Hh * 0.28).lineTo(-Hh * 0.36, -Hh * 0.16).lineTo(-Hh * 0.12, -Hh * 0.2).closePath().fill(lin(shade(A, 0.2), shade(A, -0.4), 'h'));
      outline(g, 1.4, 0.6);
      break;
    case 'orbs': {
      const orbs = new Graphics();
      for (const [x, y] of [[-0.3, -0.15], [0.32, -0.25], [-0.2, -0.38]] as [number, number][]) {
        orbs.circle(x * Hh, y * Hh, Hh * 0.035).fill(rad('#ffffff', L.aura));
      }
      orbs.blendMode = 'add';
      c.addChild(orbs);
      break;
    }
  }
  c.addChild(g);
}

function drawWeapon(c: Container, tip: Container, L: Look, Hh: number) {
  const g = new Graphics();
  const A = L.outfit.accent, S = L.outfit.secondary;
  const metal = lin('#ffffff', '#7a8494', 'h', '#d8e0ea');
  const wood = lin('#9a6a3a', '#4a2a12', 'h');
  const goldG = lin('#fff6c8', '#a8842a', 'h');
  const glowCol = hex(L.aura);
  const addGlow = (x: number, y: number, r: number) => {
    const gl = glowSprite(glowCol, r * 3.2, r * 3.2, 0.75);
    gl.position.set(x, y);
    c.addChild(gl);
  };
  const k = Hh / 220;
  switch (L.weapon) {
    case 'sword':
    case 'katana':
    case 'greatsword': {
      const len = (L.weapon === 'greatsword' ? 150 : L.weapon === 'katana' ? 120 : 105) * k;
      const bw = (L.weapon === 'greatsword' ? 14 : L.weapon === 'katana' ? 6 : 9) * k;
      g.roundRect(-3 * k, -6 * k, 6 * k, 26 * k, 2).fill(wood);
      g.roundRect(-16 * k, 18 * k, 32 * k, 6 * k, 3).fill(goldG);
      outline(g, 1.4, 0.7);
      if (L.weapon === 'katana') g.moveTo(-bw / 2, 24 * k).quadraticCurveTo(bw * 1.5, len * 0.6, bw * 0.8, len + 24 * k).lineTo(bw / 2, 24 * k).closePath().fill(metal);
      else g.moveTo(-bw / 2, 24 * k).lineTo(-bw / 2, len).lineTo(0, len + 18 * k).lineTo(bw / 2, len).lineTo(bw / 2, 24 * k).closePath().fill(metal);
      outline(g, 1.4, 0.6);
      g.moveTo(0, 28 * k).lineTo(0, len).stroke({ width: 1.2, color: hex(A), alpha: 0.8 });
      tip.position.set(0, len);
      break;
    }
    case 'spear':
    case 'scythe':
    case 'staff': {
      const len = 175 * k;
      g.roundRect(-3.5 * k, -60 * k, 7 * k, len, 3).fill(L.weapon === 'staff' ? wood : lin('#5a5a6a', '#2a2a3a', 'h'));
      outline(g, 1.4, 0.6);
      if (L.weapon === 'spear') {
        g.moveTo(-8 * k, len - 64 * k).lineTo(0, len - 10 * k).lineTo(8 * k, len - 64 * k).lineTo(0, len - 76 * k).closePath().fill(metal);
        g.moveTo(-10 * k, len - 66 * k).lineTo(10 * k, len - 66 * k).stroke({ width: 4 * k, color: hex(L.outfit.accent) });
        tip.position.set(0, len - 30 * k);
      } else if (L.weapon === 'scythe') {
        g.moveTo(0, len - 62 * k).bezierCurveTo(40 * k, len - 70 * k, 70 * k, len - 30 * k, 60 * k, len - 5 * k).bezierCurveTo(48 * k, len - 40 * k, 25 * k, len - 52 * k, 0, len - 50 * k).closePath().fill(metal);
        tip.position.set(55 * k, len - 15 * k);
      } else {
        g.circle(0, len - 58 * k, 13 * k).fill(rad('#ffffff', L.aura));
        g.moveTo(-12 * k, len - 66 * k).quadraticCurveTo(0, len - 40 * k, 12 * k, len - 66 * k).stroke({ width: 3 * k, color: hex('#e8c86a') });
        addGlow(0, len - 58 * k, 20 * k);
        tip.position.set(0, len - 58 * k);
      }
      outline(g, 1.4, 0.6);
      break;
    }
    case 'bow': {
      g.moveTo(0, -40 * k).bezierCurveTo(30 * k, -20 * k, 30 * k, 60 * k, 0, 80 * k).stroke({ width: 5 * k, color: hex(shade(S, -0.1)), cap: 'round' });
      g.moveTo(0, -40 * k).lineTo(0, 80 * k).stroke({ width: 1, color: 0xffffff, alpha: 0.7 });
      g.circle(18 * k, 20 * k, 4 * k).fill({ color: hex(A) });
      tip.position.set(20 * k, 20 * k);
      break;
    }
    case 'dagger':
    case 'claws': {
      if (L.weapon === 'claws') for (const o of [-8, 0, 8]) g.moveTo(o * k, 6 * k).quadraticCurveTo((o + 6) * k, 30 * k, (o + 2) * k, 48 * k).lineTo((o + 4) * k, 8 * k).closePath().fill(metal);
      else {
        g.roundRect(-3 * k, -2 * k, 6 * k, 14 * k, 2).fill(wood);
        g.moveTo(-5 * k, 12 * k).lineTo(0, 56 * k).lineTo(5 * k, 12 * k).closePath().fill(metal);
      }
      outline(g, 1.2, 0.6);
      tip.position.set(0, 46 * k);
      break;
    }
    case 'hammer':
    case 'axe': {
      g.roundRect(-4 * k, -10 * k, 8 * k, 110 * k, 3).fill(wood);
      outline(g, 1.4, 0.6);
      if (L.weapon === 'hammer') g.roundRect(-26 * k, 82 * k, 52 * k, 34 * k, 6).fill(lin('#e0e6ee', '#5a6070', 'v'));
      else g.moveTo(0, 70 * k).bezierCurveTo(40 * k, 60 * k, 52 * k, 100 * k, 40 * k, 120 * k).bezierCurveTo(25 * k, 110 * k, 10 * k, 108 * k, 0, 110 * k).closePath().fill(metal);
      outline(g, 1.6, 0.7);
      tip.position.set(0, 100 * k);
      break;
    }
    case 'orb':
    case 'lantern':
    case 'clock': {
      if (L.weapon === 'lantern') {
        g.moveTo(0, 0).lineTo(0, 18 * k).stroke({ width: 2, color: 0x8a6a3a });
        g.roundRect(-12 * k, 18 * k, 24 * k, 30 * k, 6).fill(rad('#fffbe0', '#ffb84a'));
        outline(g, 1.6, 0.7);
      } else if (L.weapon === 'clock') {
        g.circle(0, 26 * k, 20 * k).fill(goldG);
        outline(g, 1.6, 0.7);
        g.circle(0, 26 * k, 15 * k).fill(rad('#ffffff', '#e8e0c8'));
        g.moveTo(0, 26 * k).lineTo(0, 15 * k).stroke({ width: 2, color: OUT });
        g.moveTo(0, 26 * k).lineTo(8 * k, 28 * k).stroke({ width: 2, color: OUT });
      } else {
        g.circle(0, 24 * k, 16 * k).fill(rad('#ffffff', L.aura, 0.35, 0.3));
        outline(g, 1.2, 0.4);
      }
      addGlow(0, 26 * k, 26 * k);
      tip.position.set(0, 26 * k);
      break;
    }
    case 'book':
      g.roundRect(-18 * k, 8 * k, 36 * k, 44 * k, 4).fill(lin(shade(L.outfit.primary, 0.2), shade(L.outfit.primary, -0.4), 'h'));
      outline(g, 1.6, 0.7);
      g.roundRect(-14 * k, 12 * k, 28 * k, 36 * k, 3).stroke({ width: 1.5, color: hex('#e8c86a') });
      g.circle(0, 30 * k, 6 * k).fill({ color: hex(A) });
      addGlow(0, 30 * k, 16 * k);
      tip.position.set(0, 30 * k);
      break;
    case 'fan':
      for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; g.moveTo(0, 6 * k).lineTo(Math.sin(a) * 50 * k, 6 * k + Math.cos(a) * 50 * k).stroke({ width: 3, color: hex(i % 2 ? A : S) }); }
      g.moveTo(0, 6 * k).arc(0, 6 * k, 50 * k, Math.PI / 2 - 0.9, Math.PI / 2 + 0.9).closePath().fill({ color: hex(A), alpha: 0.5 });
      tip.position.set(0, 40 * k);
      break;
    case 'shield':
      g.moveTo(-26 * k, 0).lineTo(26 * k, 0).lineTo(24 * k, 40 * k).quadraticCurveTo(0, 70 * k, -24 * k, 40 * k).closePath().fill(lin(shade(S, 0.45), shade(S, -0.4), 'd'));
      outline(g, 2, 0.8);
      g.moveTo(0, 6 * k).lineTo(0, 56 * k).moveTo(-18 * k, 20 * k).lineTo(18 * k, 20 * k).stroke({ width: 4 * k, color: hex(A) });
      tip.position.set(0, 26 * k);
      break;
    case 'gun':
      g.roundRect(-5 * k, -4 * k, 10 * k, 20 * k, 3).fill(wood);
      g.roundRect(-6 * k, 14 * k, 12 * k, 44 * k, 3).fill(lin('#c8c8d0', '#4a4a5a', 'h'));
      outline(g, 1.4, 0.7);
      tip.position.set(0, 58 * k);
      break;
    case 'gauntlet':
      g.circle(0, 8 * k, 16 * k).fill(rad(shade(S, 0.5), shade(S, -0.4)));
      outline(g, 1.8, 0.8);
      for (const o of [-8, 0, 8]) g.circle(o * k, 18 * k, 4 * k).fill({ color: hex(A) });
      addGlow(0, 10 * k, 18 * k);
      tip.position.set(0, 12 * k);
      break;
    case 'chakram':
      g.circle(0, 26 * k, 22 * k).stroke({ width: 6 * k, color: 0xd8e0ea });
      g.circle(0, 26 * k, 22 * k).stroke({ width: 1.5, color: hex(A) });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.moveTo(Math.cos(a) * 22 * k, 26 * k + Math.sin(a) * 22 * k).lineTo(Math.cos(a + 0.3) * 30 * k, 26 * k + Math.sin(a + 0.3) * 30 * k).stroke({ width: 3, color: 0xffffff }); }
      tip.position.set(0, 26 * k);
      break;
    case 'whip':
      g.moveTo(0, 0).bezierCurveTo(30 * k, 30 * k, -30 * k, 60 * k, 10 * k, 100 * k).bezierCurveTo(30 * k, 120 * k, 50 * k, 110 * k, 60 * k, 130 * k).stroke({ width: 3 * k, color: hex(shade(A, -0.2)), cap: 'round' });
      for (let i = 0; i < 5; i++) g.circle(10 * k + i * 10 * k, 100 * k + i * 6 * k, 3 * k).fill({ color: hex(A) });
      tip.position.set(60 * k, 130 * k);
      break;
    case 'harp':
      g.moveTo(-14 * k, 4 * k).quadraticCurveTo(-28 * k, 40 * k, -6 * k, 64 * k).lineTo(22 * k, 64 * k).quadraticCurveTo(16 * k, 30 * k, -14 * k, 4 * k).stroke({ width: 5 * k, color: hex('#e8c86a') });
      for (let i = 0; i < 5; i++) g.moveTo(-10 * k + i * 6 * k, 14 * k + i * 4 * k).lineTo(-6 * k + i * 6 * k, 62 * k).stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      addGlow(4 * k, 36 * k, 20 * k);
      tip.position.set(4 * k, 36 * k);
      break;
  }
  c.addChildAt(g, 0);
  c.addChild(tip);
}

export function destroyPuppet(r: Rig) {
  r.stop();
  r.root.destroy({ children: true });
}

/** Soft ground shadow sprite. */
export function shadowFor(width: number) {
  const s = new Sprite(fxTex('circle_05'));
  s.anchor.set(0.5);
  s.tint = 0x000000;
  s.alpha = 0.55;
  s.width = width;
  s.height = width * 0.28;
  return s;
}
