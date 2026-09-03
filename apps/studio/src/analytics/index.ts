import { sales } from './sales';
import { customers as baseCustomers } from './customers';
import { customerOperational } from './customerOperational';
import { salesReps } from './salesReps';
import { products } from './products';
import { productCategories } from './productCategories';
import { catalog } from './catalog';
import { metrics } from './metrics';
import { filters } from './filters';

const customers = {
  ...baseCustomers,
  ...customerOperational,
};

export const analytics = {
  sales,
  customers,
  salesReps,
  products,
  productCategories,
  catalog,
  metrics,
  filters,
};

export * from './types';
export * from './errors';
export * from './validation';
export * from './normalizers';
export * from './client';
export * from './sales';
export * from './customers';
export * from './customerOperational';
export * from './salesReps';
export * from './products';
export * from './productCategories';
export * from './catalog';
export * from './metrics';
export * from './filters';
