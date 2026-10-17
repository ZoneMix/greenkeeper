import { DECK_USE_LABELS, getDeckChart } from '@/lib/domain/equipment';

/** Deck positions with their use written out; the border style is only a secondary cue. */
export function DeckChart({ mowerModel }: { readonly mowerModel: string | null }) {
  const chart = getDeckChart(mowerModel);
  if (!chart) return null;
  return (
    <div className="stack">
      <span className="meta">Deck height positions</span>
      <ul className="deck">
        {chart.map((position) => (
          <li key={position.position} className={`is-${position.use}`} title={position.label}>
            <span className="pos">{position.position}</span>
            <span className="num">{position.inches.toFixed(1)}&quot;</span>
            <span className="use">{DECK_USE_LABELS[position.use]}</span>
          </li>
        ))}
      </ul>
      <p className="meta">Regular mowing at 5 (3.5&quot;), 6 in summer heat; 3 only for the final mow; 1 and 2 are too short.</p>
    </div>
  );
}
