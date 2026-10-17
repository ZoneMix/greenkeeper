'use client';

import { useEffect, useId, useRef } from 'react';
import { useAction } from '@/hooks/useAction';
import { announce } from '@/lib/announce';
import { api } from '@/lib/api-client';
import { productLabel } from '@/lib/domain/format';
import type { ShoppingItem } from '@/lib/domain/types';
import { ConfirmDelete } from '../ui/ConfirmDelete';
import { ErrorNotice } from '../ui/Notice';
import { SafetyTags, Tag } from '../ui/Tag';

interface ShoppingRowProps {
  readonly item: ShoppingItem;
  readonly onChanged: () => void;
  /** Focus this row's checkbox on mount (it just moved between lists). */
  readonly autoFocus?: boolean;
  readonly onToggled?: (id: number) => void;
}

export function ShoppingRow({ item, onChanged, autoFocus = false, onToggled }: ShoppingRowProps) {
  const action = useAction();
  const checkId = useId();
  const checkRef = useRef<HTMLInputElement>(null);
  const name = item.product ? productLabel(item.product) : (item.custom_name ?? 'Item');

  useEffect(() => {
    if (autoFocus) checkRef.current?.focus();
  }, [autoFocus]);

  function toggle(purchased: boolean): void {
    // aria-disabled, not disabled: disabling the focused box would drop keyboard focus.
    if (action.pending) return;
    void action.run(
      () => api.shopping.update(item.id, { purchased }),
      () => {
        announce(purchased ? `${name} bought${item.product ? ' and added to inventory' : ''}` : `${name} back on the list`);
        onToggled?.(item.id);
        onChanged();
      },
    );
  }

  return (
    <li>
      <div className={`row${item.purchased ? ' is-done is-purchased' : ''}`}>
        <div className="row-main">
          <label className="check" htmlFor={checkId}>
            <input
              ref={checkRef}
              id={checkId}
              type="checkbox"
              checked={item.purchased}
              aria-disabled={action.pending || undefined}
              onChange={(e) => toggle(e.target.checked)}
            />
            <span className="row-title">{name}</span>
            <span className="sr-only">{item.purchased ? '(bought)' : '(to buy)'}</span>
          </label>
          <div className="row-meta">
            <span className="num">
              {item.quantity_needed} {item.unit}
            </span>
            {item.source === 'generated' ? (
              <Tag icon="sparkle" tone="quiet">
                Suggested
              </Tag>
            ) : (
              <Tag tone="quiet">Added by you</Tag>
            )}
            {item.product ? <SafetyTags product={item.product} /> : null}
            {item.inventory_id !== null ? (
              <Tag icon="box" tone="good">
                In inventory
              </Tag>
            ) : null}
          </div>
          {item.notes ? <p className="meta">{item.notes}</p> : null}
        </div>
        <div className="row-actions">
          <ConfirmDelete
            name={name}
            pending={action.pending}
            onConfirm={() =>
              action.run(
                () => api.shopping.remove(item.id),
                () => {
                  announce(`${name} removed`);
                  onChanged();
                },
              )
            }
          />
        </div>
        {action.error ? (
          <div className="row-detail">
            <ErrorNotice message={action.error} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
