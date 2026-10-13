// Automated play-through with screenshots: node scripts/playtest.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [base = 'http://localhost:8790', out = 'shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`.slice(0, 300)); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const shot = async (n) => { await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(base);
await wait(9000);
await shot('01-title');
await page.mouse.click(800, 450);
await wait(800);
const name = 'tester' + Math.floor(Math.random() * 1e5);
await page.fill('input[autocomplete=username]', name);
await page.fill('input[type=password]', 'password123');
await shot('02-signup');
await page.click('.auth .btn');
await wait(6000);
await shot('03-prologue');
await page.click('.skipbtn').catch(() => {});
await wait(12000);
await shot('04-tutorial-start');
// play first turn manually: click skill 1 then first enemy via keyboard Enter
await page.keyboard.press('Enter');
await wait(5000);
await shot('05-tutorial-action');
await page.click('.hud-btn:has-text("AUTO")').catch(() => {});
await page.click('.hud-btn:has-text("1×")').catch(() => {});
await page.click('.hud-btn:has-text("2×")').catch(() => {});
for (let i = 0; i < 40; i++) {
  await wait(3000);
  if (i === 3) await shot('06-tutorial-mid');
  if (await page.$('.result')) break;
}
await shot('07-result');
await page.click('.result .btn').catch(() => {});
await wait(4000);
await page.click('.skipbtn').catch(() => {});
await wait(6000);
await shot('08-lobby');
console.log(logs.slice(0, 40).join('\n'));
await browser.close();
