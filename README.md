# Velora Motors

> **Drive Something Better.**
> A pre-owned vehicle storefront and dealership management system for Davao City, Philippines.

Velora Motors is two applications sharing one database:

- **The storefront** — a public, mobile-first site where buyers browse inventory, compare
  vehicles, estimate monthly amortisation and send enquiries.
- **The back office** — an authenticated admin area where staff manage inventory, photos,
  brands, customers and the lead pipeline.

---

## Stack

| Layer      | Technology                                                        |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | Angular 22 (standalone components, signals, lazy routes)          |
| Backend    | NestJS 11 + TypeORM                                               |
| Database   | PostgreSQL (local or a managed host such as Neon)                 |
| Auth       | JWT bearer tokens (Passport)                                      |
| Uploads    | Multer to local disk, served from `/uploads`                      |

---

## Getting started

### 1. Prerequisites

- Node.js 20 or newer
- A PostgreSQL database

### 2. Configure the API

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your database credentials and a real `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Install and seed

```bash
npm run install:all     # installs backend + frontend
npm run seed            # creates the admin user, brands and 31 demo vehicles
```

The seed downloads vehicle photos from Wikipedia. Wikimedia rate-limits hard, so some may
be skipped — the storefront falls back to a styled placeholder for those. Re-run any time:

```bash
npm run photos          # fetches only what's missing, then optimises everything
npm run photos:optimize # re-encode on its own (also good after bulk uploads)
```

`photos:optimize` downscales to 1600px and re-encodes as progressive JPEG. On the demo set
that takes the photo folder from 47 MB to 5 MB — worth running after any manual upload.

### Uniform photo direction

The storefront reads best when every vehicle faces the same way. House style is
front-three-quarter **facing right**:

```bash
npm run photos:direction              # mirror the odd ones out
npm run photos:direction -- --undo    # put them back
```

Mirroring also mirrors number plates and badge text — the accepted trade-off for a uniform
catalogue, and the same technique CarImages uses for its "mirrored right-facing" variants.
Replace these with your own photography of your actual stock before trading.

### Vehicle photography

The demo inventory is photographed from Wikimedia Commons, then normalised to one house
standard.

```bash
npm run photos:wiki                    # only vehicles missing a photo
npm run photos:wiki -- --all           # re-source everything
npm run photos:wiki -- --id=172        # one vehicle
npm run photos:wiki -- --id=172 --offset=1   # take the next-best candidate when the
                                             # top pick is a poor photograph
npm run photos:wiki -- --id=172 --review=3   # download 3 options to uploads/_review/
                                             # and leave the database alone
npm run photos:normalise               # crop, align direction, compress
npm run photos:normalise -- --undo-flip
```

**Sourcing.** Searches the Commons *File* namespace rather than the article-summary
endpoint, which only ever returns one lead image per article and often the wrong
generation. Candidates are scored on resolution, aspect ratio and filename signals, then
filtered:

- `intitle:"Make Model"` first — an exact filename match is the strongest guard against
  rebadged siblings. Without it the Toyota Wigo resolved to a Daihatsu Ayla and the Rush
  to a Daihatsu Taruna.
- Filename words are matched on **word boundaries**, not substrings. As a substring `toy`
  rejects every single *Toy*ota.
- The model year is read from the **first** year in the name, after stripping any capture
  date. `2003 Mitsubishi Montero Sport ... 09-11-2023.jpg` is a 2003 car photographed in
  2023; reading the trailing date made twenty-year-old cars look current.
- Interiors, engine bays, rear shots, wrecks, race cars and die-cast models are excluded.

**Normalising.** Originals arrive anywhere from 1.3:1 to 2.6:1 and up to 3840px. They are
cropped to 2000x1250 (16:10) using an attention-weighted crop so the car stays framed,
mirrored where needed so the whole catalogue faces the same way, and encoded as progressive
mozjpeg at q84. The demo set lands at ~350 KB each.

**House direction is nose-left.** Rather than mirroring everything that pointed the wrong
way, `--review=N` was used to pull several candidates per vehicle and a genuinely
left-facing photograph was chosen wherever Commons had one. Only three still need
mirroring, down from eleven — which matters because mirroring also mirrors number plates
and badge text.

Mirroring is driven by an explicit list, not detection — telling which way a car points is
a vision problem and a wrong guess silently mirrors a plate. It is recorded in a manifest
so `--undo-flip` restores the originals, and re-running will not double-flip.

Crowd-sourced photography varies: a few listings show a car in a dim showroom or partly
behind signage. `--offset=N` swaps in the next-best candidate for those. Replace the lot
with your own photography of your actual stock before trading.

### 360° turntable views

Vehicle pages show an interactive 360° viewer when a turntable exists: drag to rotate,
scroll or pinch to zoom, drag to pan when zoomed, plus a scrubber, keyboard arrows and
fullscreen. It plays a pre-rendered frame sequence — no WebGL and no 3D model download —
so it works on low-end phones. Listings without one fall back to the photo gallery.

**The practical way to make one:** walk around the vehicle taking 24–36 evenly spaced
photos with sequential filenames, then in the admin open the vehicle → **360° view** →
select them all. Frames are ordered by filename. This is how dealers actually do it, and
it shows the buyer the *actual* car.

There is also an offline renderer that produces frames from a 3D model:

```bash
npm run spin:render                  # every vehicle
npm run spin:render -- --id=172      # one
npm run spin:render -- --frames=24   # coarser (default 36)
```

It drives three.js in headless Chrome and writes `uploads/spin/<carId>/000.webp…`.
**It is a scaffold, not a finished feature:** the only freely redistributable car model
bundled is a sports car, so it renders the same body shell for every vehicle regardless of
what the listing actually is. Useful for demonstrating the viewer; do not point it at a
live inventory without swapping in body-type-accurate models under `backend/assets/`.

### 4. Run

```bash
npm run dev             # API on :3001, web on :4200
```

| URL                            | What                       |
| ------------------------------ | -------------------------- |
| http://localhost:4200          | Storefront                 |
| http://localhost:4200/admin    | Back office                |
| http://localhost:3001/api      | API                        |

**Demo login:** `admin@veloramotors.ph` / `admin123` — change this before going live.

---

## Theming

The storefront and back office ship in **light, dark and system**. System follows the
visitor's OS setting and switches live when it changes; an explicit choice is remembered
per browser and always wins.

Visitors switch it from the sun/moon button in the header; staff get a Light / System / Dark
segmented control at the bottom of the admin sidebar.

Both palettes are defined in one place — `frontend-app/src/styles.css`:

- `:root` holds the **light** palette (the default)
- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` handles system dark
- `:root[data-theme="dark"]` handles the explicit choice

Components only ever reference tokens (`--surface`, `--text-2`, `--raise-1`, `--scrim`…),
never raw colours, so both themes stay in sync from that single file. Change a brand colour
once and it lands everywhere.

Two deliberate exceptions stay dark in both themes, because white chrome over a bright
photograph is unreadable: overlay buttons sitting on vehicle images, and the fullscreen
lightbox.

`index.html` resolves the theme in a tiny inline script before first paint, so there is no
white flash on load for dark-mode visitors.

## Renaming the dealership

Everything customer-facing reads from one file:

```
frontend-app/src/app/core/brand.ts
```

Name, tagline, phone, WhatsApp number, email, address, opening hours, social links and the
financing defaults all live there. Change them once and the whole site follows — nav, footer,
page titles, enquiry messages, WhatsApp deep links and the loan calculator.

---

## Project layout

```
backend/
  src/
    auth/          JWT login, guard, strategy
    cars/          inventory CRUD, filters, photo upload, stats
    makes/         brands
    customers/     customer records
    leads/         enquiry pipeline (new → contacted → negotiating → won/lost)
    public/        unauthenticated storefront API
    common/guards/ in-memory rate limiter for the public enquiry form
    seed.ts        demo data
    fill-photos.ts photo backfill
  uploads/         vehicle photos (gitignored)

frontend-app/
  src/app/
    core/          brand config, models, services, guard, interceptor, format helpers
    layout/        public nav + footer, admin shell
    pages/         home, inventory, vehicle, compare, favourites, sell, about,
                   contact, login, 404 · admin: dashboard, cars, car-form,
                   car-detail, leads, makes, customers
    shared/        car card, toast host, scroll-reveal directive
  src/styles.css   design system (tokens, buttons, forms, badges, motion)
```

---

## API

### Public — no authentication

| Method | Endpoint                        | Purpose                                        |
| ------ | ------------------------------- | ---------------------------------------------- |
| GET    | `/api/public/stats`             | Headline counts for the hero                   |
| GET    | `/api/public/makes`             | Brands with live stock counts                  |
| GET    | `/api/public/featured`          | Featured vehicles                              |
| GET    | `/api/public/cars`              | Paginated, filterable inventory                |
| GET    | `/api/public/cars/facets`       | Price/year bounds and body-type counts         |
| GET    | `/api/public/cars/:id`          | One vehicle (increments its view counter)      |
| GET    | `/api/public/cars/:id/similar`  | Related vehicles                               |
| POST   | `/api/public/leads`             | Enquiry form (rate-limited: 5/minute per IP)   |

`/api/public/cars` accepts `makeId`, `search`, `status`, `bodyType`, `transmission`,
`fuelType`, `yearMin`, `yearMax`, `priceMin`, `priceMax`, `mileageMax`, `seats`, `sort`,
`page` and `limit`. Sold units are hidden unless `status=sold` is passed explicitly.

### Authenticated — `Authorization: Bearer <token>`

| Method | Endpoint                          | Purpose                          |
| ------ | --------------------------------- | -------------------------------- |
| POST   | `/api/auth/login`                 | Obtain a token                   |
| GET    | `/api/cars` · `/api/cars/stats`   | Inventory list and dashboard data |
| POST   | `/api/cars`                       | Create (multipart: `photo`, `images[]`) |
| PATCH  | `/api/cars/:id`                   | Update                           |
| PATCH  | `/api/cars/:id/status`            | Set availability                 |
| PATCH  | `/api/cars/:id/featured`          | Toggle homepage feature          |
| DELETE | `/api/cars/:id`                   | Delete (also removes its photos) |
| GET    | `/api/leads` · `/api/leads/stats` | Lead pipeline                    |
| PATCH  | `/api/leads/:id`                  | Move stage, save internal notes   |
| —      | `/api/makes`, `/api/customers`    | Standard CRUD                    |

---

## Deployment

The repository deploys to Vercel as one project: the Angular build is served as
static files, and the whole NestJS app runs behind a single serverless function.

| Piece | Where it comes from |
| ----- | ------------------- |
| SPA + assets | `frontend-app/dist/frontend/browser`, served by the CDN |
| `/api/*` | `api/[...path].js` → the tsc-built `backend/dist` |
| `/uploads/*` | `frontend-app/public/uploads`, served by the CDN |

`api/[...path].js` is a catch-all by filename rather than by rewrite: routing
through a rewrite rewrites `req.url` to the destination, and Nest matches on
`req.url`, so `/api/public/cars` would arrive as `/api` and 404.

It is plain CommonJS because Vercel compiles that directory with esbuild, which
does not support `emitDecoratorMetadata` — and both Nest DI and TypeORM depend
on it. The API is therefore compiled ahead of time by tsc and the function only
loads the result.

### Required environment variables

Set these in the Vercel project (not in a committed file):

    NODE_ENV=production
    DATABASE_URL               # the single URL Neon/Supabase/Railway give you
    JWT_SECRET                 # a fresh 48-byte random value, not the dev one

Or, instead of `DATABASE_URL`, the discrete fields:

    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    PGSSLMODE=require          # any managed Postgres

Set `DB_SYNC=true` for the single deploy that creates the schema, then remove
it. Schema auto-sync is off in production by default; leaving it on lets every
cold start ALTER live tables.

### Known limits

- **Admin image upload does not persist in production.** Multer writes to disk,
  and a serverless filesystem is ephemeral and read-only outside `/tmp`. The
  seeded photography is committed and served statically, so the storefront is
  unaffected — but new uploads need object storage (Vercel Blob, S3, Cloudinary)
  before that feature works live.
- **The public rate limiter is in-memory**, so it is per-instance. Serverless
  scales to many instances, which weakens it considerably — back it with Redis
  if it needs to be real.
- **Cold starts pay for the Nest bootstrap and a new Postgres pool.** The app is
  cached per warm instance and the pool capped at 3; use a pooled connection
  string (Neon's `-pooler` host) so many instances do not exhaust the cluster.
- **Rotate the demo credentials** before launch — both the admin password and
  `JWT_SECRET`.

---

## Scripts

Run from the repository root:

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run install:all` | Install both applications           |
| `npm run dev`       | Run API and web together              |
| `npm run dev:api`   | API only, watch mode                  |
| `npm run dev:web`   | Web only                              |
| `npm run build`     | Production build of both              |
| `npm run seed`      | Seed demo data                        |
| `npm run photos`    | Backfill missing vehicle photos       |

Demo vehicle photographs come from Wikipedia/Wikimedia Commons and are used here for
demonstration only. Replace them with your own photography before trading.
