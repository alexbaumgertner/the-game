/**
 * Capture Levels 6–8 stills (+ short playthrough frames).
 * Usage: GAME_URL=http://127.0.0.1:5173/ node scripts/capture-levels-6-8.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const OUT_DIR = '/tmp/levels-6-8-frames';
const OUT_MP4 = path.join(MEDIA, 'levels-6-8-playthrough.mp4');
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
}

const puppeteer = await import(
  '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
).catch(async () => {
  await new Promise((resolve, reject) => {
    const p = spawn('npm', ['install', 'puppeteer-core@24', '--prefix', '/tmp'], {
      stdio: 'inherit',
    });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('npm fail'))));
  });
  return import('/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js');
});

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=960,720'],
  defaultViewport: { width: 960, height: 720, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 10000 });

let frame = 0;
const shot = async (label) => {
  frame += 1;
  const name = `frame-${String(frame).padStart(3, '0')}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, name), type: 'png' });
  if (label) console.log(label, name);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const saveCanvasPng = async (outPath) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('wrote', outPath);
};

const hold = async (action, ms) => {
  await page.evaluate(
    async (a, duration) => {
      const g = window.__novgorod;
      g.input.setVirtual(a, true);
      await new Promise((r) => setTimeout(r, duration));
      g.input.setVirtual(a, false);
    },
    action,
    ms,
  );
  await shot();
};

const tap = async (action) => {
  await page.evaluate((a) => {
    window.__novgorod.input.pulseVirtual(a);
  }, action);
  await sleep(200);
  await shot();
};

// ── Level 6 ──
await page.evaluate(() => window.__novgorod.gotoMost());
await sleep(800);
await shot('l6-enter');
await saveCanvasPng(path.join(MEDIA, 'level6-most.png'));
await hold('right', 600);
for (let i = 0; i < 3; i++) {
  await tap('punch');
  await tap('kick');
}
await page.evaluate(() => {
  window.__novgorod.most.__debug.forceDialogue();
  window.__novgorod.most.__debug.skipToChoices();
});
await sleep(400);
await shot('l6-dialogue');
await tap('choice1');
await sleep(500);
await page.evaluate(() => {
  window.__novgorod.most.__debug.giveLetter();
  window.__novgorod.most.__debug.forceClear();
});
await sleep(600);
await shot('l6-clear');

// ── Level 7 ──
await page.evaluate(() => window.__novgorod.gotoDiskoteka());
await sleep(800);
await shot('l7-enter');
await saveCanvasPng(path.join(MEDIA, 'level7-diskoteka.png'));
await hold('right', 500);
await tap('punch');
await page.evaluate(() => {
  window.__novgorod.diskoteka.__debug.forceDialogue();
  window.__novgorod.diskoteka.__debug.skipToChoices();
});
await sleep(400);
await shot('l7-dialogue');
await tap('choice1');
await sleep(400);
await page.evaluate(() => {
  window.__novgorod.diskoteka.__debug.giveCassette();
  window.__novgorod.diskoteka.__debug.forceClear();
});
await sleep(500);
await shot('l7-clear');

// ── Level 8 ──
await page.evaluate(() => window.__novgorod.gotoDetinets());
await sleep(800);
await shot('l8-enter');
await saveCanvasPng(path.join(MEDIA, 'level8-detinets.png'));
await hold('right', 500);
await page.evaluate(() => {
  window.__novgorod.detinets.__debug.forceDialogue();
  window.__novgorod.detinets.__debug.skipToChoices();
});
await sleep(400);
await shot('l8-dialogue');
await tap('choice1');
await sleep(600);
await page.evaluate(() => window.__novgorod.detinets.__debug.forceWave2());
await sleep(400);
await shot('l8-wall');
await saveCanvasPng(path.join(MEDIA, 'level8-detinets.png'));
await page.evaluate(() => window.__novgorod.detinets.__debug.forceClear());
await sleep(700);
await shot('l8-clear');

await browser.close();

const frames = fs
  .readdirSync(OUT_DIR)
  .filter((f) => f.endsWith('.png'))
  .sort();
if (frames.length >= 4) {
  await new Promise((resolve) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        '2',
        '-i',
        path.join(OUT_DIR, 'frame-%03d.png'),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '22',
        OUT_MP4,
      ],
      { stdio: 'inherit' },
    );
    ff.on('exit', () => resolve());
  });
  if (fs.existsSync(OUT_MP4)) console.log('wrote', OUT_MP4);
}

console.log('done', frames.length, 'frames');
