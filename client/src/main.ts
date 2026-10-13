import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/marcellus/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './style.css';
import '@shared/data/index';
import { PLAYABLE } from '@shared/data/index';
import { HEROES } from '@shared/engine/registry';
import { initApp, layers, W } from './gfx/app';
import { loadTextures } from './gfx/textures';
import { buildPuppet, shadowFor } from './gfx/puppet';
import { Text } from 'pixi.js';

async function gallery() {
  await initApp();
  await loadTextures();
  const q = new URLSearchParams(location.search);
  let list = q.get('gallery') === 'monsters' ? Object.values(HEROES).filter((h) => h.monster) : PLAYABLE();
  if (q.get('ids')) list = q.get('ids')!.split(',').map((id) => HEROES[id]);
  const size = Number(q.get('size') || 130);
  const cols = Number(q.get('cols') || 10);
  const cw = W() / cols;
  list.forEach((h, i) => {
    const x = (i % cols) * cw + cw / 2;
    const y = Math.floor(i / cols) * size * 1.35 + size * 1.23;
    const sh = shadowFor(size * 0.55);
    sh.position.set(x, y);
    layers.world.addChild(sh);
    const r = buildPuppet(h, size, 1);
    r.root.position.set(x, y);
    layers.world.addChild(r.root);
    const t = new Text({ text: h.name, style: { fill: '#fff', fontSize: 11, fontFamily: 'Inter' } });
    t.anchor.set(0.5, 0);
    t.position.set(x, y + 4);
    layers.world.addChild(t);
  });
}
if (location.search.includes('gallery')) void gallery();
