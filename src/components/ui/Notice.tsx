import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface NoticeProps {
  readonly tone?: 'neutral' | 'good' | 'attention';
  readonly icon?: IconName;
  /** 'alert' interrupts screen readers; use it only for errors the user caused. */
  readonly role?: 'status' | 'alert';
  readonly children: ReactNode;
}

const TONE_CLASS = { neutral: 'notice', good: 'notice notice-good', attention: 'notice notice-attention' } as const;
const DEFAULT_ICON: Readonly<Record<NonNullable<NoticeProps['tone']>, IconName>> = {
  neutral: 'leaf',
  good: 'check',
  attention: 'alert',
};

export function Notice({ tone = 'neutral', icon, role, children }: NoticeProps) {
  return (
    <div className={TONE_CLASS[tone]} role={role}>
      <Icon name={icon ?? DEFAULT_ICON[tone]} />
      <div className="notice-body">{children}</div>
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { readonly message: string; readonly onRetry?: () => void }) {
  return (
    <Notice tone="attention" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <div>
          <button type="button" className="btn btn-quiet btn-small" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </Notice>
  );
}
