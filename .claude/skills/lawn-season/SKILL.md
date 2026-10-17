---
name: lawn-season
description: Use when planning seasonal lawn care tasks, scheduling applications, or determining what to apply and when for Zone 4b. Generates organic, child-safe schedules aligned with the Greenkeeper app's data model.
---

# Lawn Season Planner — Zone 4b

Generate or adjust seasonal lawn care schedules following these Zone 4b timing windows.

## Zone 4b Calendar

| Window | Dates | Key Activities |
|--------|-------|----------------|
| Early Spring | Apr 1–20 | Pre-emergent (corn gluten at soil 55F), first mow, soil test |
| Late Spring | Apr 20–May 15 | First organic fertilizer (Milorganite/Espoma) |
| Late Spring/Early Summer | May 15–Jun 1 | Overseed bare spots, transition to summer mowing height |
| Summer | Jun–Aug | Light mid-summer fertilizer, spot-treat weeds, deep water 1"/week |
| Late Summer | Aug 15–Sep 1 | Optional second pre-emergent (sun areas only) |
| Fall (critical window) | Sep 1–Oct 15 | Core aerate → heavy overseed → fall fertilizer (most important feeding) |
| Late Fall | Oct 15–Nov 10 | Winterizer, lime if needed, final mow at 2.5", leaf cleanup |

## Constraints

- All products must be organic AND kid/pet-safe
- Never recommend synthetic fertilizers, 2,4-D herbicides, or products requiring re-entry periods > 2 hours
- Iron-based weed control (FeHEDTA) is acceptable — safe after spray dries
- Corn gluten meal is the only acceptable pre-emergent
- Do not apply pre-emergent within 6 weeks of planned overseeding

## When Generating Tasks for the App

Add template tasks to `src/server/catalog/season-template.ts` (month-day dates; `planSeason` applies them per year) or create them via `POST /api/tasks`:
- Categories: fertilizer, weed-control, mowing, aeration, overseeding, soil-test, cleanup, watering
- Zones: front, back, both
- Link tasks to products by name in the template (`productNames`, first eligible match wins) or by `product_id` via the API
- Set `status: 'pending'` for new tasks

## Adjustments

- If weather API is integrated, shift dates based on actual soil temperature and precipitation
- Late May overseeding is marginal in Zone 4b — fall (Sep 1–15) is the primary seeding window
- Skip second pre-emergent if crabgrass was not an issue the previous year. It is not in the default template: Aug 15 falls within 6 weeks of the Sep 7 overseeding, and the app flags that conflict (`checkSchedule`)
