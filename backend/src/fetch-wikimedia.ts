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
 * Sources listing photography from Wikimedia Commons at high resolution.
 *
 * Searches the File namespace rather than the article-summary endpoint, which
 * only ever returns one lead image per article and frequently the wrong
 * generation. Commons search reaches the whole media library, exposes real
 * dimensions, and serves arbitrary-width renderings of the original.
 *
 * Candidates are scored, not just taken in order — a photo is only useful here
 * if it is a landscape exterior shot of the whole car at print resolution.
 *
 *   npm run photos:wiki                 vehicles missing a photo
 *   npm run photos:wiki -- --all        re-shoot everything
 *   npm run photos:wiki -- --id=172     one vehicle
 *
 * Run `npm run photos:normalise` afterwards to crop, align direction and
 * compress the set.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const UA = 'VeloraMotors/1.0 (dealership catalogue; educational, non-commercial)';
const TARGET_WIDTH = 2400;
const MIN_SOURCE_WIDTH = 1100;
const MIN_BYTES = 40_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Extra search terms for models where a plain "make model" query returns the
 * wrong car — usually because the nameplate is a rebadge or spans generations
 * that look nothing alike.
 */
const QUERY_HINTS: Record<string, string[]> = {
  'Honda BR-V': ['Honda BR-V 2022', 'Honda BR-V second generation', 'Honda BR-V'],
  'Honda CR-V': ['Honda CR-V 2022', 'Honda CR-V fifth generation', 'Honda CR-V 2020'],
  'Honda City': ['Honda City 2021', 'Honda City seventh generation', 'Honda City GN'],
  'Honda Civic': ['Honda Civic 2022 sedan', 'Honda Civic eleventh generation'],
  'Toyota Wigo': ['Toyota Wigo 2023', 'Toyota Agya 2023', 'Toyota Wigo'],
  'Toyota Rush': ['Toyota Rush 2018', 'Toyota Rush F800', 'Toyota Rush'],
  'Toyota Vios': ['Toyota Vios 2023', 'Toyota Vios XP150', 'Toyota Yaris Ativ 2023'],
  'Toyota Innova': ['Toyota Innova Zenix', 'Toyota Kijang Innova 2022', 'Toyota Innova 2021'],
  'Mitsubishi Xpander': ['Mitsubishi Xpander 2022', 'Mitsubishi Xpander facelift'],
  'Mitsubishi Mirage G4': ['Mitsubishi Attrage 2020', 'Mitsubishi Mirage G4'],
  'Hyundai Stargazer': ['Hyundai Stargazer 2022', 'Hyundai Stargazer'],
  'Hyundai Accent': ['Hyundai Accent 2021', 'Hyundai Accent fifth generation'],
  'Ford Territory': ['Ford Territory 2023 China', 'Ford Territory CX743'],
  'Ford Ranger': ['Ford Ranger 2023', 'Ford Ranger T6 2022'],
  'Ford Everest': ['Ford Everest 2022', 'Ford Everest third generation'],
  'Suzuki XL7': ['Suzuki XL7 2020', 'Suzuki XL7'],
  'Suzuki Ertiga': ['Suzuki Ertiga 2022', 'Suzuki Ertiga second generation'],
  'Kia Carnival': ['Kia Carnival 2021', 'Kia Carnival KA4'],
  'Nissan Almera': ['Nissan Almera 2020', 'Nissan Almera N18'],
  'Nissan Terra': ['Nissan Terra 2022', 'Nissan Terra facelift'],
};

/**
 * Filename words that mark a file as unusable for a listing hero.
 *
 * Matched on word boundaries, not as substrings: "toy" as a substring rejects
 * every single Toyota, and "race" would catch "racetrack" in a place name.
 */
const REJECT = [
  'interior', 'interiors', 'dashboard', 'cockpit', 'seat', 'seats', 'boot', 'trunk',
  'engine', 'engines', 'motor', 'gearbox', 'transmission',
  'wheel', 'wheels', 'tyre', 'tyres', 'tire', 'tires', 'badge', 'emblem', 'logo',
  'headlight', 'headlights', 'taillight', 'taillights', 'grille', 'mirror',
  'gauge', 'odometer', 'chassis', 'cutaway', 'diagram', 'blueprint',
  'rear', 'back', 'behind', 'bootlid',
  'assembly', 'crash', 'wreck', 'wrecked', 'damaged', 'rusty', 'abandoned', 'junkyard',
  'police', 'taxi', 'ambulance', 'firetruck',
  'rally', 'racing', 'race', 'hillclimb', 'motorsport', 'drift', 'circuit',
  'tuning', 'tuned', 'modified', 'stanced',
  'toy', 'miniature', 'diecast', 'sticker', 'advert', 'brochure', 'manual', 'poster',
];

const REJECT_RE = new RegExp(`\\b(${REJECT.join('|')})\\b`, 'i');

/** Fragments that suggest a clean three-quarter exterior — worth extra points. */
const PREFER = ['front', 'three-quarter', '3/4', 'quarter', 'exterior', 'side', 'profile'];

interface Candidate {
  title: string;
  url: string;
  width: number;
  height: number;
  score: number;
}

interface CommonsPage {
  title: string;
  imageinfo?: {
    thumburl?: string;
    url?: string;
    width: number;
    height: number;
    mime: string;
  }[];
}

async function search(query: string, modelYear: number): Promise<Candidate[]> {
  try {
    const { data } = await axios.get('https://commons.wikimedia.org/w/api.php', {
      timeout: 25000,
      headers: { 'User-Agent': UA },
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: 6, // File:
        gsrlimit: 25,
        prop: 'imageinfo',
        iiprop: 'url|size|mime',
        iiurlwidth: TARGET_WIDTH,
      },
    });

    const pages: Record<string, CommonsPage> = data?.query?.pages ?? {};
    const out: Candidate[] = [];

    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png)$/.test(info.mime)) continue;
      if (info.width < MIN_SOURCE_WIDTH) continue;

      const name = page.title.replace(/^File:/, '').toLowerCase();
      if (REJECT_RE.test(name)) continue;

      // Listings need landscape; portrait crops badly into a 16:10 card.
      const ratio = info.width / info.height;
      if (ratio < 1.15 || ratio > 2.6) continue;

      let score = 0;
      score += Math.min(info.width / 400, 12);              // resolution
      if (ratio > 1.3 && ratio < 1.85) score += 4;          // close to 16:10
      if (PREFER.some((p) => name.includes(p))) score += 5;

      // Commons names carry the model year, and often the capture date too:
      // "2003 Mitsubishi Montero Sport LS AWD, front left, 09-11-2023.jpg".
      // Strip the date first, then take the FIRST remaining year — the leading
      // token is the model year by convention. Reading the trailing date
      // instead made a 2003 car look like a 2023 one.
      const withoutDates = name.replace(/\b\d{1,2}[-/]\d{1,2}[-/](19|20)\d{2}\b/g, ' ');
      const years = [...withoutDates.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((m) => Number(m[1]));
      if (years.length) {
        const gap = Math.abs(years[0] - modelYear);
        if (gap > 6) continue;
        score += Math.max(12 - gap * 2, 0);
      }

      out.push({
        title: page.title,
        url: info.thumburl ?? info.url ?? '',
        width: info.width,
        height: info.height,
        score,
      });
    }

    return out.filter((c) => c.url);
  } catch {
    return [];
  }
}

async function download(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: { 'User-Agent': UA, Referer: 'https://commons.wikimedia.org/' },
      });
      const buf = Buffer.from(res.data);
      return buf.length < MIN_BYTES ? null : buf;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 429 || status === 503) {
        const wait = 10000 * (attempt + 1);
        console.log(`      throttled (${status}), waiting ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      return null;
    }
  }
  return null;
}

async function run() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const idArg = args.find((a) => a.startsWith('--id='));
  // Skips the top N candidates — for when the best-scoring file turns out to be
  // a bad photograph (bonnet open, on a transporter, half behind a sign).
  const offsetArg = args.find((a) => a.startsWith('--offset='));
  const offset = Math.max(Number(offsetArg?.split('=')[1] ?? 0), 0);

  // Downloads the top N candidates per vehicle into uploads/_review/ and leaves
  // the database alone, so they can be compared before one is chosen. Used to
  // pick photographs by which way the car is pointing, which no filename or
  // metadata reliably tells you.
  const reviewArg = args.find((a) => a.startsWith('--review'));
  const reviewCount = reviewArg ? Number(reviewArg.split('=')[1] ?? 3) : 0;
  const reviewDir = path.join(UPLOADS_DIR, '_review');
  if (reviewCount) fs.mkdirSync(reviewDir, { recursive: true });

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));

  const cars = idArg
    ? await carRepo.find({ where: { id: Number(idArg.split('=')[1]) }, relations: { make: true } })
    : await carRepo.find({ relations: { make: true }, order: { id: 'ASC' } });

  const targets = all || idArg
    ? cars
    : cars.filter((c) => {
        if (!c.photo) return true;
        const p = path.join(UPLOADS_DIR, c.photo);
        return !fs.existsSync(p) || fs.statSync(p).size < MIN_BYTES;
      });

  console.log(`\n📷 Wikimedia Commons — ${targets.length} vehicle(s), up to ${TARGET_WIDTH}px\n`);

  let ok = 0;
  const missed: string[] = [];

  for (const car of targets) {
    const make = car.make?.name ?? '';
    const key = `${make} ${car.model}`;
    const label = `${key} ${car.year}`;
    process.stdout.write(`  ▸ ${label.padEnd(30)}`);

    const queries = [
      // Exact-phrase filename match first: the strongest signal that the file
      // really is this nameplate and not a rebadged sibling.
      `intitle:"${key}" ${car.year}`,
      `intitle:"${key}"`,
      ...(QUERY_HINTS[key] ?? []),
      `${key} ${car.year}`,
      key,
    ];

    let saved = false;
    const seen = new Set<string>();

    for (const q of queries) {
      const found = (await search(q, car.year)).filter((c) => !seen.has(c.title));
      found.forEach((c) => seen.add(c.title));
      found.sort((a, b) => b.score - a.score);

      // Review mode collects several options rather than committing to one.
      if (reviewCount) {
        let saved = 0;
        for (const cand of found.slice(0, reviewCount * 2)) {
          if (saved >= reviewCount) break;
          const buf = await download(cand.url);
          if (!buf) continue;
          const meta = await sharp(buf).metadata();
          if ((meta.width ?? 0) < MIN_SOURCE_WIDTH) continue;

          const slug = `${make.toLowerCase()}-${car.model.toLowerCase().replace(/[\s/]+/g, '-')}`;
          fs.writeFileSync(path.join(reviewDir, `${slug}__${saved}.jpg`), buf);
          saved++;
          await sleep(400);
        }
        if (saved) {
          console.log(`⋯ ${saved} candidate(s) for review`);
          ok++;
        } else {
          console.log('✗ no candidates');
          missed.push(label);
        }
        break;
      }

      for (const cand of found.slice(offset, offset + 4)) {
        const buf = await download(cand.url);
        if (!buf) continue;

        const meta = await sharp(buf).metadata();
        if ((meta.width ?? 0) < MIN_SOURCE_WIDTH) continue;

        const filename =
          `${make.toLowerCase()}-${car.model.toLowerCase().replace(/[\s/]+/g, '-')}-${car.year}.jpg`;
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);

        const previous = car.photo;
        car.photo = filename;
        await carRepo.save(car);

        // Retire the file this replaces, unless another listing still uses it.
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

        console.log(`✓ ${meta.width}x${meta.height}  ${cand.title.replace('File:', '').slice(0, 46)}`);
        saved = true;
        ok++;
        break;
      }
      if (saved) break;
      await sleep(1200);
    }

    if (!saved) {
      console.log('✗ nothing suitable found');
      missed.push(label);
    }
    await sleep(1500);
  }

  await app.close();
  console.log(`\n✅ ${ok}/${targets.length} sourced.`);
  if (missed.length) console.log(`   Still missing: ${missed.join(', ')}`);
  console.log('   Next: npm run photos:normalise\n');
}

run().catch((e) => {
  console.error('\n' + (e?.stack ?? e) + '\n');
  process.exit(1);
});
