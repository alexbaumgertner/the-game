/**
 * Capture faster gray + growing thoughts, and binge shout / cigarette pull.
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
    // Living room (ROOM_ORIGIN=320) so gray + thoughts read over apartment, not toilet
    g.player.x = 420;
    g.player.y = 192;
    g.player.era = 'adult';
    g.apartment.setCamX?.(420 - 128);
    g.beer.enabled = true;
    g.beer.showLongHint = false;
    g.beer.cans = 3;
    g.beer.consecutiveDrinks = 0;
    g.beer.secondsSinceDrink = 999;
    g.beer.bingeShoutTimer = 0;
    g.beer.cigarettePullTimer = 0;
    g.beer.thirst = 120;
    g.touch?.setVisible?.(false);
    const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
    if (el) el.style.display = 'none';
  });
};

const seedThirst = async (secondsLeft, settleMs = 2800) => {
  await page.evaluate((t) => {
    const b = window.__novgorod.beer;
    b.thirst = t;
    b.enabled = true;
    b.bingeShoutTimer = 0;
    b.cigarettePullTimer = 0;
    b.update(0.05);
    b.update(2.5);
    b.update(2.5);
    b.update(2.2);
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

// Stronger early gray (~100s left / ~20s elapsed) + larger growing thoughts
await seedThirst(100, 2600);
await saveCanvas('beer-gray-faster.png');

// Binge: 2 drinks in a row → shout + cigarette pull hint
await page.evaluate(() => {
  const g = window.__novgorod;
  const b = g.beer;
  b.enabled = true;
  b.cans = 3;
  b.thirst = 40;
  b.consecutiveDrinks = 0;
  b.secondsSinceDrink = 999;
  b.bingeShoutTimer = 0;
  b.cigarettePullTimer = 0;
  b.drink(); // 1st
  b.secondsSinceDrink = 1;
  b.drink(); // 2nd → binge
  // Place hero mid-room so pull hint + shout are visible; kitchen cigs to the right
  g.player.x = 480;
  g.player.y = 192;
  g.apartment.setCamX?.(480 - 128);
});
await sleep(900);
await saveCanvas('beer-binge-shavuh.png');

await browser.close();
console.log('done');
