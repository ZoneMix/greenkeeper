---
name: product-lookup
description: Use when recommending lawn care products — grass seed, fertilizer, soil amendments, or weed control. Researches organic, kid-safe options for Zone 4b with mixed sun/shade conditions.
---

# Product Lookup — Organic Lawn Care (Zone 4b)

Research and recommend lawn products that meet Greenkeeper's organic + kid-safe requirements.

## Hard Requirements

Every recommended product MUST satisfy ALL of these:
- Organic or naturally derived (OMRI-listed preferred)
- Kid-safe and pet-safe (no re-entry period, or < 2 hours max)
- Appropriate for USDA Zone 4b cool-season lawns
- Available at common retailers (Home Depot, Lowe's, Menards, Amazon, local garden centers)

## Grass Seed Guide (Zone 4b)

| Condition | Recommended Species | Notes |
|-----------|-------------------|-------|
| Full sun | Kentucky Bluegrass + Perennial Ryegrass blend | KBG fills via rhizomes, ryegrass germinates fast |
| Shade | Fine Fescue blend (creeping red + chewings) | Most shade-tolerant cool-season grasses |
| Mixed sun/shade | Sun & Shade blend (KBG + ryegrass + fine fescue) | Best for mixed yards |
| Ground cover | Dutch White Clover | Nitrogen fixer, pollinator-friendly, kid-safe |

Seed application rates:
- New lawn: 3–4 lbs per 1,000 sqft
- Overseeding: 2–3 lbs per 1,000 sqft
- Bare spot repair: 4–6 lbs per 1,000 sqft (heavy rate)

## Trusted Organic Brands

| Category | Brands |
|----------|--------|
| Fertilizer | Milorganite, Espoma, Jonathan Green Organic |
| Weed control | Espoma (corn gluten), BioAdvanced Natria (iron-based) |
| Seed | Scotts (EZ Seed for patches), Pennington, Jonathan Green |
| Soil amendments | Local compost, pelletized lime, Espoma soil conditioners |

## When Adding Products to the App

Match `productCreateSchema` in `src/lib/domain/schemas.ts` (the API rejects anything not organic and kid-safe):
- Set `organic: true` and `kid_safe: true` (mandatory)
- Include `coverage_sqft` when available from the product label
- Add `notes` with application instructions and safety info
- Include `url` to manufacturer site when known
- Categories: fertilizer, weed-control, seed, soil-amendment, tool, other

## Research Workflow

1. Check existing products first (`GET /api/products`, and the starter list in `src/server/catalog/products.ts`) — avoid duplicates
2. For new product research, use web search to verify: organic certification, safety data, Zone 4b suitability, current retail availability
3. Cross-reference with your state cooperative extension's recommendations when possible
