/**
 * Capture Vokzal1995 with «Вокзал для двоих» wall posters visible.
 */
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:4173/';

fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });

const puppeteer = await import(
  '/tmp/pp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
).catch(async () =>
  import('/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'),
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
await sleep(600);

await page.evaluate(() => {
  const g = window.__novgorod;
  g.gotoVokzal();
  g.touch?.setVisible?.(false);
  const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
  if (el) el.style.display = 'none';
});
await sleep(1200);

// Pan so hall posters + mid bay are in frame
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 160;
  g.player.y = 188;
});
await sleep(500);

const saveCanvas = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('wrote', name, buf.length);
};

await saveCanvas('vokzal-film-posters.png');

// Second frame further right for snow/official bays
await page.evaluate(() => {
  window.__novgorod.player.x = 360;
});
await sleep(400);
await saveCanvas('vokzal-film-posters-mid.png');

await browser.close();
console.log('done');
