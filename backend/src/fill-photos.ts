import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Car } from './cars/car.entity';

/**
 * Backfills any car whose photo file is missing from disk.
 *
 * Wikimedia throttles hard (HTTP 429), so this works one image at a time with
 * generous pauses and explicit backoff rather than hammering in parallel.
 * Safe to re-run — cars that already have a real file on disk are skipped.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const UA = 'VeloraMotors-Seed/2.0 (educational, non-commercial)';
const MIN_BYTES = 10_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Known-good article titles for models the plain search struggles with. */
const HINTS: Record<string, string[]> = {
  'Ford Ranger': ['Ford Ranger (T6)', 'Ford Ranger', 'Ford Ranger Raptor'],
  'Ford Everest': ['Ford Everest', 'Ford Endeavour'],
  'Ford Territory': ['Ford Territory (China)', 'Ford Territory', 'Ford Equator Sport'],
  'Hyundai Stargazer': ['Hyundai Stargazer', 'Hyundai Custo'],
  'Hyundai Accent': ['Hyundai Accent', 'Hyundai Verna', 'Hyundai Solaris'],
  'Suzuki Swift': ['Suzuki Swift', 'Suzuki Swift Sport'],
  'Honda CR-V': ['Honda CR-V'],
  'Honda Civic': ['Honda Civic (eleventh generation)', 'Honda Civic'],
};

interface WikiPage {
  index: number;
  original?: { source: string };
  thumbnail?: { source: string };
}

/** Pull candidate image URLs for exact article titles. */
async function imagesForTitles(titles: string[]): Promise<string[]> {
  try {
    const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
      timeout: 20000,
      headers: { 'User-Agent': UA },
      params: {
        action: 'query',
        format: 'json',
        prop: 'pageimages',
        piprop: 'original|thumbnail',
        pithumbsize: 1600,
        titles: titles.join('|'),
      },
    });
    const pages: Record<string, WikiPage> = data?.query?.pages ?? {};
    return Object.values(pages)
      .map((p) => p.original?.source || p.thumbnail?.source)
      .filter((s): s is string => !!s);
  } catch {
    return [];
  }
}

/** Fall back to a full-text search when the exact titles yield nothing. */
async function imagesForSearch(query: string): Promise<string[]> {
  try {
    const { data } = await axios.get('https://en.wikipedia.org/w/api.php', {
      timeout: 20000,
      headers: { 'User-Agent': UA },
      params: {
        action: 'query',
        format: 'json',
        prop: 'pageimages',
        piprop: 'original|thumbnail',
        pithumbsize: 1600,
        generator: 'search',
        gsrsearch: query,
        gsrlimit: 8,
        gsrnamespace: 0,
      },
    });
    const pages: Record<string, WikiPage> = data?.query?.pages ?? {};
    return Object.values(pages)
      .sort((a, b) => a.index - b.index)
      .map((p) => p.original?.source || p.thumbnail?.source)
      .filter((s): s is string => !!s);
  } catch {
    return [];
  }
}

async function download(url: string, filePath: string): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 40000,
        headers: { 'User-Agent': UA, Referer: 'https://en.wikipedia.org/' },
      });
      const buf = Buffer.from(res.data);
      if (buf.length < MIN_BYTES) return false; // logo or icon, not a photo
      fs.writeFileSync(filePath, buf);
      return true;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 429 || status === 503) {
        const wait = 15000 * (attempt + 1);
        console.log(`      throttled (${status}), waiting ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      return false;
    }
  }
  return false;
}

async function run() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));

  const cars = await carRepo.find({ relations: { make: true } });
  const missing = cars.filter((c) => {
    if (!c.photo) return true;
    const p = path.join(UPLOADS_DIR, c.photo);
    return !fs.existsSync(p) || fs.statSync(p).size < MIN_BYTES;
  });

  console.log(`\n🔍 ${missing.length} of ${cars.length} vehicles still need a photo\n`);

  let filled = 0;
  for (const car of missing) {
    const make = car.make?.name ?? '';
    const key = `${make} ${car.model}`;
    const filename =
      `${make.toLowerCase()}-${car.model.toLowerCase().replace(/[\s/]+/g, '-')}-${car.year}.jpg`;
    const filePath = path.join(UPLOADS_DIR, filename);

    console.log(`  ▸ ${key} ${car.year}`);

    const candidates = [
      ...(await imagesForTitles(HINTS[key] ?? [key])),
      ...(await imagesForSearch(`${key} ${car.year}`)),
      ...(await imagesForSearch(`${key} car`)),
    ];

    let ok = false;
    for (const src of [...new Set(candidates)]) {
      if (/\.svg$/i.test(src)) continue;
      if (await download(src, filePath)) { ok = true; break; }
      await sleep(1500);
    }

    if (ok) {
      car.photo = filename;
      await carRepo.save(car);
      filled++;
      console.log('    📷 saved');
    } else {
      console.log('    ✗  no usable image — the storefront placeholder will show');
    }

    await sleep(4000); // stay well under Wikimedia's limits
  }

  await app.close();
  const onDisk = fs.readdirSync(UPLOADS_DIR).length;
  console.log(`\n✅ Filled ${filled}/${missing.length}. ${onDisk} photos on disk.\n`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
