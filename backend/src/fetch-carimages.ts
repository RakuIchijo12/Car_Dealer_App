import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import { Car } from './cars/car.entity';

/**
 * Replaces listing photography with uniform studio renders from CarImages
 * (carimagesapi.com) — every vehicle the correct model, shot at the same angle,
 * lit the same way.
 *
 * The API returns the car cut out on a transparent background, so rather than
 * pasting it on a flat colour we composite a soft contact shadow underneath and
 * keep the transparency. The listing then sits on whatever the page background
 * is, which means one asset works in both the light and dark themes.
 *
 * Auth: /signed-url authenticates on CARIMAGES_API_KEY alone.
 *
 *   npm run photos:carimages                    vehicles missing a photo
 *   npm run photos:carimages -- --all           re-shoot the entire inventory
 *   npm run photos:carimages -- --preview=4     write to uploads/_carimages-preview,
 *                                               leaving the database untouched
 *
 * Tier note: the free tier watermarks every render and ignores `angle`. `width`
 * IS honoured — 1600 returns 1536x1024 rather than the 750x500 default, so the
 * request always asks for it.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MIN_BYTES = 8_000;

/** Output canvas. 16:10 matches the storefront card and hero aspect ratios. */
const CANVAS_W = 1600;
const CANVAS_H = 1000;
/** How much of the canvas width the vehicle occupies. */
const CAR_WIDTH_RATIO = 0.88;
/** Vertical position of the car's wheels, as a fraction of canvas height. */
const GROUND_Y = 0.9;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Config {
  key: string;
  secret: string;
  baseUrl: string;
  angle: string;
}

function readConfig(): Config | null {
  const key = process.env.CARIMAGES_API_KEY?.trim();
  if (!key) {
    console.error('\n✗ CARIMAGES_API_KEY is not set in backend/.env\n');
    return null;
  }
  return {
    key,
    secret: process.env.CARIMAGES_API_SECRET?.trim() ?? '',
    baseUrl: (process.env.CARIMAGES_BASE_URL ?? 'https://carimagesapi.com/api/v1').replace(/\/$/, ''),
    angle: process.env.CARIMAGES_ANGLE ?? 'front34',
  };
}

/** Pull an image URL out of whichever envelope the API returns. */
function extractImageUrl(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.startsWith('http')) return payload;
  if (!payload || typeof payload !== 'object') return null;

  const p = payload as Record<string, any>;
  const direct =
    p['url'] ?? p['image_url'] ?? p['imageUrl'] ?? p['signed_url'] ?? p['signedUrl'] ?? p['cdn_url'];
  if (typeof direct === 'string') return direct;

  for (const holder of [p['data'], p['result'], p['vehicle']]) {
    const nested = holder && extractImageUrl(holder);
    if (nested) return nested;
  }
  const list = p['images'] ?? p['results'];
  if (Array.isArray(list) && list.length) return extractImageUrl(list[0]);

  return null;
}

async function fetchImageUrl(cfg: Config, car: Car): Promise<string | null> {
  const make = car.make?.name ?? '';
  try {
    const res = await axios.get(`${cfg.baseUrl}/signed-url`, {
      params: {
        api_key: cfg.key,
        make,
        model: car.model,
        year: car.year,
        angle: cfg.angle,
        width: 1600,
      },
      headers: {
        Accept: 'application/json',
        ...(cfg.secret ? { 'X-Api-Secret': cfg.secret } : {}),
      },
      timeout: 25000,
      validateStatus: (s) => (s >= 200 && s < 400) || s === 404,
    });

    if (res.status === 404) return null;
    const url = extractImageUrl(res.data);
    if (!url) console.log('    ? unexpected response:', JSON.stringify(res.data).slice(0, 200));
    return url;
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error(`CarImages rejected the credentials (HTTP ${status}). Check CARIMAGES_API_KEY.`);
    }
    if (status === 429) {
      console.log('    throttled, waiting 20s…');
      await sleep(20000);
      return null;
    }
    console.log(`    ✗ ${make} ${car.model}: ${e?.message ?? 'request failed'}`);
    return null;
  }
}

/**
 * Tight bounding box of the non-transparent pixels.
 * sharp's own trim() keys off a background colour and leaves fully padded
 * renders untouched, so the alpha channel is scanned directly.
 */
async function alphaBounds(buf: Buffer) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Names the dominant paint colour of a cut-out render.
 *
 * The API ignores any colour parameter, so a render's paint rarely matches what
 * the listing claims. Reading it back keeps the spec sheet honest about the
 * image the buyer is looking at.
 *
 * Samples the upper body band (bonnet, roof, upper doors) and discards glass,
 * tyres, shadow and the near-white watermark before taking a median.
 */
async function detectPaint(carBuf: Buffer): Promise<string | null> {
  const { data, info } = await sharp(carBuf)
    .ensureAlpha()
    .resize({ width: 240, fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const reds: number[] = [], greens: number[] = [], blues: number[] = [];

  // Middle vertical band avoids the roof highlight and the wheels.
  for (let y = Math.floor(height * 0.3); y < Math.floor(height * 0.72); y++) {
    for (let x = Math.floor(width * 0.15); x < Math.floor(width * 0.85); x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] < 200) continue;

      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (lum < 28) continue;                       // glass, tyres, deep shadow
      if (lum > 244 && max - min < 12) continue;    // watermark and blown highlights

      reds.push(r); greens.push(g); blues.push(b);
    }
  }
  if (reds.length < 200) return null;

  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const r = median(reds), g = median(greens), b = median(blues);

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Low chroma means an achromatic finish — pick by brightness.
  if (chroma < 26) {
    if (lum > 198) return 'Pearl White';
    if (lum > 148) return 'Silver Metallic';
    if (lum > 78) return 'Gunmetal Grey';
    return 'Midnight Black';
  }

  let hue = 0;
  if (max === r) hue = (60 * ((g - b) / chroma) + 360) % 360;
  else if (max === g) hue = 60 * ((b - r) / chroma) + 120;
  else hue = 60 * ((r - g) / chroma) + 240;

  if (hue < 18 || hue >= 340) return 'Metallic Red';
  if (hue < 45) return 'Bronze Metallic';
  if (hue < 68) return 'Solar Yellow';
  if (hue < 160) return 'Emerald Green';
  if (hue < 200) return 'Ocean Teal';
  if (hue < 258) return 'Sapphire Blue';
  if (hue < 300) return 'Deep Violet';
  return 'Crimson';
}

/** Soft elliptical contact shadow, so the car is grounded rather than floating. */
function shadowSvg(width: number, height: number): Buffer {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="s" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#000" stop-opacity="0.42"/>
          <stop offset="55%"  stop-color="#000" stop-opacity="0.20"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="url(#s)"/>
    </svg>`);
}

/**
 * Places the cut-out vehicle on a transparent canvas with a contact shadow.
 * Keeping the alpha means the same file reads correctly on the light and dark
 * themes without a second render.
 */
async function composeStudio(raw: Buffer): Promise<{ image: Buffer; car: Buffer }> {
  const bounds = await alphaBounds(raw);
  const cropped = bounds ? await sharp(raw).extract(bounds).toBuffer() : raw;

  const targetW = Math.round(CANVAS_W * CAR_WIDTH_RATIO);
  const car = await sharp(cropped)
    .resize({ width: targetW, fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const carMeta = await sharp(car).metadata();
  const carW = carMeta.width ?? targetW;
  const carH = carMeta.height ?? targetW;

  const carLeft = Math.round((CANVAS_W - carW) / 2);
  const carTop = Math.round(CANVAS_H * GROUND_Y - carH);

  // Shadow hugs the footprint, slightly wider and flatter than the car.
  const shadowW = Math.round(carW * 0.92);
  const shadowH = Math.round(carH * 0.16);
  const shadow = await sharp(shadowSvg(shadowW, shadowH)).png().toBuffer();

  const image = await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: shadow,
        left: Math.round((CANVAS_W - shadowW) / 2),
        top: Math.min(Math.round(CANVAS_H * GROUND_Y - shadowH / 2), CANVAS_H - shadowH),
      },
      { input: car, left: carLeft, top: Math.max(carTop, 0) },
    ])
    .webp({ quality: 88, effort: 5, alphaQuality: 92 })
    .toBuffer();

  return { image, car };
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 45000 });
    const buf = Buffer.from(res.data);
    return buf.length < MIN_BYTES ? null : buf;
  } catch {
    return null;
  }
}

async function run() {
  const cfg = readConfig();
  if (!cfg) process.exit(1);

  const all = process.argv.includes('--all');
  const previewArg = process.argv.find((a) => a.startsWith('--preview'));
  const previewCount = previewArg ? Number(previewArg.split('=')[1] ?? 3) : 0;

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));

  const cars = await carRepo.find({ relations: { make: true }, order: { id: 'ASC' } });
  let targets = all
    ? cars
    : cars.filter((c) => {
        if (!c.photo) return true;
        const p = path.join(UPLOADS_DIR, c.photo);
        return !fs.existsSync(p) || fs.statSync(p).size < MIN_BYTES;
      });

  const previewDir = path.join(UPLOADS_DIR, '_carimages-preview');
  if (previewCount) {
    targets = cars.slice(0, previewCount);
    fs.mkdirSync(previewDir, { recursive: true });
    console.log(`\n👀 Preview — ${previewCount} image(s) to uploads/_carimages-preview, database untouched`);
  }

  console.log(
    `\n🚘 CarImages studio renders — ${targets.length} vehicle(s)` +
      `${all ? ' (re-shooting everything)' : ''}\n`,
  );

  let filled = 0;
  const missed: string[] = [];

  for (const car of targets) {
    const make = car.make?.name ?? '';
    const label = `${make} ${car.model} ${car.year}`;
    process.stdout.write(`  ▸ ${label.padEnd(32)}`);

    const url = await fetchImageUrl(cfg, car);
    if (!url) {
      console.log('·  no image');
      missed.push(label);
      await sleep(500);
      continue;
    }

    const raw = await download(url);
    if (!raw) {
      console.log('✗  download failed');
      missed.push(label);
      await sleep(500);
      continue;
    }

    const { image: composed, car: carLayer } = await composeStudio(raw);
    const paint = await detectPaint(carLayer);
    const filename =
      `ci-${make.toLowerCase()}-${car.model.toLowerCase().replace(/[\s/]+/g, '-')}-${car.year}.webp`;
    const dest = previewCount ? path.join(previewDir, filename) : path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(dest, composed);

    if (!previewCount) {
      const previous = car.photo;
      car.photo = filename;
      // Keep the spec sheet consistent with the image actually shown.
      if (paint) car.color = paint;
      await carRepo.save(car);

      // Retire the photo this replaces, unless something else still uses it.
      if (previous && previous !== filename) {
        const stillUsed = await carRepo.count({ where: { photo: previous } });
        if (!stillUsed) {
          try {
            fs.unlinkSync(path.join(UPLOADS_DIR, previous));
          } catch {
            /* already gone */
          }
        }
      }
    }

    filled++;
    console.log(`📷 ${String(Math.round(composed.length / 1024)).padStart(4)} KB  ${paint ?? ''}`);
    await sleep(500);
  }

  await app.close();
  console.log(`\n✅ ${filled}/${targets.length} updated.`);
  if (missed.length) {
    console.log(`   No render available for: ${missed.join(', ')}`);
    console.log('   Those keep their existing photo.');
  }
  console.log('');
}

run().catch((e) => {
  console.error('\n' + (e?.message ?? e) + '\n');
  process.exit(1);
});
