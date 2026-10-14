import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// `vite build --mode offline` makes the standalone build: the game server runs inside the page.
export default defineConfig(({ mode }) => ({
  root: 'client',
  publicDir: 'public',
  base: './',
  resolve: {
    alias: {
      '@shared': r('./shared'),
      ...(mode === 'offline' ? { 'node:crypto': r('./client/src/offline/crypto-shim.ts') } : {}),
    },
  },
  define: mode === 'offline' ? { 'process.env.RTA_BOT_WAIT_MS': '"2500"' } : {},
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: {
    outDir: mode === 'offline' ? '../dist/offline' : '../dist/client',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: mode === 'offline' ? { main: 'client/index.html' } : { main: 'client/index.html', preview: 'client/preview.html' } },
  },
}));
