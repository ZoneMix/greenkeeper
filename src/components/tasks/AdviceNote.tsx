import type { TaskWeatherAdvice } from '@/lib/domain/types';
import { Notice } from '../ui/Notice';

/** Weather reasoning for a task. Advisory: the task date is never changed for you. */
export function AdviceNote({ advice }: { readonly advice: TaskWeatherAdvice }) {
  const tone = advice.level === 'good' ? 'good' : 'attention';
  const icon = advice.level === 'hold' ? 'pause' : advice.level === 'good' ? 'check' : 'alert';
  return (
    <Notice tone={tone} icon={icon}>
      <p>
        <strong>{advice.headline}.</strong> {advice.reasons.join(' ')}
      </p>
    </Notice>
  );
}
