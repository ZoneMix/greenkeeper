// Mower and spreader reference data used by settings and mowing tasks.

export interface DeckPosition {
  readonly position: number;
  readonly inches: number;
  readonly use: 'avoid' | 'final-mow' | 'transition' | 'regular' | 'summer';
  readonly label: string;
}

export interface MowerModel {
  readonly value: string;
  readonly label: string;
  readonly deckChart: string | null;
}

export const MOWER_BRANDS = [
  { value: 'ego', label: 'EGO Power+' },
  { value: 'honda', label: 'Honda' },
  { value: 'toro', label: 'Toro' },
  { value: 'husqvarna', label: 'Husqvarna' },
  { value: 'john-deere', label: 'John Deere' },
  { value: 'other', label: 'Other' },
] as const;

export const MOWER_MODELS: Readonly<Record<string, ReadonlyArray<MowerModel>>> = {
  ego: [
    { value: 'ego-21-select-cut', label: 'EGO 21" Select Cut Self-Propelled (LM2134SP/LM2135SP)', deckChart: 'ego-21' },
    { value: 'ego-21', label: 'EGO 21" Standard (LM2100/LM2102)', deckChart: 'ego-21' },
    { value: 'ego-21-xp', label: 'EGO 21" Select Cut XP (LM2156SP)', deckChart: 'ego-21' },
  ],
  honda: [{ value: 'honda-hrx', label: 'Honda HRX 21"', deckChart: null }],
  toro: [{ value: 'toro-recycler', label: 'Toro Recycler 22"', deckChart: null }],
};

const DECK_HEIGHT_CHARTS: Readonly<Record<string, ReadonlyArray<DeckPosition>>> = {
  'ego-21': [
    { position: 1, inches: 1.5, use: 'avoid', label: 'Too low for cool-season grass' },
    { position: 2, inches: 2.0, use: 'avoid', label: 'Too low for most home lawns' },
    { position: 3, inches: 2.5, use: 'final-mow', label: 'Final mow of the season only' },
    { position: 4, inches: 3.0, use: 'transition', label: 'Early spring transition' },
    { position: 5, inches: 3.5, use: 'regular', label: 'Regular mowing (spring and fall)' },
    { position: 6, inches: 4.0, use: 'summer', label: 'Summer mowing (heat protection)' },
  ],
};

export const DECK_USE_LABELS: Readonly<Record<DeckPosition['use'], string>> = {
  avoid: 'Avoid',
  'final-mow': 'Final mow',
  transition: 'Spring',
  regular: 'Regular',
  summer: 'Summer',
};

export const SPREADER_MODELS = [
  { value: 'scotts-elite', label: 'Scotts Elite' },
  { value: 'scotts-edgeguard-dlx', label: 'Scotts EdgeGuard DLX' },
  { value: 'scotts-wizz', label: 'Scotts Wizz (handheld)' },
  { value: 'other', label: 'Other' },
] as const;

export function getDeckChart(mowerModel: string | null): ReadonlyArray<DeckPosition> | null {
  if (!mowerModel) return null;
  const direct = DECK_HEIGHT_CHARTS[mowerModel];
  if (direct) return direct;
  for (const models of Object.values(MOWER_MODELS)) {
    const match = models.find((m) => m.value === mowerModel);
    if (match?.deckChart) return DECK_HEIGHT_CHARTS[match.deckChart] ?? null;
  }
  return null;
}
