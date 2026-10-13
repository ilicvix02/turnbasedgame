// Summoning altar: 1× / 10× with pity, 3D portal and hero reveal sequence.
import * as THREE from 'three';
import { getHero } from '@shared/engine/registry';
import { PITY, SUMMON_COST, SUMMON_RATES } from '@shared/meta/profile';
import { ELEMENT_COLORS } from '@shared/data/index';
import { $ui, h, icon, sleep, toast } from '../core/dom';
import { api, store } from '../core/api';
import { music, sfx } from '../core/audio';
import { go, heroCard, heroMeta, register, topbar } from '../ui';
import { menuFx, menuStage, setCam, showHeroes } from '../menu3d';

register('summon', async () => {
  void music('map');
  const { stage } = menuStage();
  await showHeroes([], 'summon');
  setCam(new THREE.Vector3(0, 1.6, 6), new THREE.Vector3(0, 1.4, 0));
  // portal ring
  const portal = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 16, 96), new THREE.MeshStandardMaterial({ color: 0xffd86a, emissive: 0xffb02a, emissiveIntensity: 2.2, toneMapped: false }));
  const inner = new THREE.Mesh(new THREE.CircleGeometry(1.55, 64), new THREE.MeshBasicMaterial({ color: 0x6a4aff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  portal.add(ring, inner);
  portal.position.set(0, 1.7, -0.5);
  stage.scene.add(portal);
  const offSpin = stage.tick((dt, t) => { ring.rotation.z += dt * 0.4; (inner.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.sin(t * 2) * 0.08; });

  const results = h('div', { class: 'summon-results' });
  const pityEl = h('div', { class: 'small dim' });
  const update = () => { const p = store.profile!; pityEl.textContent = `Guaranteed 5★ within ${PITY - p.summon.pity} summons · ${p.summon.total} total summons`; };
  update();
  const doSummon = async (count: 1 | 10) => {
    results.innerHTML = '';
    let r: { results: { uid: string; heroId: string; rarity: number; isNew: boolean }[] };
    try { r = await api.action('summon', { count }); } catch (e) { toast((e as Error).message, 'err'); return; }
    update();
    const fx = menuFx()!;
    const best = Math.max(...r.results.map((x) => x.rarity));
    const color = best === 5 ? 0xffcf5a : best === 4 ? 0xc48cff : 0x6fb7ff;
    (inner.material as THREE.MeshBasicMaterial).color.set(color);
    sfx('ui_maximize');
    for (let i = 0; i < 6; i++) { fx.burst(portal.position, { tex: 'star_04', color, count: 30, speed: 7, size: 0.25, life: 1 }); await sleep(120); }
    fx.flare(portal.position, { tex: 'flare_01', color, size: 8, life: 0.8 });
    sfx(best >= 5 ? 'j_rare' : 'j_summon');
    await sleep(400);
    const top = r.results.slice().sort((a, b) => b.rarity - a.rarity)[0];
    await showHeroes([top.heroId], 'summon');
    setCam(new THREE.Vector3(0, 1.4, 4.4), new THREE.Vector3(0, 1.1, 0));
    const def = getHero(top.heroId);
    const intro = h('div', { class: 'cutin t0', style: `--c:${ELEMENT_COLORS[def.element]}` }, h('div', { class: 'cut-band' }), h('div', { class: 'cut-text', style: 'left:8%' }, h('div', { class: 'cut-skill' }, `${'★'.repeat(def.rarity)} ${top.isNew ? 'NEW HERO' : 'DUPLICATE'}`), h('div', { class: 'cut-hero' }, def.name), h('div', { class: 'cut-skill', style: 'font-size:14px;letter-spacing:.1em' }, def.title), h('div', { style: 'margin-top:8px' }, heroMeta(def.id))));
    $ui().appendChild(intro);
    await sleep(2200);
    intro.classList.add('out');
    setTimeout(() => intro.remove(), 400);
    r.results.forEach((x, i) => {
      const c = heroCard({ heroId: x.heroId, level: 1 }, { onclick: () => void go('hero', x.uid), tag: x.isNew ? 'NEW' : undefined });
      c.style.animationDelay = `${i * 0.08}s`;
      results.appendChild(c);
    });
  };
  const p = store.profile!;
  $ui().appendChild(h('div', { class: 'screen page' },
    topbar('Summoning Altar'),
    h('div', { class: 'summon-wrap' },
      results,
      h('div', { class: 'panel gilded', style: 'padding:16px 22px;display:flex;flex-direction:column;gap:10px;align-items:center' },
        h('div', { class: 'title', style: 'font-size:20px' }, 'Covenant Summon'),
        h('div', { class: 'rates' }, `5★ ${SUMMON_RATES[5] * 100}% · 4★ ${SUMMON_RATES[4] * 100}% · 3★ ${Math.round(SUMMON_RATES[3] * 100)}% · 10× guarantees a 4★ or better`),
        pityEl,
        h('div', { class: 'row' },
          h('button', { class: 'btn violet big', onclick: () => doSummon(1) }, icon('crystal-cluster'), `×1 · ${SUMMON_COST}`),
          h('button', { class: 'btn big', onclick: () => doSummon(10) }, icon('crystal-cluster'), `×10 · ${SUMMON_COST * 10}`),
        ),
        h('div', { class: 'tiny mute' }, `You have ${p.crystals} crystals. Earn more from the campaign, Arena, World Arena and the daily gift.`),
      ),
    ),
  ));
  const obs = new MutationObserver(() => { if (!document.body.contains(results)) { offSpin(); portal.removeFromParent(); obs.disconnect(); } });
  obs.observe(document.getElementById('ui')!, { childList: true });
});
