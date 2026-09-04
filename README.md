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

### Vehicle photography — CarImages studio renders

The demo inventory uses studio renders from [CarImages](https://carimagesapi.com): the
correct model for every listing, shot at one angle under one lighting setup.

```bash
# backend/.env
CARIMAGES_API_KEY=ci_...        # the /signed-url flow authenticates on this alone
CARIMAGES_API_SECRET=           # optional; sent as X-Api-Secret on plans that need it
CARIMAGES_ANGLE=front34
```

```bash
npm run photos:carimages -- --preview=4   # 4 into uploads/_carimages-preview,
                                          # database untouched — look before you leap
npm run photos:carimages                  # only vehicles missing a photo
npm run photos:carimages -- --all         # re-shoot the whole inventory
```

The API returns each car **cut out on transparency**, so the script composites a soft
contact shadow and keeps the alpha rather than flattening onto a colour. One asset then
reads correctly on both the light and dark themes, sitting on whatever the page background
is. Output is 1600x1000 WebP, roughly 320 KB each.

It also reads the render's dominant paint colour back and writes it to the listing, because
the API ignores any colour parameter — without that a listing could claim "Silver" beside a
red car.

**Tier caveats, all verified against the live API rather than the docs:**

| Parameter | Behaviour on the free tier |
| --------- | -------------------------- |
| `width`   | **Honoured** — 1600 returns 1536x1024 instead of the 750x500 default |
| `angle`   | Ignored — all ten values tested return byte-identical images |
| `color`   | Ignored — every value returns byte-identical images |
| `format`  | Ignored — always WebP |
| watermark | Always applied; a paid plan is required to remove it |

Replace these with your own photography of your actual stock before trading — buyers of
used cars want to see the specific unit, not a manufacturer render.

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

## Deployment notes

- **`CORS_ORIGINS`** — comma-separated list of allowed browser origins. It defaults to
  `http://localhost:4200`; set it to your real domain in production or the browser will
  block every API call.
- **`synchronize: true`** is enabled in `backend/src/database/database.module.ts`. That is
  convenient in development but will alter your production schema on boot — switch to
  TypeORM migrations before you carry real customer data.
- **Uploads are stored on local disk.** On an ephemeral host (Vercel, Heroku, most
  containers) they vanish on redeploy. Move to S3, Cloudinary or a mounted volume.
- **The public rate limiter is in-memory**, so it is per-instance. Behind more than one
  replica, back it with Redis.
- **Rotate the demo credentials** before launch — both the admin password and `JWT_SECRET`.

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
