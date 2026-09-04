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
 * Auth needs BOTH credentials: the key identifies the account and is safe
 * client-side, the secret authorises the request and must stay server-side.
 * Set them in backend/.env:
 *
 *   CARIMAGES_API_KEY=ci_...
 *   CARIMAGES_API_SECRET=...
 *
 * Run:  npm run photos:carimages            (fills only vehicles lacking a photo)
 *       npm run photos:carimages -- --all   (re-shoots the entire inventory)
 *
 * NOTE: the exact response envelope is confirmed on the first successful run —
 * `extractImageUrl` below handles the shapes the API is documented to return and
 * logs the raw payload if it sees something else, so a mismatch is a one-line fix
 * rather than a silent failure.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MIN_BYTES = 8_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Config {
  key: string;
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
  if (!secret) {
    console.error(
      '\n✗ CARIMAGES_API_SECRET is not set in backend/.env.\n' +
        '  CarImages authenticates with a key AND a secret — the key alone is\n' +
        '  rejected. Copy the secret from your CarImages dashboard, add it as\n' +
        '  CARIMAGES_API_SECRET, then run this again.\n',
    );
    return null;
  }

  return {
    key,
    secret,
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
  const params = {
    api_key: cfg.key,
    make,
    model: car.model,
    year: car.year,
    angle: cfg.angle,
  };

  try {
    const res = await axios.get(`${cfg.baseUrl}/images`, {
      params,
      headers: { 'X-Api-Secret': cfg.secret, Accept: 'application/json' },
      timeout: 25000,
      // Images may be returned as a redirect to the CDN rather than JSON.
      maxRedirects: 0,
      validateStatus: (s) => (s >= 200 && s < 400) || s === 404,
    });

    if (res.status === 404) return null;
    if (res.status >= 300 && res.status < 400) {
      return (res.headers['location'] as string) ?? null;
    }

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
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));

  const cars = await carRepo.find({ relations: { make: true } });
  const targets = all
    ? cars
    : cars.filter((c) => {
        if (!c.photo) return true;
        const p = path.join(UPLOADS_DIR, c.photo);
        return !fs.existsSync(p) || fs.statSync(p).size < MIN_BYTES;
      });

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
    if (await download(url, path.join(UPLOADS_DIR, filename))) {
      car.photo = filename;
      await carRepo.save(car);
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
