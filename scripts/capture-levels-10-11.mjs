/** Capture level 10–11 frames. GAME_URL default /the-game/ */
import fs from 'node:fs';
import path from 'node:path';
const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:4173/the-game/';
fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });
const puppeteer = await import('/tmp/pp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js');
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox','--disable-gpu','--window-size=1280,800'], defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 20000 });
const save = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name);
};
await page.evaluate(() => { const g=window.__novgorod; g.touch?.setVisible?.(false); const el=document.querySelector('.tc-root'); if(el) el.style.display='none'; g.gotoRehab(); });
await sleep(500);
for (let i=0;i<4;i++){ await page.keyboard.press('Enter'); await sleep(80); }
await sleep(200); await save('level10-schedule.png');
await page.evaluate(() => window.__novgorod.rehab.debugForceDone());
await sleep(200); await save('level10-done.png');
await page.evaluate(() => window.__novgorod.gotoKrug());
await sleep(500);
for (let i=0;i<5;i++){ await page.keyboard.press('Enter'); await sleep(80); }
await sleep(300); await save('level11-circle.png');
await page.keyboard.press('Digit1'); await sleep(700); await save('level11-honesty.png');
await page.evaluate(() => window.__novgorod.krug.debugForceDone());
await sleep(200); await save('level11-done.png');
await browser.close();
