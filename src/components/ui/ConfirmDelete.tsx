'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

interface ConfirmDeleteProps {
  /** What is being removed, for the accessible name. */
  readonly name: string;
  readonly pending: boolean;
  readonly onConfirm: () => void;
}

/** Trash button that asks once before removing. Focus follows the swap both ways. */
export function ConfirmDelete({ name, pending, onConfirm }: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touched = useRef(false);

  useEffect(() => {
    if (!touched.current) return;
    (confirming ? confirmRef : triggerRef).current?.focus();
  }, [confirming]);

  const toggle = (next: boolean) => {
    touched.current = true;
    setConfirming(next);
  };

  if (!confirming) {
    return (
      <button ref={triggerRef} type="button" className="btn btn-ghost btn-small" aria-label={`Remove ${name}`} onClick={() => toggle(true)}>
        <Icon name="trash" size="sm" />
      </button>
    );
  }
  return (
    <span className="cluster" role="group" aria-label={`Remove ${name}?`}>
      <button
        ref={confirmRef}
        type="button"
        className="btn btn-quiet btn-small"
        aria-disabled={pending || undefined}
        onClick={() => {
          if (!pending) onConfirm();
        }}
      >
        <Icon name="trash" size="sm" />
        Remove
      </button>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => toggle(false)}>
        Keep
      </button>
    </span>
  );
}
