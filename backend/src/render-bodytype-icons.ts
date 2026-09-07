import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import sharp from 'sharp';

/**
 * Renders the storefront's body-type icons as real 3D objects.
 *
 * Drives a three.js scene in headless Chrome, one screenshot per body type at a
 * fixed three-quarter camera, then trims to a shared canvas and compresses.
 * Output goes to frontend-app/public/body-types/ as transparent WebP, so one
 * asset reads correctly on both the light and dark themes.
 *
 *   npm run icons:bodytypes
 */

const OUT_DIR = path.join(__dirname, '..', '..', 'frontend-app', 'public', 'body-types');
const PAGE = path.join(__dirname, 'spin', 'bodytype-page.html');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9331;
const CDP_PORT = 9332;
const RENDER_SIZE = 900;
const OUT_W = 440;

const TYPES = ['suv', 'sedan', 'mpv', 'pickup', 'hatchback', 'crossover', 'van'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function startServer(): Promise<http.Server> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(PAGE));
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

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
      }, 90000);
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

/** Tight bounding box of the non-transparent pixels. */
async function alphaBounds(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 8) {
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

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer();

  const profile = path.join(__dirname, '..', 'uploads', '.icon-chrome');
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
    width: RENDER_SIZE, height: RENDER_SIZE, deviceScaleFactor: 1, mobile: false,
  });
  // Without this the screenshot is composited onto opaque white.
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });

  console.log(`\n🚗 Rendering ${TYPES.length} body-type icons in 3D\n`);

  // Two passes: measure every silhouette first, then crop them all to one
  // shared box so the row does not jump about in size.
  const raw: Record<string, Buffer> = {};
  const boxes: Record<string, { left: number; top: number; width: number; height: number }> = {};

  for (const type of TYPES) {
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
    // The page pulls three.js off a CDN as an ES module, so poll for the entry
    // point rather than guessing at a sleep that is flaky on a cold cache.
    let loaded = false;
    for (let i = 0; i < 60 && !loaded; i++) {
      await sleep(500);
      loaded = await cdp.evaluate<boolean>(`typeof window.setup === 'function'`);
    }
    if (!loaded) {
      const err = await cdp.evaluate<string>(`window.__loadError || 'unknown'`);
      throw new Error(`bodytype-page.html never initialised: ${err}`);
    }
    await cdp.evaluate<boolean>(`window.setup({ type: '${type}', size: ${RENDER_SIZE} })`);
    await sleep(250);
    await cdp.evaluate('window.draw()');

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    const b = await alphaBounds(buf);
    if (!b) {
      console.log(`  ✗ ${type} — rendered empty`);
      continue;
    }
    raw[type] = buf;
    boxes[type] = b;
    console.log(`  ✓ ${type.padEnd(10)} ${b.width}x${b.height}`);
  }

  const found = Object.keys(raw);
  const maxW = Math.max(...found.map((t) => boxes[t].width));
  const maxH = Math.max(...found.map((t) => boxes[t].height));
  const pad = Math.round(maxW * 0.04);

  console.log(`\n  shared canvas ${maxW + pad * 2}x${maxH + pad * 2}\n`);

  for (const type of found) {
    const b = boxes[type];
    // Centre horizontally, sit on the shared ground line vertically.
    const left = Math.round(b.left - (maxW - b.width) / 2 - pad);
    const top = Math.round(b.top - (maxH - b.height) - pad);

    const extracted = await sharp(raw[type])
      .extract({
        left: Math.max(left, 0),
        top: Math.max(top, 0),
        width: Math.min(maxW + pad * 2, RENDER_SIZE - Math.max(left, 0)),
        height: Math.min(maxH + pad * 2, RENDER_SIZE - Math.max(top, 0)),
      })
      .resize({ width: OUT_W })
      .webp({ quality: 92, alphaQuality: 100, effort: 6 })
      .toBuffer();

    const dest = path.join(OUT_DIR, `${type}.webp`);
    fs.writeFileSync(dest, extracted);
    console.log(`  📦 ${type.padEnd(10)} ${Math.round(extracted.length / 1024)} KB`);
  }

  cdp.close();
  chrome.kill();
  server.close();
  await sleep(1200);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    /* Chrome still holds the lock; harmless and gitignored */
  }

  console.log(`\n✅ Written to frontend-app/public/body-types/\n`);
}

run().catch((e) => {
  console.error('\n' + (e?.stack ?? e) + '\n');
  process.exit(1);
});
