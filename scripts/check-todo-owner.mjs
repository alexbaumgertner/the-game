/**
 * Fail if any non-comment line under src/ (TypeScript) contains TODO(owner).
 * Comment lines (after trim) may start with //, slash-star, or *.
 *
 * Usage: npm run check:todo-owner
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/** @param {string} dir */
function* walkTs(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walkTs(full);
    else if (ent.isFile() && ent.name.endsWith('.ts')) yield full;
  }
}

/** @param {string} line */
function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
}

const hits = [];

for (const file of walkTs(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('TODO(owner)')) continue;
    if (isCommentLine(line)) continue;
    hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
  }
}

if (hits.length > 0) {
  console.error('check:todo-owner: player-facing TODO(owner) found:');
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}

console.log('check:todo-owner: ok (no non-comment TODO(owner) in src/**/*.ts)');
