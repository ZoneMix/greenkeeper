import type { ReactNode } from 'react';
import { STATUS_LABELS } from '@/lib/domain/constants';
import type { AdviceLevel, Product, TaskDisplayStatus } from '@/lib/domain/types';
import { Icon, type IconName } from './Icon';

type Tone = 'neutral' | 'good' | 'attention' | 'quiet';

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  neutral: 'tag',
  good: 'tag tag-good',
  attention: 'tag tag-attention',
  quiet: 'tag tag-quiet',
};

interface TagProps {
  readonly icon?: IconName;
  readonly tone?: Tone;
  readonly children: ReactNode;
}

/** A small label that always pairs an icon with words. */
export function Tag({ icon, tone = 'neutral', children }: TagProps) {
  return (
    <span className={TONE_CLASS[tone]}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </span>
  );
}

const STATUS_STYLE: Readonly<Record<TaskDisplayStatus, { icon: IconName; tone: Tone }>> = {
  pending: { icon: 'clock', tone: 'neutral' },
  completed: { icon: 'check', tone: 'good' },
  skipped: { icon: 'skip', tone: 'quiet' },
  overdue: { icon: 'alert', tone: 'attention' },
};

export function StatusTag({ status }: { readonly status: TaskDisplayStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <Tag icon={style.icon} tone={style.tone}>
      {STATUS_LABELS[status]}
    </Tag>
  );
}

const ADVICE_STYLE: Readonly<Record<AdviceLevel, { icon: IconName; tone: Tone; label: string }>> = {
  good: { icon: 'check', tone: 'good', label: 'Good window' },
  caution: { icon: 'alert', tone: 'attention', label: 'Check weather' },
  hold: { icon: 'pause', tone: 'attention', label: 'Consider moving' },
};

export function AdviceTag({ level }: { readonly level: AdviceLevel }) {
  const style = ADVICE_STYLE[level];
  return (
    <Tag icon={style.icon} tone={style.tone}>
      {style.label}
    </Tag>
  );
}

/** Organic and kid/pet-safe badges, or an explicit warning when either is missing. */
export function SafetyTags({ product }: { readonly product: Pick<Product, 'organic' | 'kid_safe'> }) {
  if (product.organic && product.kid_safe) {
    return (
      <Tag icon="shield" tone="good">
        Organic · kid &amp; pet safe
      </Tag>
    );
  }
  const missing = [product.organic ? null : 'not organic', product.kid_safe ? null : 'not kid/pet safe'].filter(Boolean).join(', ');
  return (
    <Tag icon="alert" tone="attention">
      {missing}
    </Tag>
  );
}
