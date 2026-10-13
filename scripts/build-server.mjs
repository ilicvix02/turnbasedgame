// Bundles the server (and the shared engine it imports) into dist/server.mjs.
import { build } from 'esbuild';
await build({
  entryPoints: ['server/src/index.ts'],
  outfile: 'dist/server.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: ['bufferutil', 'utf-8-validate'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
console.log('built dist/server.mjs');
