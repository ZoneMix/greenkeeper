'use client';

import { useState, type FormEvent } from 'react';
import { useAction } from '@/hooks/useAction';
import { api } from '@/lib/api-client';
import { UNITS } from '@/lib/domain/constants';
import { productLabel } from '@/lib/domain/format';
import { inventoryCreateSchema } from '@/lib/domain/schemas';
import type { Product } from '@/lib/domain/types';
import { Field } from '../ui/Field';
import { ErrorNotice } from '../ui/Notice';

interface InventoryFormProps {
  readonly products: ReadonlyArray<Product>;
  readonly today: string;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

export function InventoryForm({ products, today, onSaved, onCancel }: InventoryFormProps) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('bag');
  const [purchased, setPurchased] = useState(today);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (action.pending) return;
    const parsed = inventoryCreateSchema.safeParse({
      product_id: productId ? Number(productId) : undefined,
      quantity: quantity.trim() === '' ? undefined : Number(quantity),
      unit,
      purchased_date: purchased || null,
      notes: notes.trim() ? notes : null,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    await action.run(() => api.inventory.create(parsed.data), onSaved);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Product" error={errors.product_id ? 'Choose a product' : null}>
        {(props) => (
          <select {...props} value={productId} onChange={(e) => setProductId(e.target.value)} autoFocus>
            <option value="">Choose…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
                {p.category !== 'tool' && !(p.organic && p.kid_safe) ? ' (not organic/kid-safe)' : ''}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="form-row">
        <Field label="Quantity" error={errors.quantity}>
          {(props) => <input {...props} type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />}
        </Field>
        <Field label="Unit">
          {(props) => (
            <select {...props} value={unit} onChange={(e) => setUnit(e.target.value as (typeof UNITS)[number])}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Bought on" error={errors.purchased_date}>
          {(props) => <input {...props} type="date" value={purchased} onChange={(e) => setPurchased(e.target.value)} />}
        </Field>
      </div>
      <Field label="Notes" hint="Where it is stored, lot number, anything useful.">
        {(props) => <input {...props} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      {action.error ? <ErrorNotice message={action.error} /> : null}
      <div className="sheet-foot">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" aria-disabled={action.pending || undefined}>
          {action.pending ? 'Saving…' : 'Add to inventory'}
        </button>
      </div>
    </form>
  );
}
