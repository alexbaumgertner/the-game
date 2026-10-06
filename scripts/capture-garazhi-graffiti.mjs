/**
 * Capture Garazhi1995 with «Гараж» wheatpaste graffiti visible (quiz closed).
 * Usage: GAME_URL=http://127.0.0.1:4173/the-game/ node scripts/capture-garazhi-graffiti.mjs
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
await sleep(400);

await page.evaluate(() => {
  const g = window.__novgorod;
  g.gotoGarazhi();
  g.touch?.setVisible?.(false);
  document.querySelectorAll('.tc-root, #touch-controls, .touch-controls').forEach((el) => {
    el.style.display = 'none';
  });
});
await sleep(1600);

const saveAt = async (name, x) => {
  await page.evaluate(() => {
    const g = window.__novgorod;
    if (g.loop.isPaused) g.loop.resume();
  });
  await sleep(120);
  await page.evaluate((px) => {
    const g = window.__novgorod;
    g.loop.pause();
    g.player.x = px;
    g.garazhi.getQuiz()?.closeSilent?.();
  }, x);
  await sleep(100);
  await page.evaluate(() => window.__novgorod.garazhi.getQuiz()?.closeSilent?.());
  const dataUrl = await page.evaluate(() => {
    window.__novgorod.garazhi.getQuiz()?.closeSilent?.();
    return window.__novgorod.captureCanvas();
  });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('wrote', name, buf.length);
};

await saveAt('garazhi-garage-graffiti.png', 150);
await saveAt('garazhi-garage-graffiti-mid.png', 310);

await browser.close();
console.log('done');
