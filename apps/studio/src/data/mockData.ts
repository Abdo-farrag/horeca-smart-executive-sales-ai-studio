import {
  Customer,
  SalesRep,
  Product,
  CategoryPerformance,
  AreaTerritory,
  LostCustomerRecord,
  OrderRecord,
  KpiMetric
} from '../types';

export const INITIAL_KPIS: KpiMetric[] = [];
export const SALES_REPS: SalesRep[] = [];
export const CUSTOMERS: Customer[] = [];
export const PRODUCTS: Product[] = [];
export const CATEGORIES: CategoryPerformance[] = [];
export const AREAS: AreaTerritory[] = [];
export const LOST_CUSTOMERS: LostCustomerRecord[] = [];
export const RECENT_ORDERS: OrderRecord[] = [];
export const MONTHLY_REVENUE_TREND: { month: string; revenue: number; target: number }[] = [];
