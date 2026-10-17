import type { Product } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { AppError, validationError } from '../http/errors';
import { findProduct, isEligible } from '../repositories/products';

/** Loads a referenced product or fails with a field-level validation error. */
export function requireProduct(db: Db, productId: number, field = 'product_id'): Product {
  const product = findProduct(db, productId);
  if (!product) throw validationError('Product not found', [{ field, message: `No product with id ${productId}` }]);
  return product;
}

/** Rejects linking or buying anything that is not organic AND kid/pet-safe. */
export function requireEligibleProduct(db: Db, productId: number, field = 'product_id'): Product {
  const product = requireProduct(db, productId, field);
  if (!isEligible(product)) {
    throw new AppError('unsafe_product', 422, `${product.name} is not marked organic and kid/pet-safe`, [
      { field, message: 'Only organic, kid- and pet-safe products can be scheduled or bought' },
    ]);
  }
  return product;
}
