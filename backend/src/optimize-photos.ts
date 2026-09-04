import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

/**
 * Downscales and re-encodes everything in uploads/ so listing pages stay fast.
 *
 * Wikipedia originals run to several megabytes each, which is far more than a
 * 4:3 card or a 16:10 hero ever needs. Idempotent — re-encoding an already
 * optimised file is a no-op in practice, and anything that would grow is kept
 * as-is.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MAX_WIDTH = 1600;
const QUALITY = 82;
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;

const kb = (bytes: number) => Math.round(bytes / 1024);

async function optimise() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('No uploads directory — nothing to do.');
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => IMAGE_RE.test(f));
  if (!files.length) {
    console.log('No images found.');
    return;
  }

  console.log(`\n🖼  Optimising ${files.length} images (max ${MAX_WIDTH}px, q${QUALITY})\n`);

  let before = 0;
  let after = 0;
  let skipped = 0;

  for (const file of files) {
    const full = path.join(UPLOADS_DIR, file);
    const original = fs.statSync(full).size;
    before += original;

    try {
      // Read through Node rather than letting libvips open the path itself —
      // on Windows it fails with "UNKNOWN: unknown error, open".
      const input = fs.readFileSync(full);
      const meta = await sharp(input).metadata();

      const buffer = await sharp(input)
        .rotate() // honour EXIF orientation before stripping metadata
        .resize({
          width: Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH),
          withoutEnlargement: true,
        })
        .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
        .toBuffer();

      // Never make a file bigger than it already was.
      if (buffer.length >= original) {
        after += original;
        skipped++;
        console.log(`  =  ${file} — already lean (${kb(original)} KB)`);
        continue;
      }

      fs.writeFileSync(full, buffer);
      after += buffer.length;
      const saved = Math.round((1 - buffer.length / original) * 100);
      console.log(`  ↓  ${file} — ${kb(original)} → ${kb(buffer.length)} KB (−${saved}%)`);
    } catch (e: any) {
      after += original;
      skipped++;
      console.log(`  !  ${file} — skipped (${e?.message ?? 'unreadable'})`);
    }
  }

  const savedPct = before ? Math.round((1 - after / before) * 100) : 0;
  console.log(
    `\n✅ ${kb(before) / 1024 > 1 ? (before / 1024 / 1024).toFixed(1) + ' MB' : kb(before) + ' KB'}` +
      ` → ${(after / 1024 / 1024).toFixed(1)} MB (−${savedPct}%)` +
      `${skipped ? `, ${skipped} left unchanged` : ''}\n`,
  );
}

optimise().catch((e) => {
  console.error(e);
  process.exit(1);
});
