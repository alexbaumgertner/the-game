/**
 * Capture hi-detail art proof screenshots (canvas-only, no dialogue).
 */
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/novgorod-1995/';

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

// Skip intro completely
await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('introDone', true);
  g.states.setFlag('diaryUnlocked', true);
  g.states.setFlag('seenPhoto', true);
  // Close any dialogue
  const d = g.apartment.getDialogue?.();
  if (d) {
    while (d.isOpen) {
      d.advance?.() || d.close?.();
      if (d.isOpen && d.hasChoices) d.pick?.(0);
      break;
    }
    // Force-close if still open
    if (typeof d.forceClose === 'function') d.forceClose();
    d.isOpen = false;
  }
  g.hud.set({ objective: 'Открой комод' });
  g.player.x = 150;
  g.player.y = 192;
  g.player.era = 'adult';
  g.beer.resetForApartment?.();
});
await sleep(500);
await saveCanvas('detail-apartment.png');

await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 85;
  g.player.y = 192;
});
await sleep(300);
await saveCanvas('detail-hero-cat.png');

await page.evaluate(() => {
  window.__novgorod.gotoRynok();
});
await sleep(700);
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 300;
  g.player.y = 188;
  const d = g.rynok.getDialogue?.();
  if (d) d.isOpen = false;
});
await sleep(400);
await saveCanvas('detail-rynok.png');

await page.evaluate(() => {
  window.__novgorod.gotoPodezd();
});
await sleep(700);
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 100;
  g.player.y = 200;
  const d = g.podezd.getDialogue?.();
  if (d) d.isOpen = false;
});
await sleep(400);
await saveCanvas('detail-podezd.png');

await browser.close();
console.log('done');
