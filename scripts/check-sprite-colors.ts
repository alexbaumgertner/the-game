/**
 * CI: fail if any Zuich / mom sprite frame uses more than 15 unique colors.
 * Run: npm run check:sprite-colors
 */
import { auditPlayerSpriteColors } from '../src/art/playerSprites';
import { auditMomSpriteColors } from '../src/art/momSprites';

const MAX = 15;
let failed = 0;

const reports = [...auditPlayerSpriteColors(), ...auditMomSpriteColors()];
for (const r of reports) {
  const ok = r.colors <= MAX;
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`${mark}  ${r.id}: ${r.colors} colors`);
  if (!ok) {
    failed++;
    console.log(`       ${r.hexes.join(', ')}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} sprite(s) exceed ${MAX} unique colors.`);
  process.exit(1);
}
console.log(`\nAll ${reports.length} frames ≤ ${MAX} colors.`);
