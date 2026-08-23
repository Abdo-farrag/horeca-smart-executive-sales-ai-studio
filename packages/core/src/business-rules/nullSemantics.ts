/**
 * Core business rules for null semantics across Horeca Smart analytics and queries.
 */

export function isEnterpriseScope(companyName: string | null | undefined): boolean {
  return !companyName || companyName === 'All' || companyName.trim() === '';
}

export function normalizeCompanyName(companyName: string | null | undefined): string | null {
  if (isEnterpriseScope(companyName)) return null;
  return companyName!.trim();
}

export function normalizeSalesperson(salesperson: string | null | undefined): string | null {
  if (!salesperson || salesperson === 'All' || salesperson.trim() === '') return null;
  return salesperson.trim();
}

export function normalizeFilterParam<T extends string>(val: T | null | undefined): T | null {
  if (!val || val === 'All' || (typeof val === 'string' && val.trim() === '')) return null;
  return (typeof val === 'string' ? val.trim() : val) as T;
}

export function coalesceNumeric(val: number | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || Number.isNaN(val)) return fallback;
  return val;
}
