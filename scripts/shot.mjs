// Screenshot helper: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs] [actions-json]
import { chromium } from 'playwright-core';
const [url, out, w = '1600', h = '900', waitMs = '2500', actions = '[]'] = process.argv.slice(2);
const exe = process.env.CHROME || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(Number(waitMs));
for (const a of JSON.parse(actions)) {
  if (a.click) await page.click(a.click, { timeout: 5000 }).catch((e) => logs.push('click fail ' + a.click + ' ' + e.message));
  if (a.fill) await page.fill(a.fill[0], a.fill[1]);
  if (a.key) await page.keyboard.press(a.key);
  if (a.eval) logs.push('eval: ' + JSON.stringify(await page.evaluate(a.eval)));
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: a.shot });
}
await page.screenshot({ path: out });
console.log(logs.slice(-30).join('\n'));
await browser.close();
