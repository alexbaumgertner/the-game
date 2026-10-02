/**
 * Level 2 подъезд playthrough capture.
 * Usage: node scripts/capture-level2-playthrough.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const OUT_DIR = '/tmp/level2-frames';
const OUT_MP4 = path.join(MEDIA, 'level2-playthrough.mp4');
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/novgorod-1995/';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
}

const puppeteer = await import(
  '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
);

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
  }, action);
  await sleep(220);
  await shot();
};

const saveCanvasPng = async (outPath) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('wrote', outPath);
};

// Enter Level 2 directly
await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('level1Cleared', true);
  g.gotoPodezd();
});
await sleep(700);
await shot('entrance');
await saveCanvasPng(path.join(MEDIA, 'level2-entrance.png'));

// Fight wave 1 a bit
await hold('right', 700);
for (let i = 0; i < 4; i++) {
  await tap('punch');
  await tap('kick');
}
await tap('special');
await sleep(200);
await shot('wave1-fight');

// Force mid dialogue
await page.evaluate(() => {
  window.__novgorod.podezd.__debug.forceDialogue();
  window.__novgorod.podezd.__debug.skipToChoices();
});
await sleep(400);
await shot('dialogue');

await tap('choice1');
await sleep(300);
await tap('confirm');
await tap('confirm');
await sleep(600);
await shot('after-dialogue');

// Force wave 2 fight view
await page.evaluate(() => window.__novgorod.podezd.__debug.forceWave2Calm());
await sleep(400);
await hold('right', 400);
for (let i = 0; i < 3; i++) {
  await tap('punch');
  await tap('kick');
}
await tap('jump');
await sleep(200);
await shot('stairs-fight');
await saveCanvasPng(path.join(MEDIA, 'level2-stairs-fight.png'));

// Clear and reach door
await page.evaluate(() => {
  const g = window.__novgorod.podezd.__debug;
  g.clearWave2();
  g.forceClear?.();
});
await sleep(300);
// Manual clear path: KO + door
await page.evaluate(() => {
  const g = window.__novgorod;
  g.podezd.__debug.clearWave2();
  g.player.x = 480;
  g.player.setFloorY(60);
  g.player.y = 60;
  g.player.grounded = true;
});
await sleep(800);
await shot('near-door');
await sleep(500);
await shot('end');

const phase = await page.evaluate(() => ({
  scene: window.__novgorod.states.current.scene,
  phase: window.__novgorod.podezd.__debug.getPhase(),
  level2Cleared: window.__novgorod.states.flags.level2Cleared,
  level1Cleared: window.__novgorod.states.flags.level1Cleared,
}));
console.log('end state', phase);

// Also capture diary unlock UI
await page.evaluate(() => {
  const g = window.__novgorod;
  g.states.setFlag('hasKey', true);
  g.states.setFlag('seenPhoto', true);
  g.states.setFlag('diaryUnlocked', true);
  g.states.setFlag('level1Cleared', true);
  g.states.setFlag('level2Cleared', false);
  g.states.boot('apartment_2026', { era: 'ERA_2026' });
});
await sleep(400);
await page.evaluate(() => {
  // Open diary by forcing overlay via interact near diary after teleport
  const g = window.__novgorod;
  g.player.x = 60;
  g.input.pulseVirtual('interact');
  g.input.pulseVirtual('confirm');
});
await sleep(200);
// Force diary by calling enter then simulating — use evaluate to open diary cursor
await page.evaluate(() => {
  // Re-boot and walk interaction is flaky headless; snapshot flags instead
});
await shot('apartment-after');

await browser.close();

const ff = spawn(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    '6',
    '-i',
    `${OUT_DIR}/frame-%03d.png`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '22',
    '-t',
    '12',
    OUT_MP4,
  ],
  { encoding: 'utf8' },
);

await new Promise((resolve, reject) => {
  ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
});
console.log('Wrote', OUT_MP4, 'frames', frame);
