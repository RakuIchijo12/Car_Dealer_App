import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Car } from './cars/car.entity';

/**
 * Replaces listing photos with uniform studio imagery from CarImages
 * (carimagesapi.com), so every vehicle is shot at the same angle on the same
 * background — the thing stock photography can never give you.
 *
 * Auth: /signed-url authenticates on CARIMAGES_API_KEY alone — it mints a
 * short-lived CDN link. CARIMAGES_API_SECRET is sent as X-Api-Secret when set,
 * for plans that require it, but is not needed for this flow.
 *
 * Run:  npm run photos:carimages                  fill only vehicles lacking a photo
 *       npm run photos:carimages -- --all         re-shoot the entire inventory
 *       npm run photos:carimages -- --preview=4   fetch 4 into uploads/_carimages-preview
 *                                                 without touching the database
 *
 * Note on tiers: the free tier returns one watermarked 750x500 render per
 * vehicle and ignores `angle` — every request comes back byte-identical. A paid
 * plan is required for unwatermarked images and real angle selection.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MIN_BYTES = 8_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Config {
  key: string;
  /** Optional: /signed-url authenticates on the key alone. */
  secret: string;
  baseUrl: string;
  angle: string;
}

function readConfig(): Config | null {
  const key = process.env.CARIMAGES_API_KEY?.trim();
  const secret = process.env.CARIMAGES_API_SECRET?.trim();

  if (!key) {
    console.error('\n✗ CARIMAGES_API_KEY is not set in backend/.env\n');
    return null;
  }
  return {
    key,
    secret: secret ?? '',
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

  // Nested: { data: {...} } or { images: [...] }
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
  const params: Record<string, string | number> = {
    api_key: cfg.key,
    make,
    model: car.model,
    year: car.year,
    angle: cfg.angle,
  };

  try {
    // /signed-url mints a short-lived CDN link; /images does not exist.
    const res = await axios.get(`${cfg.baseUrl}/signed-url`, {
      params,
      // The secret is only needed on plans that require it — send it when set.
      headers: {
        Accept: 'application/json',
        ...(cfg.secret ? { 'X-Api-Secret': cfg.secret } : {}),
      },
      timeout: 25000,
      validateStatus: (s) => (s >= 200 && s < 400) || s === 404,
    });

    if (res.status === 404) return null;

    const url = extractImageUrl(res.data);
    if (!url) {
      console.log('    ? unexpected response shape:', JSON.stringify(res.data).slice(0, 240));
    }
    return url;
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error(
        `CarImages rejected the credentials (HTTP ${status}). Check CARIMAGES_API_KEY and CARIMAGES_API_SECRET.`,
      );
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

async function download(url: string, filePath: string): Promise<boolean> {
  try {
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 40000 });
    const buf = Buffer.from(res.data);
    if (buf.length < MIN_BYTES) return false;
    fs.writeFileSync(filePath, buf);
    return true;
  } catch {
    return false;
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

  const cars = await carRepo.find({ relations: { make: true } });
  let targets = all
    ? cars
    : cars.filter((c) => {
        if (!c.photo) return true;
        const p = path.join(UPLOADS_DIR, c.photo);
        return !fs.existsSync(p) || fs.statSync(p).size < MIN_BYTES;
      });

  // Preview writes to uploads/_carimages-preview and leaves the database alone,
  // so the result can be compared before committing to it.
  const previewDir = path.join(UPLOADS_DIR, '_carimages-preview');
  if (previewCount) {
    targets = cars.slice(0, previewCount);
    fs.mkdirSync(previewDir, { recursive: true });
    console.log(`\n👀 Preview mode — writing ${previewCount} image(s) to uploads/_carimages-preview`);
    console.log('   The database is NOT modified.\n');
  }

  console.log(
    `\n🚘 CarImages — ${targets.length} vehicle(s), angle "${cfg.angle}"` +
      `${all ? ' (re-shooting everything)' : ''}\n`,
  );

  let filled = 0;
  for (const car of targets) {
    const make = car.make?.name ?? '';
    console.log(`  ▸ ${make} ${car.model} ${car.year}`);

    const url = await fetchImageUrl(cfg, car);
    if (!url) {
      console.log('    ·  no image returned');
      await sleep(600);
      continue;
    }

    const filename =
      `ci-${make.toLowerCase()}-${car.model.toLowerCase().replace(/[\s/]+/g, '-')}-${car.year}.jpg`;
    const dest = previewCount ? path.join(previewDir, filename) : path.join(UPLOADS_DIR, filename);

    if (await download(url, dest)) {
      if (!previewCount) {
        car.photo = filename;
        await carRepo.save(car);
      }
      filled++;
      console.log('    📷 saved');
    } else {
      console.log('    ✗  download failed');
    }
    await sleep(600);
  }

  await app.close();
  console.log(`\n✅ ${filled}/${targets.length} updated.`);
  console.log('   Now run: npm run photos:optimize\n');
}

run().catch((e) => {
  console.error('\n' + (e?.message ?? e) + '\n');
  process.exit(1);
});
