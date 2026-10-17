'use client';

import { useState, type FormEvent } from 'react';
import { useAction } from '@/hooks/useAction';
import { api } from '@/lib/api-client';
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, TOOL_TYPES, TOOL_TYPE_LABELS } from '@/lib/domain/constants';
import { productCreateSchema } from '@/lib/domain/schemas';
import type { ProductCategory, ToolType } from '@/lib/domain/types';
import { Field } from '../ui/Field';
import { ErrorNotice } from '../ui/Notice';

interface ProductFormProps {
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

/** Adds a catalog product. The safety confirmation is required, matching the API rule. */
export function ProductForm({ onSaved, onCancel }: ProductFormProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('fertilizer');
  const [toolType, setToolType] = useState<ToolType>('hand-tool');
  const [coverage, setCoverage] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (action.pending) return;
    if (!confirmed) {
      setErrors({ safety: 'Confirm the product is organic and kid/pet-safe' });
      return;
    }
    const parsed = productCreateSchema.safeParse({
      name,
      brand,
      category,
      coverage_sqft: coverage.trim() ? Number(coverage) : null,
      url: url.trim() || null,
      notes: notes.trim() || null,
      tool_type: category === 'tool' ? toolType : null,
      organic: true,
      kid_safe: true,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    await action.run(() => api.products.create(parsed.data), onSaved);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form-row">
        <Field label="Name" error={errors.name}>
          {(props) => <input {...props} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
        </Field>
        <Field label="Brand" error={errors.brand}>
          {(props) => <input {...props} value={brand} onChange={(e) => setBrand(e.target.value)} />}
        </Field>
      </div>
      <div className="form-row">
        <Field label="Category">
          {(props) => (
            <select {...props} value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </Field>
        {category === 'tool' ? (
          <Field label="Tool type">
            {(props) => (
              <select {...props} value={toolType} onChange={(e) => setToolType(e.target.value as ToolType)}>
                {TOOL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TOOL_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : (
          <Field label="Coverage per bag (sq ft)" error={errors.coverage_sqft} hint="From the label; drives shopping amounts.">
            {(props) => <input {...props} type="number" inputMode="numeric" min={1} value={coverage} onChange={(e) => setCoverage(e.target.value)} />}
          </Field>
        )}
      </div>
      <Field label="Website" error={errors.url}>
        {(props) => <input {...props} type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />}
      </Field>
      <Field label="Notes" hint="Application rate, safety notes.">
        {(props) => <input {...props} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      <label className="check">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-describedby="safety-error" />
        This product is organic and safe for kids and pets (no re-entry period over 2 hours).
      </label>
      {errors.safety ? (
        <p id="safety-error" className="field-error">
          {errors.safety}
        </p>
      ) : null}
      {action.error ? <ErrorNotice message={action.error} /> : null}
      <div className="sheet-foot">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" aria-disabled={action.pending || undefined}>
          {action.pending ? 'Saving…' : 'Add product'}
        </button>
      </div>
    </form>
  );
}
