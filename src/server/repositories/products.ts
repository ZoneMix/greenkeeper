import type { ProductCreateInput, ProductListQuery } from '@/lib/domain/schemas';
import type { Product, ProductCategory, ToolType } from '@/lib/domain/types';
import type { Db } from '../db/types';

export interface ProductRow {
  readonly id: number;
  readonly name: string;
  readonly brand: string;
  readonly category: ProductCategory;
  readonly coverage_sqft: number | null;
  readonly kid_safe: number;
  readonly organic: number;
  readonly notes: string | null;
  readonly url: string | null;
  readonly tool_type: ToolType | null;
}

/** Column list for joins: every product column aliased with a `p_` prefix. */
export const PRODUCT_JOIN_COLUMNS = `
  p.id AS p_id, p.name AS p_name, p.brand AS p_brand, p.category AS p_category,
  p.coverage_sqft AS p_coverage_sqft, p.kid_safe AS p_kid_safe, p.organic AS p_organic,
  p.notes AS p_notes, p.url AS p_url, p.tool_type AS p_tool_type`;

export interface PrefixedProductColumns {
  readonly p_id: number | null;
  readonly p_name: string | null;
  readonly p_brand: string | null;
  readonly p_category: ProductCategory | null;
  readonly p_coverage_sqft: number | null;
  readonly p_kid_safe: number | null;
  readonly p_organic: number | null;
  readonly p_notes: string | null;
  readonly p_url: string | null;
  readonly p_tool_type: ToolType | null;
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    coverage_sqft: row.coverage_sqft,
    kid_safe: row.kid_safe === 1,
    organic: row.organic === 1,
    notes: row.notes,
    url: row.url,
    tool_type: row.tool_type ?? null,
  };
}

export function mapPrefixedProduct(row: PrefixedProductColumns): Product | null {
  if (row.p_id === null) return null;
  return mapProduct({
    id: row.p_id,
    name: row.p_name ?? '',
    brand: row.p_brand ?? '',
    category: row.p_category ?? 'other',
    coverage_sqft: row.p_coverage_sqft,
    kid_safe: row.p_kid_safe ?? 0,
    organic: row.p_organic ?? 0,
    notes: row.p_notes,
    url: row.p_url,
    tool_type: row.p_tool_type,
  });
}

/** The project rule: anything recommended must be organic AND kid/pet-safe. */
export function isEligible(product: Pick<Product, 'organic' | 'kid_safe'>): boolean {
  return product.organic && product.kid_safe;
}

export function listProducts(db: Db, query: ProductListQuery = {}): ReadonlyArray<Product> {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (query.category) {
    conditions.push('category = @category');
    params.category = query.category;
  }
  if (query.search) {
    conditions.push("(name LIKE @search ESCAPE '\\' OR brand LIKE @search ESCAPE '\\')");
    params.search = `%${query.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM products ${where} ORDER BY name ASC`).all(params) as ReadonlyArray<ProductRow>;
  return rows.map(mapProduct);
}

export function findProduct(db: Db, id: number): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  return row ? mapProduct(row) : null;
}

export function findProductByName(db: Db, name: string): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE name = ? ORDER BY id LIMIT 1').get(name) as ProductRow | undefined;
  return row ? mapProduct(row) : null;
}

export function insertProduct(db: Db, input: ProductCreateInput): Product {
  const result = db
    .prepare(
      `INSERT INTO products (name, brand, category, coverage_sqft, kid_safe, organic, notes, url, tool_type)
       VALUES (@name, @brand, @category, @coverage_sqft, @kid_safe, @organic, @notes, @url, @tool_type)`,
    )
    .run({
      name: input.name,
      brand: input.brand,
      category: input.category,
      coverage_sqft: input.coverage_sqft,
      kid_safe: input.kid_safe ? 1 : 0,
      organic: input.organic ? 1 : 0,
      notes: input.notes,
      url: input.url,
      tool_type: input.category === 'tool' ? input.tool_type : null,
    });
  const created = findProduct(db, Number(result.lastInsertRowid));
  if (!created) throw new Error('Product insert did not persist');
  return created;
}

/** Products referenced by tasks, inventory or the shopping list that break the safety rule. */
export function listUnsafeProductsInUse(db: Db): ReadonlyArray<Product> {
  const rows = db
    .prepare(
      `SELECT * FROM products p
       WHERE (p.organic = 0 OR p.kid_safe = 0)
         AND (EXISTS (SELECT 1 FROM schedule_tasks t WHERE t.product_id = p.id AND t.status = 'pending')
           OR EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.quantity > 0)
           OR EXISTS (SELECT 1 FROM shopping_list s WHERE s.product_id = p.id AND s.purchased = 0))
       ORDER BY p.name`,
    )
    .all() as ReadonlyArray<ProductRow>;
  return rows.map(mapProduct);
}
