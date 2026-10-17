// Zone 4b cool-season template. Dates are month-day so any year can be
// planned. Follows .claude/skills/lawn-season: corn gluten is the only pre-emergent,
// fall (early September) is the main seeding window, and no pre-emergent lands within
// six weeks before an overseeding in the same zone.

import type { TaskCategory, Zone } from '@/lib/domain/types';
import { YARD } from '@/lib/domain/yard-config';
import type { CatalogKey } from './products';

export interface TemplateTask {
  readonly title: string;
  readonly description: string;
  readonly category: TaskCategory;
  /** 'MM-DD' within the growing season. */
  readonly monthDay: string;
  readonly zone: Zone;
  /** Preferred catalog products in order; the first eligible one that exists is linked. */
  readonly productKeys: ReadonlyArray<CatalogKey>;
}

export const SEASON_TEMPLATE: ReadonlyArray<TemplateTask> = [
  {
    title: 'Apply pre-emergent (corn gluten meal)',
    description:
      'Apply corn gluten meal once soil holds 55°F (usually early April in zone 4b). It stops crabgrass and annual ' +
      'weed seeds from germinating and adds slow-release nitrogen. Broadcast 20 lb per 1,000 sq ft and water in ' +
      'lightly. Kids can play on the lawn right away.',
    category: 'weed-control',
    monthDay: '04-07',
    zone: 'both',
    productKeys: ['cornGluten', 'espomaWeedPreventer'],
  },
  {
    title: 'First mow of the season',
    description:
      'Mow when grass reaches 4 to 4.5 inches. Set the mower to 3.5 in and never remove more than a third of ' +
      'the blade. Sharpen the blade first and mulch clippings back in for free nitrogen.',
    category: 'mowing',
    monthDay: '04-12',
    zone: 'both',
    productKeys: [],
  },
  {
    title: `Soil test — send to ${YARD.soil_lab.name}`,
    description:
      'Collect 10 to 15 cores 4 inches deep across the front and back yards, mix, air-dry and mail to ' +
      `${YARD.soil_lab.name}. Results (2 to 3 weeks) show pH, N-P-K and organic matter and decide whether lime is needed.`,
    category: 'soil-test',
    monthDay: '04-17',
    zone: 'both',
    productKeys: ['soilTest'],
  },
  {
    title: 'Spring fertilizer application',
    description:
      'First real feeding of the season with Milorganite or Espoma Organic Lawn Food. Milorganite: 32 lb per ' +
      '2,500 sq ft. Water in lightly if no rain is due within 24 hours. No waiting period for kids or pets.',
    category: 'fertilizer',
    monthDay: '05-03',
    zone: 'both',
    productKeys: ['milorganite', 'espomaLawnFood'],
  },
  {
    title: 'Overseed bare and thin spots',
    description:
      'After the last frost (around May 10), rake bare spots to loosen soil and seed with the sun and shade blend; ' +
      'broadcast white clover over thin areas. Keep seed moist for 2 to 3 weeks and keep traffic off until the ' +
      'grass is 3 inches tall. Spring seeding is marginal in Zone 4b; fall is the main window.',
    category: 'overseeding',
    monthDay: '05-22',
    zone: 'both',
    productKeys: ['sunShadeSeed', 'clover'],
  },
  {
    title: 'Begin summer mowing schedule',
    description:
      'Mow weekly at 3.5 inches in spring and fall and 4 inches in peak heat. Taller grass shades soil, holds ' +
      'moisture and crowds out weeds. Mow early morning or evening and keep mulching clippings.',
    category: 'mowing',
    monthDay: '06-01',
    zone: 'both',
    productKeys: [],
  },
  {
    title: 'Spot-treat broadleaf weeds',
    description:
      'Pull dandelions and plantain with a stand-up weed puller, ideally a day after rain when roots come out ' +
      'whole. Leave clover: it feeds the lawn. Thick, tall turf is the best long-term weed control.',
    category: 'weed-control',
    monthDay: '06-15',
    zone: 'both',
    productKeys: ['weedPuller'],
  },
  {
    title: 'Mid-summer fertilizer (light application)',
    description:
      'Light summer feeding of Milorganite at half rate (16 lb per 2,500 sq ft) so heat-stressed grass is not ' +
      'pushed. Milorganite will not burn in high heat. Apply in the morning and water lightly.',
    category: 'fertilizer',
    monthDay: '07-01',
    zone: 'both',
    productKeys: ['milorganite'],
  },
  {
    title: 'Summer deep watering schedule',
    description:
      'If rain falls short of 1 inch a week, water deeply once or twice a week (1 inch total), early morning. ' +
      'Measure with a tuna can or rain gauge. Summer dormancy is normal for cool-season grass; it recovers in fall.',
    category: 'watering',
    monthDay: '07-15',
    zone: 'both',
    productKeys: [],
  },
  {
    title: 'Core aeration',
    description:
      'Core aerate when soil drops below 80°F (early September). Rent a core aerator, not a spike aerator, make two ' +
      'perpendicular passes and leave the cores to break down. Aerate moist, not soggy, soil.',
    category: 'aeration',
    monthDay: '09-03',
    zone: 'both',
    productKeys: [],
  },
  {
    title: 'Heavy overseed after aeration',
    description:
      'Right after aeration, broadcast the sun and shade blend over the whole lawn and white clover into thin areas. ' +
      'Top-dress seeded areas with a thin layer of compost and keep soil moist for 2 to 3 weeks. This is the most ' +
      'important seeding window of the year in Zone 4b.',
    category: 'overseeding',
    monthDay: '09-07',
    zone: 'both',
    productKeys: ['sunShadeSeed', 'clover', 'compost'],
  },
  {
    title: 'Fall fertilizer (most important of the year)',
    description:
      'Full-rate feeding of Milorganite or Espoma Organic Lawn Food while roots grow fast and store energy for winter. ' +
      'Water in if no rain is due. This feeding decides how green the lawn is next spring.',
    category: 'fertilizer',
    monthDay: '09-17',
    zone: 'both',
    productKeys: ['milorganite', 'espomaLawnFood'],
  },
  {
    title: 'Winterizer fertilizer',
    description:
      'Final feeding with Espoma Organic Winterizer once top growth slows but roots are active (soil near 50°F). ' +
      'Builds winter hardiness and faster spring green-up.',
    category: 'fertilizer',
    monthDay: '10-12',
    zone: 'both',
    productKeys: ['winterizer'],
  },
  {
    title: 'Apply lime if soil test indicated low pH',
    description:
      'Only if the spring soil test showed pH below 6.0: spread pelletized lime at the rate the soil report recommends. ' +
      'Freeze-thaw works it in over winter. Skip entirely if pH was 6.0 to 7.0.',
    category: 'fertilizer',
    monthDay: '10-22',
    zone: 'both',
    productKeys: ['lime'],
  },
  {
    title: 'Final mow of the season',
    description:
      'Lower the mower to 2.5 in for the last mow to reduce snow mold and matting. Mow dry grass, then clean the ' +
      'deck, sharpen the blade, and store batteries at about 50% charge or add fuel stabilizer.',
    category: 'mowing',
    monthDay: '11-02',
    zone: 'both',
    productKeys: [],
  },
  {
    title: 'Fall cleanup — leaf removal, winterize equipment',
    description:
      'Clear leaves (heavy cover smothers grass and invites snow mold); mulch-mow light cover. Drain and store hoses ' +
      'and shut exterior valves before the first hard freeze.',
    category: 'cleanup',
    monthDay: '11-07',
    zone: 'both',
    productKeys: [],
  },
];
