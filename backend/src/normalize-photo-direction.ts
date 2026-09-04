import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Mirrors listing photos so every vehicle faces the same way, giving the
 * inventory grid one consistent reading direction.
 *
 * House style is front-three-quarter facing RIGHT — the majority of the current
 * library already matches, so only the minority get flipped.
 *
 * Mirroring also mirrors number plates and badge text. That is the accepted
 * trade-off for catalogue uniformity (CarImages ships "mirrored right-facing"
 * variants for the same reason), but replace these with real photography of
 * your own stock before trading.
 *
 * Every flip is recorded in .direction-manifest.json, so `--undo` restores the
 * originals exactly by flipping them back.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MANIFEST = path.join(UPLOADS_DIR, '.direction-manifest.json');

/** Photos observed to face LEFT and therefore needing a horizontal flip. */
const FACING_LEFT = [
  'honda-city-2022.jpg',
  'kia-carnival-2023.jpg',
  'kia-seltos-2022.jpg',
  'mitsubishi-xpander-2023.jpg',
  'nissan-navara-2022.jpg',
  'suzuki-ertiga-2023.jpg',
  'suzuki-xl7-2023.jpg',
  'toyota-innova-2022.jpg',
  'toyota-wigo-2023.jpg',
];

function readManifest(): string[] {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as string[];
  } catch {
    return [];
  }
}

async function flip(filename: string): Promise<boolean> {
  const full = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(full)) {
    console.log(`  ·  ${filename} — not on disk, skipped`);
    return false;
  }
  try {
    // Read via Node: libvips cannot open these paths directly on Windows.
    const input = fs.readFileSync(full);
    const out = await sharp(input).flop().jpeg({ quality: 88, progressive: true }).toBuffer();
    fs.writeFileSync(full, out);
    console.log(`  ⇄  ${filename}`);
    return true;
  } catch (e: any) {
    console.log(`  !  ${filename} — ${e?.message ?? 'failed'}`);
    return false;
  }
}

async function run() {
  const undo = process.argv.includes('--undo');

  if (undo) {
    const previous = readManifest();
    if (!previous.length) {
      console.log('\nNothing to undo — no manifest found.\n');
      return;
    }
    console.log(`\n↩  Restoring ${previous.length} photos to their original direction\n`);
    let n = 0;
    for (const file of previous) if (await flip(file)) n++;
    fs.rmSync(MANIFEST, { force: true });
    console.log(`\n✅ Restored ${n} photos.\n`);
    return;
  }

  const already = readManifest();
  if (already.length) {
    console.log(
      `\nℹ  ${already.length} photos are already normalised. Run with --undo first to redo.\n`,
    );
    return;
  }

  console.log(`\n⇄  Normalising direction — flipping ${FACING_LEFT.length} left-facing photos\n`);

  const flipped: string[] = [];
  for (const file of FACING_LEFT) if (await flip(file)) flipped.push(file);

  fs.writeFileSync(MANIFEST, JSON.stringify(flipped, null, 2));
  console.log(`\n✅ ${flipped.length} flipped — the whole grid now faces right.`);
  console.log(`   Undo any time: npm run photos:direction -- --undo\n`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
