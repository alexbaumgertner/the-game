/**
 * Capture early + deep beer-thirst visuals (progressive desat + overhead thoughts).
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
await sleep(800);

const setupApartment = async () => {
  await page.evaluate(() => {
    const g = window.__novgorod;
    g.states.setFlag('introDone', true);
    g.states.setFlag('diaryUnlocked', true);
    g.states.setFlag('seenPhoto', true);
    const d = g.apartment.getDialogue?.();
    d?.resetSilent?.();
    g.apartment.setOverlay?.('none');
    g.hud.set({
      objective: 'Найди пиво',
      eraLabel: 'ЗУИЧ · 2026',
      levelTitle: 'Хрущёвка',
    });
    g.player.x = 160;
    g.player.y = 192;
    g.player.era = 'adult';
    g.beer.enabled = true;
    g.beer.showLongHint = false;
    g.beer.cans = 0;
    g.touch?.setVisible?.(false);
    const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
    if (el) el.style.display = 'none';
  });
};

const seedThirst = async (secondsLeft, settleMs = 3200) => {
  await page.evaluate((t) => {
    const b = window.__novgorod.beer;
    b.thirst = t;
    b.enabled = true;
    // Force a couple of thought cycles without waiting wall-clock.
    b.update(0.05);
    b.update(3);
    b.update(3);
    b.update(2.5);
  }, secondsLeft);
  await sleep(settleMs);
};

const saveCanvas = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name, buf.length);
};

await setupApartment();

// Early lack (~90s left → ~25% through timer): mild desat + thoughts over head
await seedThirst(90, 2800);
await saveCanvas('beer-thirst-immediate.png');

// Deeper lack (~20s left): strong desat + denser thoughts; still not frozen
await seedThirst(20, 2800);
await saveCanvas('beer-thirst-deep.png');

await browser.close();
console.log('done');
