/**
 * Capture father-room CRT: Stierlitz (t<5) then Putin (t>=5).
 * Usage: GAME_URL=http://127.0.0.1:4173/ node scripts/capture-father-tv.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:4173/';

fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });

const puppeteerPaths = [
  '/tmp/pp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js',
  '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js',
];
let puppeteer;
for (const p of puppeteerPaths) {
  if (fs.existsSync(p)) {
    puppeteer = await import(p);
    break;
  }
}
if (!puppeteer) {
  console.error('puppeteer-core not found');
  process.exit(1);
}

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
  g.states.setFlag('level1Cleared', true);
  g.gotoPodezd();
});
await sleep(900);

// Freeze near father so CRT + face are clear; hide touch chrome
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 200;
  g.player.facing = 1;
  g.touch?.setVisible?.(false);
  const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
  if (el) el.style.display = 'none';
  g.hud.set({
    objective: 'Подойди к отцу',
    eraLabel: 'ЗУИЧ · 1995',
    levelTitle: 'Выпускной',
  });
});

const saveCanvas = async (name) => {
  // Wait for TV photo decode
  await page.waitForFunction(
    async () => {
      const imgs = [...document.images].filter((i) =>
        /tv-stierlitz|tv-putin/.test(i.src),
      );
      if (imgs.length === 0) return true;
      return imgs.every((i) => i.complete && i.naturalWidth > 0);
    },
    { timeout: 8000 },
  );
  await sleep(400);
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name, buf.length);
};

// Force early time → Stierlitz
await page.evaluate(() => {
  window.__novgorod.podezd.__debug.setTime(1.2);
});
await sleep(200);
await saveCanvas('father-tv-stierlitz.png');

// Force after switch → Putin
await page.evaluate(() => {
  window.__novgorod.podezd.__debug.setTime(6.5);
});
await sleep(300);
await saveCanvas('father-tv-putin.png');

await browser.close();
console.log('done');
