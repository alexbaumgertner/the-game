/**
 * Mobile playthrough capture — phone viewport with on-screen pad visible.
 * Usage: node scripts/capture-mobile-playthrough.mjs [framesDir] [outMp4]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.argv[2] ?? '/tmp/mobile-viewport-frames';
const OUT_MP4 =
  process.argv[3] ??
  '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media/mobile-playthrough.mp4';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/novgorod-1995/';

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
}

const puppeteer = await import(
  '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844'],
  defaultViewport: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
});

const page = await browser.newPage();
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
);
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.waitForFunction(() => window.__novgorod, { timeout: 10000 });

let frame = 0;
const shot = async () => {
  frame += 1;
  const name = `frame-${String(frame).padStart(3, '0')}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, name), type: 'png' });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const g = window.__novgorod;
    g.input.pulseVirtual(a);
    if (a === 'interact') g.input.pulseVirtual('confirm');
  }, action);
  await sleep(280);
  await shot();
};

await page.evaluate(() => {
  const g = window.__novgorod;
  g.touch?.setVisible(true);
  g.states.setFlag('hasKey', false);
  g.states.setFlag('seenPhoto', false);
  g.states.setFlag('diaryUnlocked', false);
  g.states.setFlag('level1Selected', false);
  g.states.boot('apartment_2026', { era: 'ERA_2026' });
});
await sleep(250);
await shot();

await hold('right', 900);
await tap('interact');
await sleep(400);
await shot();
await hold('left', 750);
await tap('interact');
await sleep(350);
await shot();
await tap('interact');
await hold('left', 850);
await tap('interact');
await sleep(300);
await shot();
await tap('interact');
await sleep(1100);
await shot();

let scene = await page.evaluate(() => window.__novgorod.states.current.scene);
console.log('after diary', scene);
if (scene !== 'rynok_1995') {
  await page.evaluate(() => window.__novgorod.gotoRynok());
  await sleep(600);
  await page.evaluate(() => window.__novgorod.touch?.setVisible(true));
  await shot();
}

await hold('right', 1000);
for (let i = 0; i < 3; i++) {
  await tap('punch');
  await tap('kick');
}
await tap('jump');
await tap('special');
await sleep(200);
await shot();

await page.evaluate(() => {
  const g = window.__novgorod;
  g.rynok.__debug.forceDialogue();
  g.rynok.__debug.skipToChoices();
});
await sleep(400);
await shot();
await tap('choice1');
await sleep(350);
await shot();
await tap('confirm');
await tap('confirm');
await sleep(500);
await shot();

scene = await page.evaluate(() => ({
  scene: window.__novgorod.states.current.scene,
  phase: window.__novgorod.rynok.__debug.getPhase(),
}));
console.log('end', scene);

await browser.close();

const ff = spawn(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    '4',
    '-i',
    path.join(OUT_DIR, 'frame-%03d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '23',
    OUT_MP4,
  ],
  { stdio: 'inherit' },
);
await new Promise((resolve, reject) => {
  ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
});
console.log(`Wrote ${OUT_MP4} from ${frame} frames`);
