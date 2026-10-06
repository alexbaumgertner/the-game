/**
 * Task 1 screenshots: diary year strip, tea HUD, stub «Скоро».
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
await sleep(600);

const saveCanvas = async (name) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
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
  g.states.setFlag('level1Cleared', true);
  g.states.setFlag('level2Cleared', true);
  g.states.setFlag('level3Cleared', true);
  g.states.setFlag('level4Cleared', true);
  g.states.setFlag('level5Cleared', true);
  g.states.setFlag('level6Cleared', true);
  g.states.setFlag('level7Cleared', true);
  g.states.setFlag('level8Cleared', true);
  const d = g.apartment.getDialogue?.();
  d?.resetSilent?.();
  g.apartment.setOverlay?.('diary');
  g.tea.showLongHint = false;
  g.tea.cups = 2;
  g.tea.thirst = 90;
  g.tea.enabled = true;
  g.touch?.setVisible?.(false);
  const el = document.querySelector('.tc-root, #touch-controls, .touch-controls');
  if (el) el.style.display = 'none';
});
await sleep(400);
await saveCanvas('anon-diary-strip.png');

await page.evaluate(() => {
  const g = window.__novgorod;
  g.apartment.setOverlay?.('none');
  g.states.goto('apartment_2026', { era: 'ERA_2026', fadeSeconds: 0 });
  g.tea.showLongHint = false;
  g.tea.cups = 3;
  g.tea.thirst = 70;
  g.tea.enabled = true;
  g.player.x = 160;
  g.hud.set({
    objective: 'Найди ПИВО',
    eraLabel: 'ЗУИЧ · 2026',
    levelTitle: 'Хрущёвка',
  });
});
await sleep(500);
// Force a render tick with crisis lightly
await page.evaluate(() => {
  const b = window.__novgorod.beer;
  b.thirst = 40;
  b.update(0.05);
});
await sleep(300);
await saveCanvas('tea-pivo-hud.png');

await page.evaluate(() => {
  window.__novgorod.gotoArmiya();
});
await sleep(700);
await saveCanvas('level-stub-soon.png');

await browser.close();
console.log('done');
