'use client';

import { useState, type FormEvent } from 'react';
import { useAction } from '@/hooks/useAction';
import { api } from '@/lib/api-client';
import { UNITS } from '@/lib/domain/constants';
import { productLabel } from '@/lib/domain/format';
import { shoppingCreateSchema } from '@/lib/domain/schemas';
import type { Product } from '@/lib/domain/types';
import { Field } from '../ui/Field';
import { ErrorNotice } from '../ui/Notice';

type Mode = 'custom' | 'product';

interface AddItemFormProps {
  readonly products: ReadonlyArray<Product>;
  readonly onAdded: () => void;
}

export function AddItemForm({ products, onAdded }: AddItemFormProps) {
  const [mode, setMode] = useState<Mode>('custom');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('bag');
  const [error, setError] = useState<string | null>(null);
  const action = useAction();
  const buyable = products.filter((p) => p.organic && p.kid_safe);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (action.pending) return;
    const parsed = shoppingCreateSchema.safeParse({
      product_id: mode === 'product' && productId ? Number(productId) : null,
      custom_name: mode === 'custom' && name.trim() ? name : null,
      quantity_needed: Number(quantity),
      unit,
    });
    if (!parsed.success) {
      setError(mode === 'custom' ? 'Enter an item name and a quantity above 0' : 'Choose a product and a quantity above 0');
      return;
    }
    setError(null);
    const ok = await action.run(() => api.shopping.create(parsed.data), onAdded);
    if (ok) {
      setName('');
      setProductId('');
      setQuantity('1');
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate aria-label="Add a shopping item">
      <div className="segmented" role="group" aria-label="Item type">
        <button type="button" aria-pressed={mode === 'custom'} onClick={() => setMode('custom')}>
          Anything
        </button>
        <button type="button" aria-pressed={mode === 'product'} onClick={() => setMode('product')}>
          From products
        </button>
      </div>
      <div className="form-row">
        {mode === 'custom' ? (
          <Field label="Item" error={error}>
            {(props) => <input {...props} value={name} placeholder="e.g. rain gauge" onChange={(e) => setName(e.target.value)} />}
          </Field>
        ) : (
          <Field label="Product" error={error} hint="Organic, kid- and pet-safe only.">
            {(props) => (
              <select {...props} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Choose…</option>
                {buyable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {productLabel(p)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Quantity">
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
      </div>
      {action.error ? <ErrorNotice message={action.error} /> : null}
      <div>
        <button type="submit" className="btn btn-quiet" aria-disabled={action.pending || undefined}>
          {action.pending ? 'Adding…' : 'Add to list'}
        </button>
      </div>
    </form>
  );
}
