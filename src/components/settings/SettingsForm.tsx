'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useAction } from '@/hooks/useAction';
import { announce } from '@/lib/announce';
import { api } from '@/lib/api-client';
import { USDA_ZONES } from '@/lib/domain/constants';
import { MOWER_BRANDS, MOWER_MODELS, SPREADER_MODELS } from '@/lib/domain/equipment';
import { settingsUpdateSchema } from '@/lib/domain/schemas';
import type { LawnSettings } from '@/lib/domain/types';
import { Field } from '../ui/Field';
import { ErrorNotice, Notice } from '../ui/Notice';
import { Section } from '../ui/Layout';
import { DeckChart } from './DeckChart';

type Draft = Omit<LawnSettings, 'id' | 'created_at' | 'updated_at'>;
type NumericKey = 'total_sqft' | 'front_sqft' | 'back_sqft' | 'shade_percentage' | 'latitude' | 'longitude';

function toDraft(settings: LawnSettings): Draft {
  const { id: _id, created_at: _created, updated_at: _updated, ...draft } = settings;
  return draft;
}

export function SettingsForm({ settings, onSaved }: { readonly settings: LawnSettings; readonly onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };
  const setNumber = (key: NumericKey, raw: string) => set(key, raw === '' ? Number.NaN : Number(raw));
  const models = draft.mower_brand ? (MOWER_MODELS[draft.mower_brand] ?? []) : [];
  const zoneSum = draft.front_sqft + draft.back_sqft;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (action.pending) return;
    const parsed = settingsUpdateSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      // After the errors render, move focus to the first invalid field.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    const ok = await action.run(() => api.settings.update(parsed.data), () => {
      announce('Settings saved');
      onSaved();
    });
    setSaved(ok);
  }

  const num = (key: NumericKey) => (Number.isNaN(draft[key]) ? '' : String(draft[key]));

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <Section id="lawn" title="Lawn" note="Areas size every product amount on the shopping list.">
        <div className="form-row">
          <Field label="Whole lawn (sq ft)" error={errors.total_sqft}>
            {(p) => <input {...p} type="number" inputMode="numeric" min={100} value={num('total_sqft')} onChange={(e) => setNumber('total_sqft', e.target.value)} />}
          </Field>
          <Field label="Front yard (sq ft)" error={errors.front_sqft}>
            {(p) => <input {...p} type="number" inputMode="numeric" min={0} value={num('front_sqft')} onChange={(e) => setNumber('front_sqft', e.target.value)} />}
          </Field>
          <Field label="Back yard (sq ft)" error={errors.back_sqft}>
            {(p) => <input {...p} type="number" inputMode="numeric" min={0} value={num('back_sqft')} onChange={(e) => setNumber('back_sqft', e.target.value)} />}
          </Field>
        </div>
        {Number.isFinite(zoneSum) && zoneSum !== draft.total_sqft ? (
          <Notice tone="attention">
            <p>
              Front plus back is {zoneSum.toLocaleString('en-US')} sq ft but the whole lawn is {draft.total_sqft.toLocaleString('en-US')} sq ft.
              Whole-lawn tasks use the whole-lawn number.
            </p>
          </Notice>
        ) : null}
        <Field label={`Shade: ${draft.shade_percentage}% (0 = full sun, 100 = full shade)`} error={errors.shade_percentage}>
          {(p) => <input {...p} type="range" min={0} max={100} step={5} value={draft.shade_percentage} onChange={(e) => setNumber('shade_percentage', e.target.value)} />}
        </Field>
      </Section>

      <Section id="equipment" title="Equipment" note="Mower deck positions show up on mowing tasks.">
        <div className="form-row">
          <Field label="Mower brand">
            {(p) => (
              <select
                {...p}
                value={draft.mower_brand ?? ''}
                onChange={(e) => {
                  set('mower_brand', e.target.value || null);
                  set('mower_model', null);
                }}
              >
                <option value="">None</option>
                {MOWER_BRANDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {models.length > 0 ? (
            <Field label="Mower model">
              {(p) => (
                <select {...p} value={draft.mower_model ?? ''} onChange={(e) => set('mower_model', e.target.value || null)}>
                  <option value="">Choose…</option>
                  {models.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          ) : null}
          <Field label="Spreader">
            {(p) => (
              <select {...p} value={draft.spreader_model ?? ''} onChange={(e) => set('spreader_model', e.target.value || null)}>
                <option value="">None</option>
                {SPREADER_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <DeckChart mowerModel={draft.mower_model} />
      </Section>

      <Section id="location" title="Location" note="Coordinates drive the Open-Meteo forecast. No API key is needed.">
        <div className="form-row">
          <Field label="City" error={errors.city}>
            {(p) => <input {...p} value={draft.city} onChange={(e) => set('city', e.target.value)} />}
          </Field>
          <Field label="State" error={errors.state}>
            {(p) => <input {...p} maxLength={2} value={draft.state} onChange={(e) => set('state', e.target.value.toUpperCase())} />}
          </Field>
          <Field label="USDA zone">
            {(p) => (
              <select {...p} value={draft.usda_zone} onChange={(e) => set('usda_zone', e.target.value)}>
                {USDA_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="form-row">
          <Field label="Latitude" error={errors.latitude}>
            {(p) => <input {...p} type="number" inputMode="decimal" step="0.0001" value={num('latitude')} onChange={(e) => setNumber('latitude', e.target.value)} />}
          </Field>
          <Field label="Longitude" error={errors.longitude}>
            {(p) => <input {...p} type="number" inputMode="decimal" step="0.0001" value={num('longitude')} onChange={(e) => setNumber('longitude', e.target.value)} />}
          </Field>
        </div>
        {action.error ? <ErrorNotice message={action.error} /> : null}
        {saved ? (
          <Notice tone="good">
            <p>Settings saved.</p>
          </Notice>
        ) : null}
        <div>
          <button type="submit" className="btn btn-primary" aria-disabled={action.pending || undefined}>
            {action.pending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </Section>
    </form>
  );
}
