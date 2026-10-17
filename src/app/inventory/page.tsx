'use client';

import { useState } from 'react';
import { InventoryForm } from '@/components/inventory/InventoryForm';
import { InventoryRow } from '@/components/inventory/InventoryRow';
import { ProductForm } from '@/components/inventory/ProductForm';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Loading, PageHead, Section } from '@/components/ui/Layout';
import { ErrorNotice } from '@/components/ui/Notice';
import { useResource } from '@/hooks/useResource';
import { api } from '@/lib/api-client';
import { PRODUCT_CATEGORY_LABELS, TOOL_TYPE_LABELS } from '@/lib/domain/constants';
import { useToday } from '@/hooks/useToday';
import type { InventoryItem } from '@/lib/domain/types';

interface Group {
  readonly key: string;
  readonly label: string;
  readonly items: ReadonlyArray<InventoryItem>;
}

function groupBy<K extends string>(
  items: ReadonlyArray<InventoryItem>,
  keyOf: (item: InventoryItem) => K,
  labels: Readonly<Record<K, string>>,
): ReadonlyArray<Group> {
  const keys = [...new Set(items.map(keyOf))];
  return keys
    .map((key) => ({ key, label: labels[key], items: items.filter((item) => keyOf(item) === key) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function GroupedRows({ groups, onChanged }: { readonly groups: ReadonlyArray<Group>; readonly onChanged: () => void }) {
  return (
    <div>
      {groups.map((group) => (
        <div key={group.key}>
          <h3 className="group-title">
            <span className="h3">{group.label}</span>
            <span className="meta">{group.items.length}</span>
          </h3>
          <ul className="rows">
            {group.items.map((item) => (
              <InventoryRow key={item.id} item={item} onChanged={onChanged} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const today = useToday() ?? '';
  const [dialog, setDialog] = useState<'item' | 'product' | null>(null);
  const inventory = useResource('inventory', () => api.inventory.list());
  const products = useResource('products', () => api.products.list());
  const items = inventory.data ?? [];
  const supplies = items.filter((item) => item.product.category !== 'tool');
  const equipment = items.filter((item) => item.product.category === 'tool');

  const supplyGroups = groupBy(supplies, (i) => i.product.category, PRODUCT_CATEGORY_LABELS);
  const toolGroups = groupBy(equipment, (i) => i.product.tool_type ?? 'other', TOOL_TYPE_LABELS);

  return (
    <>
      <PageHead
        eyebrow="On the shelf"
        title="Inventory"
        lede="What is on the shelf. The shopping generator subtracts these before suggesting anything."
        actions={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setDialog('product')}>
              New product
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setDialog('item')}>
              <Icon name="plus" size="sm" />
              Add item
            </button>
          </>
        }
      />

      {inventory.state.status === 'error' ? (
        <div className="sect">
          <div />
          <ErrorNotice message={inventory.state.message} onRetry={inventory.reload} />
        </div>
      ) : !inventory.data ? (
        <div className="sect">
          <div />
          <Loading label="Loading inventory" />
        </div>
      ) : (
        <>
          <Section id="supplies" title="Supplies" note={`${supplies.length} on hand. Bags, bottles and each count toward shopping; lb and oz are kept as notes.`}>
            {supplyGroups.length > 0 ? (
              <GroupedRows groups={supplyGroups} onChanged={inventory.reload} />
            ) : (
              <EmptyState action={<button type="button" className="btn btn-quiet btn-small" onClick={() => setDialog('item')}>Add item</button>}>
                No supplies yet.
              </EmptyState>
            )}
          </Section>
          <Section id="equipment" title="Equipment" note={`${equipment.length} tools.`}>
            {toolGroups.length > 0 ? <GroupedRows groups={toolGroups} onChanged={inventory.reload} /> : <EmptyState>No equipment recorded.</EmptyState>}
          </Section>
        </>
      )}

      <Dialog open={dialog === 'item'} title="Add to inventory" onClose={() => setDialog(null)}>
        <InventoryForm
          products={products.data ?? []}
          today={today}
          onCancel={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            inventory.reload();
          }}
        />
      </Dialog>
      <Dialog open={dialog === 'product'} title="New product" onClose={() => setDialog(null)}>
        <ProductForm
          onCancel={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            products.reload();
          }}
        />
      </Dialog>
    </>
  );
}
