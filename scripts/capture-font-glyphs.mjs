/**
 * Capture HUD/dialogue font proof shots for Cyrillic glyph review.
 * Usage: STAGE=before|after GAME_URL=... node scripts/capture-font-glyphs.mjs
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
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 45000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hideTouch = async () => {
  await page.evaluate(() => {
    const g = window.__novgorod;
    g.touch?.setVisible?.(false);
    const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
    if (el) el.style.display = 'none';
  });
};

const save = async (slug) => {
  await hideTouch();
  const name = `md-font-${slug}-${STAGE}.png`;
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name, buf.length);
};

// —— 1) Apartment HUD: ЗУИЧ · 2026 + ХРУЩЁВКА ——
await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('introDone', true);
  g.states.setFlag('diaryUnlocked', true);
  g.states.setFlag('seenPhoto', true);
  const d = g.apartment.getDialogue?.();
  if (d) d.isOpen = false;
  g.hud.set({
    objective: 'Я — ЗУИЧ',
    eraLabel: 'ЗУИЧ · 2026',
    levelTitle: 'Хрущёвка',
  });
  g.player.x = 150;
  g.player.y = 192;
  g.player.era = 'adult';
  g.beer.resetForApartment?.();
});
await sleep(400);
await save('hud-zuich');

// —— 2) Dialogue: Я — ЗУИЧ ——
await page.evaluate(() => {
  const g = window.__novgorod;
  const d = g.apartment.getDialogue?.();
  if (d && typeof d.open === 'function') {
    d.open({
      id: 'font-probe-zuich',
      start: 'z1',
      lines: {
        z1: { speaker: 'Зуич', text: 'Я — Зуич.', next: null },
      },
    });
    for (let i = 0; i < 100; i++) d.update?.(1 / 30);
  }
});
await sleep(350);
await save('dialogue-ya-zuich');

await page.evaluate(() => {
  const d = window.__novgorod.apartment.getDialogue?.();
  if (d) d.isOpen = false;
});

// —— 3) Rynok: ЦЕНТРАЛЬНЫЙ РЫНОК sign + mama prompt ——
await page.evaluate(() => {
  window.__novgorod.gotoRynok();
});
await sleep(700);
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 220;
  g.player.y = 188;
  const d = g.rynok.getDialogue?.();
  if (d) d.isOpen = false;
  g.hud.set({
    objective: 'Поговори с мамой у МЕХА',
    eraLabel: 'ЗУИЧ · 1995',
    levelTitle: 'Центральный рынок',
  });
});
await sleep(400);
await save('rynok-sign');

// Force toast prompt «E — ПОГОВОРИТЬ С МАМОЙ»
await page.evaluate(() => {
  const g = window.__novgorod;
  // Prefer scene toast if exposed; else overlay via hud objective + fake toast panel
  const scene = g.rynok;
  if (scene && 'toast' in scene) {
    scene.toast = 'E — ПОГОВОРИТЬ С МАМОЙ';
    scene.toastTimer = 10;
  }
  g.hud.set({
    objective: 'E — ПОГОВОРИТЬ С МАМОЙ',
    eraLabel: 'ЗУИЧ · 1995',
    levelTitle: 'Центральный рынок',
  });
});
await sleep(350);
await save('prompt-mama');

// —— 4) Podezd: ПОДОЙДИ К ОТЦУ ——
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
  g.hud.set({
    objective: 'Подойди к отцу',
    eraLabel: 'ЗУИЧ · 1995',
    levelTitle: 'Выпускной',
  });
});
await sleep(400);
await save('podezd-otcu');

await browser.close();
console.log('done font glyphs', STAGE);
