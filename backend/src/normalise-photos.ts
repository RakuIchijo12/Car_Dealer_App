import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Brings a folder of sourced photography to one house standard: one aspect
 * ratio, one framing, one facing direction, one size budget.
 *
 * Wikimedia originals arrive at wildly different shapes (1.3:1 through 2.6:1)
 * and resolutions. Dropped into a fixed-ratio card they crop unpredictably —
 * some cars lose their nose, others swim in tarmac. Cropping deliberately to
 * 16:10 around the image's centre of interest fixes the framing, and mirroring
 * the minority fixes the direction.
 *
 *   npm run photos:normalise                  crop, align, compress
 *   npm run photos:normalise -- --undo-flip   put mirrored photos back
 *
 * Direction is listed explicitly rather than detected: telling which way a car
 * points is a vision problem, and a wrong guess silently mirrors a plate.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MANIFEST = path.join(UPLOADS_DIR, '.direction-manifest.json');

/** House standard: 16:10, large enough for a full-bleed hero on a 2x display. */
const OUT_W = 2000;
const OUT_H = 1250;
const QUALITY = 84;

/**
 * Files whose subject faces LEFT and therefore needs mirroring, so the whole
 * catalogue reads front-three-quarter facing RIGHT.
 *
 * Mirroring also mirrors number plates and badge text — an accepted trade-off
 * for a uniform catalogue. Replace with your own photography before trading.
 */
const FACING_LEFT: string[] = [
  'ford-everest-2023.jpg',
  'ford-territory-2022.jpg',
  'honda-city-2022.jpg',
  'hyundai-creta-2023.jpg',
  'kia-sportage-2023.jpg',
  'mitsubishi-mirage-g4-2022.jpg',
  'mitsubishi-outlander-2023.jpg',
  'nissan-navara-2022.jpg',
  'suzuki-xl7-2023.jpg',
  'toyota-hilux-2022.jpg',
  'toyota-rush-2022.jpg',
];

const kb = (n: number) => Math.round(n / 1024);

function readManifest(): string[] {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as string[];
  } catch {
    return [];
  }
}

async function undoFlip() {
  const previous = readManifest();
  if (!previous.length) {
    console.log('\nNothing to undo — no manifest found.\n');
    return;
  }
  console.log(`\n↩  Restoring ${previous.length} photo(s)\n`);
  for (const file of previous) {
    const full = path.join(UPLOADS_DIR, file);
    if (!fs.existsSync(full)) continue;
    const out = await sharp(fs.readFileSync(full)).flop().jpeg({ quality: QUALITY }).toBuffer();
    fs.writeFileSync(full, out);
    console.log(`  ⇄  ${file}`);
  }
  fs.rmSync(MANIFEST, { force: true });
  console.log('\n✅ Restored.\n');
}

async function run() {
  if (process.argv.includes('--undo-flip')) {
    await undoFlip();
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
  if (!files.length) {
    console.log('\nNo photos found.\n');
    return;
  }

  console.log(`\n🎞  Normalising ${files.length} photos → ${OUT_W}x${OUT_H}, facing right\n`);

  const previouslyFlipped = readManifest();

  let before = 0;
  let after = 0;
  let flipped = 0;
  const flippedFiles: string[] = [];

  for (const file of files) {
    const full = path.join(UPLOADS_DIR, file);
    const original = fs.statSync(full).size;
    before += original;

    try {
      const input = fs.readFileSync(full);
      const meta = await sharp(input).metadata();

      let pipeline = sharp(input).rotate(); // honour EXIF before anything else

      // Only mirror a file that has not already been mirrored. Without this a
      // second run flips it back and the catalogue loses its alignment.
      const alreadyFlipped = previouslyFlipped.includes(file);
      if (FACING_LEFT.includes(file) && !alreadyFlipped) {
        pipeline = pipeline.flop();
        flipped++;
      }
      if (FACING_LEFT.includes(file)) flippedFiles.push(file);

      // `attention` biases the crop toward the busiest region, which on a
      // photograph of a car parked in a street is the car.
      const out = await pipeline
        .resize({
          width: OUT_W,
          height: OUT_H,
          fit: 'cover',
          position: sharp.strategy.attention,
          withoutEnlargement: false,
        })
        .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })
        .toBuffer();

      fs.writeFileSync(full, out);
      after += out.length;

      const flag = FACING_LEFT.includes(file) ? (previouslyFlipped.includes(file) ? ' =' : ' ⇄') : '  ';
      console.log(
        `  ${flag} ${file.padEnd(34)} ${String(meta.width) + 'x' + meta.height} → ` +
          `${OUT_W}x${OUT_H}  ${kb(original)} → ${kb(out.length)} KB`,
      );
    } catch (e: any) {
      after += original;
      console.log(`  !  ${file} — ${e?.message ?? 'failed'}`);
    }
  }

  if (flippedFiles.length) {
    fs.writeFileSync(MANIFEST, JSON.stringify([...new Set(flippedFiles)], null, 2));
  }

  const saved = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(
    `\n✅ ${files.length} normalised, ${flipped} mirrored. ` +
      `${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB (−${saved}%)\n`,
  );
}

run().catch((e) => {
  console.error('\n' + (e?.stack ?? e) + '\n');
  process.exit(1);
});
