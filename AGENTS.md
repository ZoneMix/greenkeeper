# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Working in this repo

- Layering: route handler → service → repository. Routes stay thin; SQL lives only in `src/server/repositories/`; domain rules live in `src/server/services/` or, when the browser needs them too, `src/lib/domain/`.
- Validate every API input with a zod schema from `src/lib/domain/schemas.ts` (strict objects). Return errors through `AppError` / `handle()` so the `{ error: { code, message, details } }` envelope stays consistent.
- Schema changes are additive migrations only (`src/server/db/migrations.ts`), each covered by `tests/unit/migrations.test.ts`. Existing user data must survive every upgrade.
- Never suggest, link or buy a product that is not both organic and kid/pet-safe.
- UI: no state by colour alone (icon + words, dashed pattern for warnings), keyboard reachable, labelled controls, respect `prefers-reduced-motion`. Busy buttons use `aria-disabled` (not `disabled`, which drops focus); announce results with `announce()` from `src/lib/announce.ts`.
- Before committing: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
