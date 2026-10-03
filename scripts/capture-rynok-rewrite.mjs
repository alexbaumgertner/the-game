/**
 * Capture Level 1 rynok rewrite — stalls/dogs + mother at МЕХА.
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

await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('introDone', true);
  g.states.setFlag('diaryUnlocked', true);
  g.states.setFlag('seenPhoto', true);
});

// Wide shot: stalls + dogs
await page.evaluate(() => window.__novgorod.gotoRynok());
await sleep(800);
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 180;
  g.player.y = 188;
  // Nudge time so dogs are mid-scurry
  for (let i = 0; i < 30; i++) g.rynok?.update?.(0.05);
});
await sleep(400);
await saveCanvas('rynok-stalls-dogs.png');

// Close on mother МЕХА stall
await page.evaluate(() => {
  const g = window.__novgorod;
  g.player.x = 350;
  g.player.y = 188;
  const d = g.rynok.getDialogue?.();
  if (d?.isOpen) {
    // keep closed for clean sprite shot
    d.resetSilent?.();
  }
});
await sleep(400);
await saveCanvas('rynok-mama-stall.png');

// Optional short playthrough clip via canvas frames → skip if ffmpeg missing
const framesDir = '/tmp/rynok-frames';
fs.mkdirSync(framesDir, { recursive: true });
await page.evaluate(() => {
  window.__novgorod.gotoRynok();
});
await sleep(600);

for (let i = 0; i < 48; i++) {
  await page.evaluate((step) => {
    const g = window.__novgorod;
    g.player.applyWalk?.(1, 0.05, 20, 540);
    g.player.x = Math.min(340, 60 + step * 6);
    if (step === 20) g.rynok.__debug?.forceDialogue?.();
    if (step > 22 && step < 30) {
      g.rynok.__debug?.advanceDialogue?.();
      if (step === 28) g.rynok.__debug?.chooseSteady?.();
    }
    g.rynok?.update?.(0.05);
  }, i);
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(framesDir, `f${String(i).padStart(3, '0')}.png`), buf);
}

await browser.close();

try {
  const { execSync } = await import('node:child_process');
  const mp4Media = path.join(MEDIA, 'rynok-rewrite-playthrough.mp4');
  const mp4Art = path.join(ARTIFACTS, 'rynok-rewrite-playthrough.mp4');
  execSync(
    `ffmpeg -y -framerate 12 -i ${framesDir}/f%03d.png -c:v libx264 -pix_fmt yuv420p -crf 22 ${mp4Media}`,
    { stdio: 'inherit' },
  );
  fs.copyFileSync(mp4Media, mp4Art);
  console.log('saved rynok-rewrite-playthrough.mp4');
} catch (e) {
  console.warn('ffmpeg clip skipped:', e.message);
}

console.log('done');
