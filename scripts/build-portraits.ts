// Pre-renders every hero portrait (bust + full body) from the 3D models into client/public/portraits/*.webp.
//   npx vite build && npx vite preview --port 4173 &  then  npx tsx scripts/build-portraits.ts http://localhost:4173
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
await page.goto(`${base}/preview.html?ids=wisp&portraits=1`);
await page.waitForFunction(() => (window as any).__portraits, null, { timeout: 600000, polling: 1000 });
const out = await page.evaluate(() => (window as any).__portraits as Record<string, string>);
mkdirSync('client/public/portraits', { recursive: true });
for (const [k, url] of Object.entries(out)) writeFileSync(`client/public/portraits/${k}.webp`, Buffer.from(url.split(',')[1], 'base64'));
console.log('portraits:', Object.keys(out).length);
await browser.close();
