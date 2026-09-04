import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import sharp from 'sharp';
import { Car } from './cars/car.entity';

/**
 * Renders a 360° turntable sequence for every vehicle.
 *
 * Drives a three.js scene in headless Chrome over the DevTools protocol, one
 * screenshot per angle, then trims and compresses each frame. Output lands in
 * uploads/spin/<carId>/ and the storefront viewer plays it back — no WebGL or
 * model download required on the visitor's device.
 *
 *   npm run spin:render                 all vehicles
 *   npm run spin:render -- --id=172     one vehicle
 *   npm run spin:render -- --frames=24  coarser sequence (default 36)
 *
 * Frames are an illustrative 3D preview built from a generic body shell tinted
 * to each car's colour — the listing photographs remain the record of the actual
 * unit. Replace with real turntable photography of your own stock when you have it.
 */

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const SPIN_DIR = path.join(UPLOADS_DIR, 'spin');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const PAGE = path.join(__dirname, 'spin', 'render-page.html');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9321;
const CDP_PORT = 9322;
const RENDER_SIZE = 1100;
const OUT_SIZE = 900;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Maps a showroom colour name to something renderable. */
function paintFor(colour: string | undefined): string {
  const c = (colour ?? '').toLowerCase();
  const table: [RegExp, string][] = [
    [/pearl white|snow white|platinum white|arctic white|atlas white|glacier|super white|storm white/, '#EDEFF2'],
    [/white/, '#E8EAEE'],
    [/jet black|attitude black|phantom black|abyss|absolute black/, '#15171C'],
    [/black/, '#1B1E24'],
    [/silver|sterling|titanium|blade|lunar/, '#B9BEC6'],
    [/grey|gray|magnetic|meteor|meteoroid|grandeur|interstellar|dark metal/, '#767B85'],
    [/red|fiery|ignite|mica red|fire/, '#B7202A'],
    [/blue|plasma|blazer/, '#1F4E8C'],
    [/bronze|beige|sand/, '#9C8A72'],
  ];
  for (const [re, hex] of table) if (re.test(c)) return hex;
  return '#9AA1AB';
}

/** Serves the render page and the model over http so the loader can fetch them. */
function startServer(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0];
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(PAGE));
      return;
    }
    const asset = path.join(ASSETS_DIR, path.basename(url));
    if (fs.existsSync(asset)) {
      res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
      res.end(fs.readFileSync(asset));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

/** Minimal DevTools client — same approach as the screenshot tooling. */
class Devtools {
  private id = 0;
  private pending = new Map<number, { res: (v: any) => void; rej: (e: Error) => void }>();

  private constructor(private ws: WebSocket) {
    ws.addEventListener('message', (ev: MessageEvent) => {
      const m = JSON.parse(ev.data as string);
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    });
  }

  static async connect(): Promise<Devtools> {
    for (let i = 0; i < 80; i++) {
      try {
        const list = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()) as any[];
        const page = list.find((t) => t.type === 'page');
        if (page?.webSocketDebuggerUrl) {
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise<void>((res, rej) => {
            ws.addEventListener('open', () => res(), { once: true });
            ws.addEventListener('error', () => rej(new Error('ws error')), { once: true });
          });
          return new Devtools(ws);
        }
      } catch {
        /* not up yet */
      }
      await sleep(400);
    }
    throw new Error('Chrome DevTools never became available');
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      setTimeout(() => {
        if (this.pending.delete(id)) rej(new Error(`${method} timed out`));
      }, 120000);
    });
  }

  async evaluate<T>(expression: string): Promise<T> {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    }
    return r.result?.value as T;
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  const args = process.argv.slice(2);
  const idArg = args.find((a) => a.startsWith('--id='));
  const framesArg = args.find((a) => a.startsWith('--frames='));
  const frames = Math.max(8, Math.min(Number(framesArg?.split('=')[1] ?? 36), 72));

  const model = path.join(ASSETS_DIR, 'car-sedan.glb');
  if (!fs.existsSync(model)) {
    console.error(`\n✗ Missing 3D model at ${model}\n  See README → 3D showcase.\n`);
    process.exit(1);
  }

  fs.mkdirSync(SPIN_DIR, { recursive: true });

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const carRepo: Repository<Car> = app.get(getRepositoryToken(Car));

  const cars = idArg
    ? await carRepo.find({ where: { id: Number(idArg.split('=')[1]) }, relations: { make: true } })
    : await carRepo.find({ relations: { make: true }, order: { id: 'ASC' } });

  if (!cars.length) {
    console.error('\n✗ No vehicles matched.\n');
    await app.close();
    process.exit(1);
  }

  const server = await startServer();
  const profile = path.join(UPLOADS_DIR, '.spin-chrome');
  fs.rmSync(profile, { recursive: true, force: true });

  const chrome: ChildProcess = spawn(
    CHROME,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      '--headless=new',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      `--window-size=${RENDER_SIZE},${RENDER_SIZE}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const cdp = await Devtools.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: RENDER_SIZE,
    height: RENDER_SIZE,
    deviceScaleFactor: 1,
    mobile: false,
  });
  // Without this the screenshot is composited onto opaque white, which would
  // put a white box behind the car on a dark page.
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });

  console.log(`\n🎬 Rendering ${frames}-frame turntables for ${cars.length} vehicle(s)\n`);

  let done = 0;
  for (const car of cars) {
    const label = `${car.make?.name ?? ''} ${car.model} ${car.year}`.trim();
    const outDir = path.join(SPIN_DIR, String(car.id));
    fs.mkdirSync(outDir, { recursive: true });

    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    await sleep(1200);

    const paint = paintFor(car.color);
    try {
      await cdp.evaluate<boolean>(
        `window.setup({ modelUrl: '/car-sedan.glb', bodyColor: '${paint}', size: ${RENDER_SIZE} })`,
      );
    } catch (e: any) {
      console.log(`  ✗ ${label}: scene setup failed — ${e?.message ?? e}`);
      continue;
    }

    for (let i = 0; i < frames; i++) {
      await cdp.evaluate(`window.renderFrame(${i}, ${frames})`);
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      // Crop to a FIXED window, identical for every frame. Trimming per frame
      // would rescale each angle independently and make the car jump as it spins.
      const raw = Buffer.from(data, 'base64');
      const cropTop = Math.round(RENDER_SIZE * 0.22);
      const cropHeight = Math.round(RENDER_SIZE * 0.56);

      await sharp(raw)
        .extract({ left: 0, top: cropTop, width: RENDER_SIZE, height: cropHeight })
        .resize({ width: OUT_SIZE })
        .webp({ quality: 88, effort: 4 })
        .toFile(path.join(outDir, `${String(i).padStart(3, '0')}.webp`));
    }

    const written = fs.readdirSync(outDir).filter((f) => f.endsWith('.webp'));
    const bytes = written.reduce((n, f) => n + fs.statSync(path.join(outDir, f)).size, 0);

    // Record the count so the storefront can offer the 360 tab.
    car.spinFrames = written.length;
    await carRepo.save(car);
    console.log(`  ✓ ${label.padEnd(30)} ${frames} frames · ${Math.round(bytes / 1024)} KB`);
    done++;
  }

  cdp.close();
  chrome.kill();
  server.close();
  await app.close();

  // Chrome releases its profile lock a moment after exit; failing to clean up a
  // temp directory must not fail the render.
  await sleep(1500);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    /* left behind; harmless and gitignored */
  }

  console.log(`\n✅ ${done}/${cars.length} turntables rendered into uploads/spin/\n`);
}

run().catch((e) => {
  console.error('\n' + (e?.stack ?? e) + '\n');
  process.exit(1);
});
