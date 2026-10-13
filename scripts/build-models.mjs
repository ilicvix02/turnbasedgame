// Copies the CC0 Quaternius 3D packs into client/public/models and downsizes textures for the web.
//   node scripts/build-models.mjs <dir with extracted packs: x_ubc x_outfits x_ual x_bestiary>
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const src = process.argv[2];
const OUT = 'client/public/models';
rmSync(OUT, { recursive: true, force: true });
const copyDir = (from, to, filter = () => true) => {
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from)) if (filter(f)) cpSync(join(from, f), join(to, f));
};
const UBC = join(src, 'x_ubc', 'Universal Base Characters[Standard]');
const OUTF = join(src, 'x_outfits', 'Modular Character Outfits - Fantasy[Standard]', 'Exports', 'glTF (Godot-Unreal)');
copyDir(join(UBC, 'Base Characters', 'Godot - UE'), join(OUT, 'base'));
copyDir(join(UBC, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)'), join(OUT, 'hair'));
copyDir(join(OUTF, 'Modular Parts'), join(OUT, 'parts'));
copyDir(join(OUTF, 'Outfits'), join(OUT, 'parts'), (f) => f.endsWith('.png'));
mkdirSync(join(OUT, 'anim'), { recursive: true });
cpSync(join(src, 'x_ual', 'Universal Animation Library[Standard]', 'Unreal-Godot', 'UAL1_Standard.glb'), join(OUT, 'anim', 'ual.glb'));
copyDir(join(src, 'x_bestiary', 'Bestiary - Dungeon Monsters Kit[Standard]', 'Exports', 'GLB (Godot-Unreal)'), join(OUT, 'monsters'), (f) => f.endsWith('.glb'));
// the base glTFs reference a few *_png.png names that ship without the suffix
for (const [a, b] of [['T_Eye_Normal.png', 'T_Eye_Normal_png.png'], ['T_Hair_1_Normal.png', 'T_Hair_1_Normal_png.png'], ['T_Hair_2_Normal.png', 'T_Hair_2_Normal_png.png']]) {
  try { cpSync(join(OUT, 'base', a), join(OUT, 'base', b)); } catch { /* optional */ }
}
// downsize textures (4K → 1K; roughness/ORM/normal 512)
for (const dir of ['base', 'hair', 'parts']) {
  for (const f of readdirSync(join(OUT, dir)).filter((x) => x.endsWith('.png'))) {
    const size = /Normal|ORM|Roughness/.test(f) ? '512x512' : '1024x1024';
    execFileSync('convert', [join(OUT, dir, f), '-resize', `${size}>`, '-strip', join(OUT, dir, f)]);
  }
}
// monsters embed 4K textures — shrink them
for (const f of readdirSync(join(OUT, 'monsters'))) {
  const p = join(OUT, 'monsters', f);
  execFileSync('npx', ['gltf-transform', 'resize', p, p, '--width', '1024', '--height', '1024']);
}
console.log('models ready');
