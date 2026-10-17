'use client';

import { useState } from 'react';
import { AddItemForm } from '@/components/shopping/AddItemForm';
import { GeneratePanel } from '@/components/shopping/GeneratePanel';
import { ShoppingRow } from '@/components/shopping/ShoppingRow';
import { EmptyState, Loading, Meter, PageHead, Section } from '@/components/ui/Layout';
import { ErrorNotice } from '@/components/ui/Notice';
import { useResource } from '@/hooks/useResource';
import { api } from '@/lib/api-client';

export default function ShoppingPage() {
  const [focusId, setFocusId] = useState<number | null>(null);
  const list = useResource('shopping', () => api.shopping.list());
  const products = useResource('products', () => api.products.list());
  const items = list.data ?? [];
  const open = items.filter((item) => !item.purchased);
  const bought = items.filter((item) => item.purchased);

  return (
    <>
      <PageHead
        eyebrow="For the next trip"
        title="Shopping"
        lede="Suggestions come from upcoming tasks, sized to your lawn and minus what you already have. Only organic, kid- and pet-safe products are ever suggested."
      />

      <Section id="generate" title="From the schedule" note="Suggested rows are refreshed each run. Rows you added are never changed.">
        <GeneratePanel onGenerated={list.reload} />
      </Section>

      <Section id="list" title="To buy" note={items.length > 0 ? `${bought.length} of ${items.length} bought` : undefined}>
        {items.length > 0 ? (
          <Meter label="Bought" value={bought.length} max={items.length} valueText={`${bought.length} of ${items.length}`} />
        ) : null}
        {list.state.status === 'error' ? (
          <ErrorNotice message={list.state.message} onRetry={list.reload} />
        ) : !list.data ? (
          <Loading label="Loading shopping list" />
        ) : open.length === 0 ? (
          <EmptyState>Nothing to buy. Update the list from the schedule or add something below.</EmptyState>
        ) : (
          <ul className="rows">
            {open.map((item) => (
              <ShoppingRow key={item.id} item={item} onChanged={list.reload} autoFocus={focusId === item.id} onToggled={setFocusId} />
            ))}
          </ul>
        )}
        <AddItemForm products={products.data ?? []} onAdded={list.reload} />
      </Section>

      {bought.length > 0 ? (
        <Section id="bought" title="Bought" note="Ticking a product adds it to inventory, so the next suggestion counts it. Unticking takes it back out.">
          <ul className="rows">
            {bought.map((item) => (
              <ShoppingRow key={item.id} item={item} onChanged={list.reload} autoFocus={focusId === item.id} onToggled={setFocusId} />
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
