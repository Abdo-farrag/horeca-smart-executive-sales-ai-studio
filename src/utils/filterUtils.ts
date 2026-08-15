import { GlobalFilterState } from '../types';

export interface EffectiveFilterParams {
  companyId: number | null;
  companyName: string | null;
  salespersonName: string | null;
  salespersonOptionKey: string | null;
  salespersonCompanyId: number | null;
  governorateCode: string | null;
  governorateName: string | null;
  areaCode: string | null;
  areaName: string | null;
  customerId: number | null;
  customerName: string | null;
  productId: number | null;
  productName: string | null;
  effectiveStartDate: string;
  effectiveEndDate: string;
}

export function getEffectiveFilterParams(filters: GlobalFilterState): EffectiveFilterParams {
  const effectiveStartDate = filters.effectiveStartDate || filters.dateRange?.startDate || '2026-08-01';
  const effectiveEndDate = filters.effectiveEndDate || filters.dateRange?.endDate || '2026-08-09';

  let companyName: string | null = filters.companyName ?? null;
  if (!companyName && filters.company && (filters.company as string) !== 'All') {
    companyName = filters.company;
  }

  let salespersonName: string | null = filters.salespersonName ?? null;
  if (!salespersonName && filters.salesperson) {
    salespersonName = filters.salesperson;
  }
  if (!salespersonName && filters.salesRepId && filters.salesRepId !== 'All') {
    if (filters.salesRepId.includes(':')) {
      salespersonName = filters.salesRepId.split(':')[1] || null;
    } else {
      salespersonName = filters.salesRepId;
    }
  }

  let salespersonCompanyId: number | null = filters.salespersonCompanyId ?? null;
  if (salespersonCompanyId === null && filters.salespersonOptionKey && filters.salespersonOptionKey.includes(':')) {
    const parts = filters.salespersonOptionKey.split(':');
    salespersonCompanyId = Number(parts[0]) || null;
  } else if (salespersonCompanyId === null && filters.salesRepId && filters.salesRepId.includes(':')) {
    const parts = filters.salesRepId.split(':');
    salespersonCompanyId = Number(parts[0]) || null;
  }

  let companyId: number | null = filters.companyId ?? null;
  if (companyId === null) {
    if (companyName === 'MAS') companyId = 1;
    else if (companyName === 'Horeca Smart') companyId = 2;
    else if (salespersonCompanyId !== null) companyId = salespersonCompanyId;
  }

  // If companyName wasn't set, but companyId / salespersonCompanyId is set, derive companyName
  if (!companyName) {
    if (companyId === 1) companyName = 'MAS';
    else if (companyId === 2) companyName = 'Horeca Smart';
  }

  return {
    companyId,
    companyName,
    salespersonName,
    salespersonOptionKey: filters.salespersonOptionKey || (filters.salesRepId !== 'All' ? filters.salesRepId : null),
    salespersonCompanyId,
    governorateCode: filters.governorateCode ?? null,
    governorateName: filters.governorateName ?? null,
    areaCode: filters.areaCode ?? null,
    areaName: filters.areaName ?? null,
    customerId: filters.customerId ?? null,
    customerName: filters.customerName ?? null,
    productId: filters.productId ?? null,
    productName: filters.productName ?? null,
    effectiveStartDate,
    effectiveEndDate,
  };
}
