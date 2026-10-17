import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface PageHeadProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: ReactNode;
  readonly actions?: ReactNode;
}

/** Page title block: a leaf-and-words eyebrow over a large title (the zonemix.tech kicker, softened). */
export function PageHead({ eyebrow, title, lede, actions }: PageHeadProps) {
  return (
    <header className="page-head rise">
      <span className="kicker">
        <Icon name="leaf" size="sm" />
        {eyebrow}
      </span>
      <div className="page-head-row">
        <h1 className="page-title">{title}</h1>
        {actions ? <div className="cluster">{actions}</div> : null}
      </div>
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}

interface SectionProps {
  readonly id: string;
  readonly title: string;
  readonly note?: ReactNode;
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}

/** A heading rail beside a content column; stacks on narrow screens. */
export function Section({ id, title, note, aside, children }: SectionProps) {
  const headingId = `${id}-title`;
  return (
    <section className="sect rise rise-1" aria-labelledby={headingId}>
      <div className="sect-head">
        <h2 id={headingId} className="h2">
          {title}
        </h2>
        {note ? <p className="note">{note}</p> : null}
        {aside}
      </div>
      <div className="stack">{children}</div>
    </section>
  );
}

export function EmptyState({ children, action }: { readonly children: ReactNode; readonly action?: ReactNode }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Loading({ label }: { readonly label: string }) {
  return (
    <div role="status" aria-live="polite" className="stack">
      <span className="sr-only">{label}</span>
      <div className="skeleton" aria-hidden="true" />
      <div className="skeleton" aria-hidden="true" />
    </div>
  );
}

interface MeterProps {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly valueText: string;
  readonly start?: string;
  readonly end?: string;
}

/** Progress bar that always shows its value as text too. */
export function Meter({ label, value, max, valueText, start, end }: MeterProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="meter">
      <div className="meter-labels">
        <span>{label}</span>
        <span className="num">{valueText}</span>
      </div>
      <div className="meter-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={valueText}>
        <div className="meter-fill" style={{ width: `${percent}%` }} />
      </div>
      {start || end ? (
        <div className="meter-labels meta">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      ) : null}
    </div>
  );
}
