/**
 * Capture Vokzal1995 with «Вокзал для двоих» wall posters visible (quiz closed).
 * Usage: GAME_URL=http://127.0.0.1:4173/ node scripts/capture-vokzal-posters.mjs
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
await sleep(500);

await page.evaluate(() => {
  const g = window.__novgorod;
  g.gotoVokzal();
  g.touch?.setVisible?.(false);
  const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
  if (el) el.style.display = 'none';
});
await sleep(1200);

const saveAt = async (name, x) => {
  await page.evaluate((px) => {
    const g = window.__novgorod;
    if (g.loop.isPaused) g.loop.resume();
    g.player.x = px;
    g.vokzal.getQuiz()?.closeSilent?.();
  }, x);
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.__novgorod.vokzal.getQuiz()?.closeSilent?.());
    await sleep(40);
  }
  await page.evaluate(() => {
    const g = window.__novgorod;
    g.vokzal.getQuiz()?.closeSilent?.();
    g.loop.pause();
    g.vokzal.getQuiz()?.closeSilent?.();
  });
  await sleep(120);
  const dataUrl = await page.evaluate(() => {
    window.__novgorod.vokzal.getQuiz()?.closeSilent?.();
    return window.__novgorod.captureCanvas();
  });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('wrote', name, buf.length);
  await page.evaluate(() => window.__novgorod.loop.resume());
};

await saveAt('vokzal-film-posters.png', 130);
await saveAt('vokzal-film-posters-mid.png', 380);

await browser.close();
console.log('done');
