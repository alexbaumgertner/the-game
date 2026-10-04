/**
 * Fail if any character used in string literals under src/ (incl. src/data/)
 * lacks a nesFont glyph or an explicit NES_FALLBACKS entry.
 *
 * Usage: npm run check:font-glyphs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT = path.join(ROOT, 'src/art/nesFont.ts');
const SRC = path.join(ROOT, 'src');

const fontSrc = fs.readFileSync(FONT, 'utf8');

/** Parse GLYPHS keys from nesFont.ts (string or bare identifier keys). */
function parseGlyphKeys(src) {
  const keys = new Set();
  // Match inside GLYPHS object only
  const start = src.indexOf('const GLYPHS');
  const end = src.indexOf('};', start);
  const block = src.slice(start, end);
  for (const m of block.matchAll(
    /(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|([A-ZА-ЯЁ0-9]))\s*:\s*'[01]{35}'/g,
  )) {
    let key = m[3];
    if (m[1] !== undefined) key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    else if (m[2] !== undefined) key = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    keys.add(key);
  }
  return keys;
}

function parseFallbacks(src) {
  const map = new Map();
  const start = src.indexOf('export const NES_FALLBACKS');
  if (start < 0) return map;
  const end = src.indexOf('};', start);
  const block = src.slice(start, end);
  for (const m of block.matchAll(/'((?:\\.|[^'\\])*)'\s*:\s*'((?:\\.|[^'\\])*)'/g)) {
    map.set(m[1].replace(/\\'/g, "'"), m[2].replace(/\\'/g, "'"));
  }
  return map;
}

const glyphs = parseGlyphKeys(fontSrc);
const fallbacks = parseFallbacks(fontSrc);

if (glyphs.size < 50) {
  console.error('check:font-glyphs: failed to parse GLYPHS (got', glyphs.size, 'keys)');
  process.exit(2);
}

for (const [from, to] of fallbacks) {
  if (!glyphs.has(to)) {
    console.error(`check:font-glyphs: fallback '${from}' → '${to}' but '${to}' has no glyph`);
    process.exit(1);
  }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function stripComments(text, isJson) {
  if (isJson) return text;
  // block comments
  let t = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // line comments (keep http://)
  t = t
    .split('\n')
    .map((line) => {
      let i = 0;
      while (i < line.length) {
        const q = line[i];
        if (q === "'" || q === '"' || q === '`') {
          i++;
          while (i < line.length) {
            if (line[i] === '\\') {
              i += 2;
              continue;
            }
            if (line[i] === q) {
              i++;
              break;
            }
            i++;
          }
          continue;
        }
        if (line[i] === '/' && line[i + 1] === '/') {
          // avoid stripping http://
          if (i >= 5 && line.slice(i - 5, i + 2).includes('http:')) {
            i += 2;
            continue;
          }
          return line.slice(0, i);
        }
        i++;
      }
      return line;
    })
    .join('\n');
  return t;
}

function extractStrings(text) {
  const out = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i++;
      let buf = '';
      while (i < n) {
        if (text[i] === '\\') {
          if (i + 1 >= n) break;
          const esc = text[i + 1];
          if (esc === 'u' && i + 5 < n) {
            const hex = text.slice(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              buf += String.fromCharCode(parseInt(hex, 16));
              i += 6;
              continue;
            }
          }
          const map = { n: '\n', r: '\r', t: '\t', '0': '\0' };
          buf += map[esc] ?? esc;
          i += 2;
          continue;
        }
        if (text[i] === q) {
          i++;
          break;
        }
        // skip ${...} in templates — expressions are not string content
        if (q === '`' && text[i] === '$' && text[i + 1] === '{') {
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            i++;
          }
          continue;
        }
        buf += text[i];
        i++;
      }
      out.push(buf);
      continue;
    }
    i++;
  }
  return out;
}

const CYR_LOW = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const CYR_UP = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const cyrMap = new Map([...CYR_LOW].map((c, i) => [c, CYR_UP[i]]));

function upperRu(ch) {
  if (cyrMap.has(ch)) return cyrMap.get(ch);
  // toLocaleUpperCase for Latin / Ё already handled
  return ch.toLocaleUpperCase('ru-RU');
}

/** Skip pure technical strings that never hit the HUD rasterizer. */
function skipString(s) {
  if (!s) return true;
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return true; // CSS hex colors
  if (/^rgba?\([^)]*\)$/.test(s)) return true;
  if (/^[\w./@$-]+$/.test(s) && !/[А-Яа-яЁё]/.test(s) && s.length > 24) return true; // long paths/ids
  return false;
}

const missing = new Map(); // char -> sample files
const files = walk(SRC);

for (const file of files) {
  // Don't require the font source's own bitstrings to be glyphs
  if (file.endsWith(`${path.sep}nesFont.ts`)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  const text = stripComments(raw, file.endsWith('.json'));
  const rel = path.relative(ROOT, file);
  for (const s of extractStrings(text)) {
    if (skipString(s)) continue;
    for (const ch of s) {
      if (ch === '\n' || ch === '\r' || ch === '\t') continue;
      const up = upperRu(ch);
      if (glyphs.has(up)) continue;
      const fb = fallbacks.get(up);
      if (fb && glyphs.has(fb)) continue;
      if (!missing.has(up)) missing.set(up, new Set());
      missing.get(up).add(rel);
    }
  }
}

if (missing.size > 0) {
  console.error('check:font-glyphs: missing glyphs / fallbacks for:');
  for (const [ch, locs] of [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sample = [...locs].slice(0, 3).join(', ');
    console.error(`  ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}  (e.g. ${sample})`);
  }
  console.error(`\n${missing.size} character(s) unresolved. Add to GLYPHS or NES_FALLBACKS in src/art/nesFont.ts.`);
  process.exit(1);
}

console.log(`check:font-glyphs: ok (${glyphs.size} glyphs, ${fallbacks.size} fallbacks, scanned ${files.length} files)`);
