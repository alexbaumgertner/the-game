/**
 * Capture Mega Drive art stage screenshots (apartment, rynok, dialogue, podezd).
 * Usage: STAGE=before|after GAME_URL=... node scripts/capture-md-art-stages.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const STAGE = process.env.STAGE ?? 'after';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/the-game/';

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
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 20000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const saveCanvas = async (suffix) => {
  const name = `md-stage${process.env.STAGE_NUM ?? '1'}-${suffix}-${STAGE}.png`;
  const dataUrl = await page.evaluate(() => {
    const g = window.__novgorod;
    g.touch?.setVisible?.(false);
    const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
    if (el) el.style.display = 'none';
    return g.captureCanvas();
  });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name, buf.length);
};

await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('introDone', true);
  g.states.setFlag('diaryUnlocked', true);
  g.states.setFlag('seenPhoto', true);
  const d = g.apartment.getDialogue?.();
  if (d) {
    d.isOpen = false;
  }
  g.hud.set({ objective: 'Открой комод' });
  g.player.x = 150;
  g.player.y = 192;
  g.player.era = 'adult';
  g.beer.resetForApartment?.();
});
await sleep(500);
await saveCanvas('apartment');

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
await saveCanvas('rynok');

// Dialogue: open mother's talk if possible, else force a dialogue panel via HUD toast path
await page.evaluate(() => {
  const g = window.__novgorod;
  const d = g.rynok.getDialogue?.();
  if (d && typeof d.open === 'function') {
    d.open({
      id: 'md-art-probe',
      start: 'm1',
      lines: {
        m1: {
          speaker: 'Мама',
          text: 'Зуич, помоги с куртками на рынке!',
          next: null,
        },
      },
    });
    // Finish typewriter so full line is visible
    for (let i = 0; i < 80; i++) d.update?.(1 / 30);
  }
});
await sleep(400);
await saveCanvas('dialogue');

await page.evaluate(() => {
  const d = window.__novgorod.rynok.getDialogue?.();
  if (d) d.isOpen = false;
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
await saveCanvas('podezd');

await browser.close();
console.log('done stage', process.env.STAGE_NUM ?? '1', STAGE);
