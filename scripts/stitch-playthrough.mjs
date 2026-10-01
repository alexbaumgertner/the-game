/**
 * Headless-ish playthrough capture via Chrome DevTools evaluate is driven
 * from the shell; this script stitches PNG frames into an mp4.
 *
 * Usage: node scripts/stitch-playthrough.mjs <framesDir> <outMp4>
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const framesDir = resolve(process.argv[2] ?? '/tmp/sega-frames');
const outMp4 = resolve(process.argv[3] ?? '/tmp/sega-16bit-playthrough.mp4');

const frames = readdirSync(framesDir)
  .filter((f) => f.endsWith('.png'))
  .sort();

if (frames.length < 2) {
  console.error(`Need >=2 PNG frames in ${framesDir}, found ${frames.length}`);
  process.exit(1);
}

const r = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    '8',
    '-i',
    `${framesDir}/frame-%03d.png`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '22',
    outMp4,
  ],
  { encoding: 'utf8' },
);

if (r.status !== 0) {
  console.error(r.stderr);
  process.exit(r.status ?? 1);
}
console.log(`Wrote ${outMp4} from ${frames.length} frames`);
