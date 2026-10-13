import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: 'client',
  publicDir: 'public',
  resolve: { alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: { outDir: '../dist/client', emptyOutDir: true, chunkSizeWarningLimit: 2000, rollupOptions: { input: { main: 'client/index.html', preview: 'client/preview.html' } } },
});
