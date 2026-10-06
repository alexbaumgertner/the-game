/**
 * Level 9 Army — in-game plate captures (parade → formation → slogan → yard → soldier).
 */
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:4173/the-game/';

fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });

const puppeteer = await import(
  '/tmp/pp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800'],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 20000 });
await sleep(500);

const save = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name, buf.length);
};

await page.evaluate(() => {
  const g = window.__novgorod;
  g.touch?.setVisible?.(false);
  const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
  if (el) el.style.display = 'none';
  g.gotoArmiya();
});
await sleep(800);

// Dismiss intro dialogue
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Enter');
  await sleep(120);
}
await sleep(400);

// Wait for plates to load
await page.waitForFunction(
  () => {
    const g = window.__novgorod;
    return !!g?.armiya?.debugSetViewProgress;
  },
  { timeout: 10000 },
);
await sleep(1200);

const shots = [
  { name: 'army-ingame-parade.png', progress: 0.08 },
  { name: 'army-ingame-formation.png', progress: 0.32 },
  { name: 'army-ingame-slogan.png', progress: 0.52 },
  { name: 'army-ingame-yard.png', progress: 0.72 },
  { name: 'army-ingame-soldier.png', progress: 0.92 },
];

for (const s of shots) {
  await page.evaluate((p) => {
    window.__novgorod.armiya.debugSetViewProgress(p);
  }, s.progress);
  await sleep(350);
  await save(s.name);
}

// General level shot (live progress, round play)
await page.evaluate(() => {
  window.__novgorod.armiya.debugSetViewProgress(0.2);
});
await sleep(200);
await save('level9-armiya-plates.png');
await save('army-ingame.png');

await browser.close();
console.log('done');
