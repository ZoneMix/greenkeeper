'use client';

import { useState } from 'react';
import { useAction } from '@/hooks/useAction';
import { announce } from '@/lib/announce';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/domain/dates';
import { productLabel } from '@/lib/domain/format';
import type { InventoryItem } from '@/lib/domain/types';
import { ConfirmDelete } from '../ui/ConfirmDelete';
import { ErrorNotice } from '../ui/Notice';
import { SafetyTags } from '../ui/Tag';

interface InventoryRowProps {
  readonly item: InventoryItem;
  readonly onChanged: () => void;
}

export function InventoryRow({ item, onChanged }: InventoryRowProps) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const action = useAction();
  const name = productLabel(item.product);
  const parsed = Number(quantity);
  const dirty = quantity !== String(item.quantity);
  const valid = quantity.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;

  return (
    <li>
      <div className="row">
        <div className="row-main">
          <span className="row-title">{name}</span>
          <div className="row-meta">
            {item.product.category === 'tool' ? null : <SafetyTags product={item.product} />}
            {item.purchased_date ? <span className="meta">Bought {formatDate(item.purchased_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span> : null}
            {item.notes ? <span className="meta">{item.notes}</span> : null}
          </div>
        </div>
        <div className="row-actions">
          <form
            className="qty"
            onSubmit={(event) => {
              event.preventDefault();
              if (!valid || !dirty || action.pending) return;
              void action.run(
                () => api.inventory.update(item.id, { quantity: parsed }),
                () => {
                  announce(`${name}: ${parsed} ${item.unit}`);
                  onChanged();
                },
              );
            }}
          >
            <label className="sr-only" htmlFor={`qty-${item.id}`}>
              Quantity of {name} in {item.unit}
            </label>
            <input
              id={`qty-${item.id}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={quantity}
              aria-invalid={valid ? undefined : true}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <span className="meta">{item.unit}</span>
            <button type="submit" className="btn btn-quiet btn-small" aria-disabled={!valid || !dirty || action.pending || undefined}>
              Save
            </button>
          </form>
          <ConfirmDelete
            name={name}
            pending={action.pending}
            onConfirm={() =>
              action.run(
                () => api.inventory.remove(item.id),
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
