/**
 * Capture apartment expansion: kitchen, Irony bath, cigarettes,
 * toilet chain, cat litter, living room (no desk lamp bloom).
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

const ROOM = 320;

const setup = async (flags = {}) => {
  await page.evaluate((f) => {
    const g = window.__novgorod;
    g.states.setFlag('introDone', true);
    g.states.setFlag('diaryUnlocked', true);
    g.states.setFlag('seenPhoto', true);
    g.states.setFlag('level1Cleared', !!f.level1Cleared);
    g.states.setFlag('level2Cleared', !!f.level2Cleared);
    g.states.setFlag('litterCleaned', !!f.litterCleaned);
    g.states.setFlag('cigarettesFound', !!f.cigarettesFound);
    g.states.setFlag('bathed', !!f.bathed);
    const d = g.apartment.getDialogue?.();
    d?.resetSilent?.();
    g.apartment.setOverlay?.('none');
    g.hud.set({
      objective: f.objective ?? 'Найди сигареты',
      eraLabel: 'ЗУИЧ · 2026',
      levelTitle: 'Хрущёвка',
    });
    const px = f.x ?? ROOM + 160;
    g.player.x = px;
    g.player.y = 192;
    g.player.era = 'adult';
    // Snap camera so room is framed (logical width 320)
    g.apartment.setCamX?.(Math.max(0, px - 140));
    // Mute thirst FX for clean art captures
    g.beer.enabled = false;
    g.beer.showLongHint = false;
    g.beer.cans = 1;
    g.beer.thirst = 120;
    g.touch?.setVisible?.(false);
    const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
    if (el) el.style.display = 'none';
  }, flags);
  await sleep(900);
};

const saveCanvas = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(MEDIA, name), buf);
  fs.writeFileSync(path.join(ARTIFACTS, name), buf);
  console.log('saved', name, buf.length);
};

// Living room — no desk lamp bloom; bottles
await setup({
  x: ROOM + 120,
  objective: 'Найди сигареты',
});
await saveCanvas('apartment-find-cigarettes.png');

// Kitchen detail — колонка + large framed photo
await setup({
  x: ROOM * 2 + 175,
  objective: 'Найди сигареты',
});
await sleep(1200);
await saveCanvas('apartment-kitchen-detail.png');
await saveCanvas('apartment-kitchen-framed-photo.png');

// Bath Irony of Fate
await setup({
  x: ROOM * 3 + 145,
  objective: 'Найди сигареты',
});
await sleep(500);
await saveCanvas('apartment-bath-irony.png');

// Toilet high-tank chain
await setup({
  x: 178,
  level1Cleared: true,
  objective: 'Почисти лоток',
});
await sleep(500);
await saveCanvas('apartment-toilet-chain.png');

// Cat litter (after L1, dirty tray)
await setup({
  x: 90,
  level1Cleared: true,
  litterCleaned: false,
  objective: 'Почисти лоток',
});
await sleep(900);
await saveCanvas('apartment-cat-litter.png');

await browser.close();
console.log('done');
