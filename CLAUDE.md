# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Greenkeeper: lawn care planner for one yard, configured in `config/` (location, yard, equipment). The bundled season template is tuned for USDA Zone 4b. Seasonal tasks on a calendar, product inventory, a rule-based shopping list, and Open-Meteo weather notes on task timing.

**Domain constraints — enforced everywhere:**
- Products recommended, linked to tasks or added to shopping MUST be organic AND kid/pet-safe. `productCreateSchema` rejects anything else; `requireEligibleProduct` guards links; the generator skips unsafe rows. Legacy unsafe rows are flagged, never deleted.
- Growing season: April 1 – November 10 (`SEASON` in `src/lib/domain/constants.ts`)
- Mixed sun and shade; cool-season grass (Kentucky bluegrass, perennial ryegrass, fine fescue)
- The owner is colour-blind: never convey state by colour alone. Pair it with an icon and words (`Tag`, `Notice`); warnings also get a dashed border.

## Commands

```
pnpm dev         # Dev server (Next.js 16, Turbopack)
pnpm build       # Production build
pnpm lint        # ESLint, --max-warnings=0
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest (unit + API, temp DBs)
pnpm test:e2e    # Playwright smoke (headless, LAWN_WEATHER_DISABLED=1)
```

pnpm only (no npm lockfile). `@playwright/test` is pinned to 1.63.0 to match the cached chromium build.

Database auto-creates, migrates and (fresh file only) seeds on the first `getDb()` call. Default file `data/lawn.db` (gitignored); override with `LAWN_DB_PATH`. Pre-migration snapshots go to `data/backups/`.

## Architecture

- `src/lib/domain/` — isomorphic: constants, types, zod schemas, dates (yard-local time via `todayIso`, time zone from the yard config), season math, schedule rules, weather advice. Client and server both import it.
- `src/server/` — server-only. `database.ts` (lazy singleton) → `db/` (connection, `migrate.ts`, `migrations.ts`) → `repositories/` (raw SQL) → `services/` (domain logic) → `http/` (`handle`, `parseBody`, `parseQuery`, `parseId`, envelope).
- `src/app/api/**/route.ts` — thin: parse with a schema, call a service, return `ok`/`okList`. Throw `AppError` for expected failures.
- `src/lib/api-client.ts` — typed fetch wrapper; pages never call `fetch` directly.
- `src/components/<feature>/` + `src/components/ui/` — small client components. Data via `useResource`, mutations via `useAction`.
- `src/styles/` — plain CSS tokens after zonemix.tech (no Tailwind). Day/night themes via `:root.dark`; motion off under `prefers-reduced-motion`.

## Data Model

Original tables (never drop/rename columns): `schedule_tasks`, `products`, `inventory`, `shopping_list`, `lawn_settings`.
Added: `schema_migrations`, `app_meta` (seed marker), `weather_cache`, `shopping_list.source` (`manual` | `generated`), `shopping_list.inventory_id` (stock created when a row is bought).
Products link to tasks via `product_id`. New products get `organic = 1` and `kid_safe = 1`.

## Changing the schema

Add a new entry to `MIGRATIONS` in `src/server/db/migrations.ts` with the next version. Additive only (CREATE ... IF NOT EXISTS, `addColumnIfMissing`, backfills). Add a case to `tests/unit/migrations.test.ts`, which upgrades real old-schema fixtures from `tests/helpers/legacy-db.ts`.

## Gotchas

- The seed runs once per database (`app_meta.seed_version`). A DB that already has rows is adopted without inserts. To add template tasks for a year use `POST /api/season/plan` (idempotent by title + year).
- Season template lives in `src/server/catalog/season-template.ts` (month-day dates, 16 tasks); starter products in `catalog/products.ts` (13). Template product names are lookup keys.
- Pages are prerendered: use `useToday()` (client-only) rather than computing the date during render.
- Next.js 16 has breaking API changes — read `node_modules/next/dist/docs/` before using unfamiliar APIs (e.g. `error.tsx` gets `unstable_retry`).
- Fonts are self-hosted via `@fontsource-variable/*` (Bricolage Grotesque, JetBrains Mono); builds need no network.
