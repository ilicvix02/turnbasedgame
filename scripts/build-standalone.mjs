// Standalone build for static hosts that only serve web file types (e.g. claude.ai artifacts):
//   node scripts/build-standalone.mjs [outDir]
// Builds `vite --mode offline`, repacks every .gltf/.glb (+.bin) into one self-contained .json glTF,
// rewrites model URLs in the bundle, drops .woff (woff2 is enough) and emits a body-only aethra.html.
import { execSync } from 'node:child_process';
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const out = process.argv[2] || 'dist/standalone';
execSync('npx vite build --mode offline', { stdio: 'inherit' });
rmSync(out, { recursive: true, force: true });
cpSync('dist/offline', out, { recursive: true });
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const dataUri = (buf) => 'data:application/octet-stream;base64,' + buf.toString('base64');

for (const f of walk(join(out, 'models'))) {
  if (f.endsWith('.gltf')) {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    for (const b of j.buffers || []) if (b.uri && !b.uri.startsWith('data:')) { const p = join(dirname(f), decodeURIComponent(b.uri)); b.uri = dataUri(readFileSync(p)); rmSync(p, { force: true }); }
    writeFileSync(f.replace(/\.gltf$/, '.json'), JSON.stringify(j));
    rmSync(f);
  } else if (f.endsWith('.glb')) {
    const g = readFileSync(f);
    const jsonLen = g.readUInt32LE(12);
    const j = JSON.parse(g.subarray(20, 20 + jsonLen).toString('utf8'));
    const binStart = 20 + jsonLen;
    if (binStart < g.length) { const binLen = g.readUInt32LE(binStart); j.buffers[0].uri = dataUri(g.subarray(binStart + 8, binStart + 8 + binLen)); }
    writeFileSync(f.replace(/\.glb$/, '.json'), JSON.stringify(j));
    rmSync(f);
  }
}
for (const f of walk(out)) {
  if (f.endsWith('.woff')) rmSync(f);
  else if (f.endsWith('.bin')) rmSync(f);
  else if (f.endsWith('.js')) writeFileSync(f, readFileSync(f, 'utf8').replace(/\.(gltf|glb)(?=[`'"])/g, '.json'));
}
const html = readFileSync(join(out, 'index.html'), 'utf8');
const js = html.match(/src="\.\/(assets\/main-[^"]+\.js)"/)[1];
const css = html.match(/href="\.\/(assets\/main-[^"]+\.css)"/)[1];
writeFileSync(join(out, 'aethra.html'), `<title>Aethra: Seven Thrones</title>
<meta name="theme-color" content="#0b0a14">
<link rel="stylesheet" href="./${css}">
<style>:root{color-scheme:dark}html,body{background:#0b0a14;height:100%}</style>
<div id="stage"></div>
<div id="ui"></div>
<div id="overlay"></div>
<div id="toasts"></div>
<script type="module" src="./${js}"></script>
`);
rmSync(join(out, 'index.html'));
console.log('standalone build in', out, '-', walk(out).length, 'files');
