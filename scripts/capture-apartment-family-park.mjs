/**
 * Capture apartment family / wallpaper / park-window proof screenshots.
 */
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:4173/novgorod-1995/';

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
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 10000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait for art assets
await page.waitForFunction(
  async () => {
    const urls = [
      'art/family-photo.png',
      'art/wallpaper-tile.png',
      'art/park-monument.png',
      'art/white-moose.png',
      'art/aerials-poster.png',
    ];
    const base = document.querySelector('base')?.href || location.href;
    await Promise.all(
      urls.map(
        (u) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => reject(new Error(u));
            img.src = new URL(u, base).href;
          }),
      ),
    );
    return true;
  },
  { timeout: 20000 },
);

const saveCanvas = async (name) => {
  const dataUrl = await page.evaluate(() => {
    const g = window.__novgorod;
    g.touch?.setVisible?.(false);
    const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
    if (el) el.style.display = 'none';
    return g.captureCanvas();
  });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const out = path.join(MEDIA, name);
  const art = path.join(ARTIFACTS, name);
  fs.writeFileSync(out, buf);
  fs.writeFileSync(art, buf);
  console.log('saved', name, buf.length);
};

// Room: wallpaper, small family frame, smaller poster, bigger window + parade
await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('introDone', true);
  g.states.setFlag('diaryUnlocked', true);
  g.states.setFlag('seenPhoto', true);
  const d = g.apartment.getDialogue?.();
  d?.resetSilent?.();
  g.apartment.setOverlay?.('none');
  g.hud.set({ objective: 'Дневник - ур. 1', eraLabel: 'ЗУИЧ · 2026', levelTitle: 'Хрущёвка' });
  g.player.x = 160;
  g.player.y = 192;
  g.player.era = 'adult';
  g.beer.resetForApartment?.();
});
// Parade period ~28s; sample a few frames and keep the busiest window
let best = null;
let bestScore = -1;
for (let t = 0; t < 8; t++) {
  await sleep(700);
  const score = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    if (!(c instanceof HTMLCanvasElement)) return 0;
    const ctx = c.getContext('2d');
    if (!ctx) return 0;
    // Sample glass region (logical ~206,34 → 296,104) scaled to buffer
    const m = window.__novgorod.display.getMetrics();
    const scale = m.bufferWidth / 320;
    const x0 = Math.floor(206 * scale);
    const y0 = Math.floor(34 * scale);
    const w = Math.floor(90 * scale);
    const h = Math.floor(70 * scale);
    const data = ctx.getImageData(x0, y0, w, h).data;
    let bright = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] + data[i + 1] + data[i + 2] > 220) bright++;
    }
    return bright;
  });
  if (score > bestScore) {
    bestScore = score;
    best = await page.evaluate(() => window.__novgorod.captureCanvas());
  }
}
{
  const buf = Buffer.from(best.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, 'apartment-family-wall.png'), buf);
  fs.writeFileSync(path.join(ARTIFACTS, 'apartment-family-wall.png'), buf);
  console.log('saved apartment-family-wall.png', buf.length, 'score', bestScore);
}

// Diary family photo overlay
await page.evaluate(() => {
  const g = window.__novgorod;
  g.apartment.getDialogue?.()?.resetSilent?.();
  g.apartment.setOverlay?.('photo');
});
await sleep(500);
await saveCanvas('diary-family-photo.png');

await browser.close();
console.log('done');
