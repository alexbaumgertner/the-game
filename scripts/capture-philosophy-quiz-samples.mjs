/**
 * Capture general-philosophy quiz samples (Antiquity + XX).
 * Usage: GAME_URL=http://127.0.0.1:5173/ node scripts/capture-philosophy-quiz-samples.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MEDIA = '/cursor/stores/bc-f5a772ba-74a7-4a07-aec4-054fb790cd8d/media';
const ARTIFACTS = '/opt/cursor/artifacts';
const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';

fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(ARTIFACTS, { recursive: true });

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const saveCanvasPng = async (outPath) => {
  const dataUrl = await page.evaluate(() => window.__novgorod.captureCanvas());
  const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('wrote', outPath);
};

// GENERAL bank indices: heraclitus-flux is first Античность after Восток (7 Восток → index 7)
// Buddha=0 … nagarjuna=6, heraclitus-flux=7
// XX starts at russell-logic — count: восток 7 + античность 14 + средн 6 + новое 12 + xix 11 = 50 → russell at 50
await page.evaluate(() => window.__novgorod.gotoVokzal());
await sleep(600);

await page.evaluate(() => {
  window.__novgorod.vokzal.__debug.forcePhilosophyQuiz(7); // heraclitus-flux
});
await sleep(400);
await saveCanvasPng(path.join(MEDIA, 'quiz-antiquity-sample.png'));
await saveCanvasPng(path.join(ARTIFACTS, 'quiz-antiquity-sample.png'));

await page.evaluate(() => {
  window.__novgorod.vokzal.__debug.forcePhilosophyQuiz(50); // russell-logic (first XX)
});
await sleep(400);
await saveCanvasPng(path.join(MEDIA, 'quiz-xx-century-sample.png'));
await saveCanvasPng(path.join(ARTIFACTS, 'quiz-xx-century-sample.png'));

await browser.close();
console.log('done');
