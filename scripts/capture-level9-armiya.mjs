/**
 * Level 9 Army screenshots (round, low spark, night, closing).
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
await sleep(400);

const save = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name);
};

await page.evaluate(() => {
  const g = window.__novgorod;
  g.touch?.setVisible?.(false);
  const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
  if (el) el.style.display = 'none';
  g.gotoArmiya();
});
await sleep(600);
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Enter');
  await sleep(100);
}
await sleep(300);
await save('level9-round-task.png');

await page.keyboard.down('KeyE');
await sleep(700);
await page.keyboard.up('KeyE');
await page.evaluate(() => {
  window.__novgorod.spark.value = 0.25;
});
await sleep(200);
await save('level9-low-spark.png');

await page.evaluate(() => window.__novgorod.armiya.debugForceNight());
await sleep(300);
await save('level9-night-choices.png');

await page.evaluate(() => window.__novgorod.armiya.debugForceDone());
await sleep(300);
await save('level9-closing.png');

await browser.close();
console.log('done');
