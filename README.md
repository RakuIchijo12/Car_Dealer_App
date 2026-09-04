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

### Studio photography via CarImages (optional)

For genuinely uniform imagery — every vehicle at the same angle on the same background —
wire up [CarImages](https://carimagesapi.com). It needs **two** credentials; the key alone
will not authenticate:

```bash
# backend/.env
CARIMAGES_API_KEY=ci_...        # identifies the account, safe client-side
CARIMAGES_API_SECRET=...        # authorises the request, server-side only
CARIMAGES_ANGLE=front34         # the classic three-quarter
```

```bash
npm run photos:carimages            # only vehicles missing a photo
npm run photos:carimages -- --all   # re-shoot the whole inventory
npm run photos:optimize             # then compress
```

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
