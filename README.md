# Greenkeeper

An organic lawn care planner for one yard (the bundled season template is tuned for USDA zone 4b). It keeps the
season's tasks on a calendar, tracks what is on the shelf, builds the shopping list from
upcoming work, and reads the local forecast to say whether a task's day looks good.

House rules the app enforces:

- **Organic and kid/pet-safe only.** New products must be both; nothing else is ever
  suggested, linked to a task or added to the shopping list. Older rows that break the
  rule are flagged on the Today page, not deleted.
- **Season:** April 1 to November 10. Cool-season grass (Kentucky bluegrass, perennial
  ryegrass, fine fescue) on a yard with mixed sun and shade.
- **Colour is never the only signal.** Every status has an icon and words; warnings also
  use a dashed pattern.

## Setup

Requirements: Node 22+ and pnpm (see `packageManager` in `package.json`; `corepack enable`
picks the right version).

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

No environment variables or API keys are needed. The database is created, migrated and
(on a brand-new file only) seeded on the first API request.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LAWN_DB_PATH` | `./data/lawn.db` | SQLite file to use (`:memory:` works for experiments) |
| `LAWN_WEATHER_DISABLED` | unset | Set to `1` to skip Open-Meteo (offline use, tests) |

## Your yard

Everything specific to a yard lives in one JSON file: city and coordinates (for the
forecast), time zone, growing season, lawn areas, shade, mower and spreader, your soil
lab, and any extra products. The repo ships an example yard in
`config/greenkeeper.example.json`. To use your own:

```sh
cp config/greenkeeper.example.json config/greenkeeper.config.json   # gitignored
# edit it, then restart `pnpm dev` or rebuild
```

The first file found wins: `$GREENKEEPER_CONFIG`, `personal/greenkeeper.config.json`,
`config/greenkeeper.config.json`, then the example. The file is read at build time (the
browser needs the time zone and season too) and validated on startup with a readable
error. Your settings row is created from it on the first run only; after that, edit
settings in the app. `personal/` is gitignored for keeping private data next to a fork.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Next.js 16, Turbopack) |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint, zero warnings allowed |
| `pnpm typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `pnpm test` | Vitest: domain logic, migrations against old-schema databases, API routes |
| `pnpm test:e2e` | Playwright smoke test, headless, desktop + mobile, no network |

## Data and backups

Everything lives in one SQLite file, `data/lawn.db` (gitignored). To back it up, copy
the file while the app is stopped, or use SQLite's online backup while it runs:

```sh
sqlite3 data/lawn.db ".backup data/lawn-$(date +%F).db"
```

Before applying a schema migration to an existing database the app writes a snapshot
to `data/backups/lawn-pre-migration-<timestamp>.db` and keeps the newest five. To roll
back, stop the app and copy a snapshot over `data/lawn.db`.

Migrations are additive only: tables and columns are never dropped or renamed, so a
database from any earlier version opens and upgrades in place. `GET /api/health` reports
the schema version.

## Architecture

```
src/
  app/                 Next.js routes: pages (client components) and api/*/route.ts
  components/          UI by feature (today, calendar, inventory, shopping, settings, tasks, ui)
  hooks/               useResource (load + reload), useAction (mutations), useToday
  lib/
    api-client.ts      Typed fetch wrapper; pages never call fetch directly
    domain/            Shared by server and browser: constants, types, zod schemas,
                       dates, season math, schedule rules, weather advice
  server/              Server-only
    database.ts        Lazy singleton: connect → migrate → seed once
    db/                connection, migration runner, migration list
    repositories/      Raw SQL per table (better-sqlite3, no ORM)
    services/          Domain logic: tasks, season planner, seed, dashboard,
                       shopping generator (rules + pure planner), weather
    weather/           Open-Meteo client and SQLite cache
    http/              handle() wrapper, parseBody/parseQuery/parseId, error envelope
    catalog/           Starter products and the zone 4b season template
  styles/              Design tokens and plain CSS (no Tailwind)
tests/                 Vitest unit + API tests (each uses a temp database)
e2e/                   Playwright smoke test
```

Request flow: `route.ts` parses input with a zod schema from `lib/domain/schemas.ts`,
calls a service, and returns the standard envelope. Services enforce domain rules
(product safety, completed dates); repositories only run SQL.

## API

All responses are JSON. Success: `{ "data": ..., "meta"?: { "total": n } }`. Failure:
`{ "error": { "code", "message", "details": [{ "field", "message" }] } }` (`details` is `[]` when there is nothing field-specific) with codes
`validation_error` (400, 413), `invalid_json` (400), `not_found` (404), `conflict` (409),
`unsafe_product` (422), `weather_unavailable` (503), `server_error` (500). Unknown fields
are rejected, not ignored.

| Method and path | Body / query | Notes |
| --- | --- | --- |
| `GET /api/dashboard` | | Season status, next/overdue/upcoming tasks, counts, unsafe products, schedule warnings, next unplanned season |
| `GET /api/tasks` | `status`, `category`, `month=YYYY-MM`, `from`, `to`, `limit` | |
| `POST /api/tasks` | `title`, `category`, `scheduled_date`, `zone?`, `description?`, `product_id?`, `notes?` | Linked product must be organic and kid-safe |
| `GET /api/tasks/:id` | | Includes the linked `product` |
| `PATCH /api/tasks/:id` | any task field, `status` | Completing stamps `completed_date`; reopening or skipping clears it |
| `DELETE /api/tasks/:id` | | |
| `POST /api/season/plan` | `year` | Adds the zone 4b template for that year; repeat calls add nothing |
| `GET /api/products` | `category`, `search` | |
| `POST /api/products` | `name`, `brand`, `category`, `coverage_sqft?`, `url?`, `notes?`, `tool_type?` | `organic` and `kid_safe` default to and must be `true` |
| `GET /api/inventory` | | Items with their product |
| `POST /api/inventory` | `product_id`, `quantity`, `unit`, `purchased_date?`, `notes?` | |
| `PATCH` / `DELETE /api/inventory/:id` | `quantity`, `unit`, `purchased_date`, `notes` | |
| `GET /api/shopping` | `purchased=true\|false` | Rows carry `source`: `manual` or `generated` |
| `POST /api/shopping` | `product_id` or `custom_name`, `quantity_needed?`, `unit`, `notes?` | |
| `PATCH` / `DELETE /api/shopping/:id` | `quantity_needed`, `unit`, `purchased`, `notes` | Marking a product row bought adds it to inventory once (`inventory_id`); un-marking removes that stock unless it was edited |
| `POST /api/shopping/generate` | `horizon_days?` (1–120, default 30), `dry_run?` | See below |
| `GET /api/settings` / `PUT /api/settings` | any settings field | Partial update |
| `GET /api/weather` | | Forecast + task timing advice; 503 when unavailable |
| `GET /api/health` | | Schema version |

### Shopping generator

Looks at pending tasks from 14 days ago (recently overdue) to `horizon_days` ahead and maps
each task category to products:

| Task | Buys |
| --- | --- |
| Fertilizer | Linked product, else the best safe fertilizer; titles with "winterizer" or "lime" pick those; "light" feedings use half rate |
| Weed control | Corn gluten for pre-emergents; nothing for hand weeding unless a safe product is linked |
| Overseeding | Grass seed, plus clover and compost when the task mentions them; "bare/thin spots" sizes a quarter of the area |
| Aeration / soil test | A rental or lab-fee line item |
| Mowing, watering, cleanup | Nothing |

Amount = ceil(area × rate ÷ coverage per bag) − bags/bottles on hand − matching items you
added yourself. Stock recorded in lb/oz/gal is mentioned but not guessed at. Only
unpurchased rows the generator made are updated or removed; your own rows and purchase
history are never touched. Ticking a product as bought puts it in inventory, so the next run
counts it instead of suggesting it again. Inventory is not reduced when a task is marked
done; adjust quantities on the Inventory page after applying a product.

### Weather

[Open-Meteo](https://open-meteo.com/) (free, no key) for the coordinates in Settings:
current conditions, seven days of highs/lows, rain and wind, and daily soil temperature
at 6 cm. Cached in SQLite for 30 minutes; if the service is down the last forecast is
shown (marked stale) for up to 12 hours, then the page simply says weather is
unavailable. Timing notes cover corn gluten vs 55°F soil, rain washing or watering in
fertilizer, seed germination temperatures and frost, wet grass, weekly rain vs watering,
and soggy soil for aeration. Notes are suggestions; task dates never move by themselves.

## Package manager

pnpm only. The repo had both `package-lock.json` and `pnpm-lock.yaml`; `pnpm-workspace.yaml`
already held pnpm's native-build allowlist for better-sqlite3, so npm's lockfile was
removed to keep one source of truth for dependency versions.

## License

MIT. See `LICENSE`.
