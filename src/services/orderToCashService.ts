import { orderToCash, type OtcDateBasis, type OtcTrendDateBasis, type OrderToCashException, type OrderToCashKpis, type OrderToCashTrendPoint } from '../analytics/orderToCash';
import { getEffectiveFilterParams } from '../utils/filterUtils';
import type { GlobalFilterState } from '../types';

export interface OrderToCashControlData {
  kpis: OrderToCashKpis;
  trend: OrderToCashTrendPoint[];
  exceptions: OrderToCashException[];
  dateBasis: OtcDateBasis;
  trendDateBasis: OtcTrendDateBasis;
  lastFetchedAt: string;
}

const emptyKpis = (dateBasis: OtcDateBasis): OrderToCashKpis => ({
  dateBasis,
  orderedValue: 0,
  grossDeliveredValue: 0,
  returnedValue: 0,
  netDeliveredValue: 0,
  grossInvoicedValue: 0,
  creditNoteValue: 0,
  netInvoicedValue: 0,
  deliveryGapValue: 0,
  invoiceGapValue: 0,
  returnRatePct: 0,
  uncreditedReturnsCount: 0,
  uncreditedReturnsValue: 0,
  directLinkPct: 0,
  inferredLinkPct: 0,
  unmatchedLinkCount: 0,
});

function selectedSalespersonId(filters: GlobalFilterState): number | null {
  const candidates = [filters.salesRepId, filters.salespersonOptionKey];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = String(candidate).trim();
    if (/^\d+$/.test(value)) return Number(value);
    const idMatch = value.match(/(?:^|:)id:(\d+)(?:$|:)/i);
    if (idMatch) return Number(idMatch[1]);
  }
  return null;
}

export async function fetchOrderToCashControlData(
  filters: GlobalFilterState,
  options: { dateBasis?: OtcDateBasis; trendDateBasis?: OtcTrendDateBasis; exceptionType?: string | null } = {},
): Promise<OrderToCashControlData> {
  const effective = getEffectiveFilterParams(filters);
  const startDate = effective.effectiveStartDate;
  const endDate = effective.effectiveEndDate;

  if (!startDate || !endDate) throw new Error('A valid date range is required for Order-to-Cash analytics.');

  const dateBasis = options.dateBasis ?? 'order_cohort';
  const trendDateBasis = options.trendDateBasis ?? 'event';
  const base = {
    startDate,
    endDate,
    companyName: effective.companyName,
    salespersonId: selectedSalespersonId(filters),
    customerId: effective.customerId,
    productId: effective.productId,
    brand: null,
    category: filters.category && filters.category !== 'All' ? filters.category : null,
    governorateCode: effective.governorateCode,
    areaCode: effective.areaCode,
  };

  const [kpiRows, trend, exceptions] = await Promise.all([
    orderToCash.kpis({ ...base, dateBasis }),
    orderToCash.trend({ ...base, dateBasis: trendDateBasis, grain: 'day' }),
    orderToCash.exceptions({ ...base, exceptionType: options.exceptionType ?? null, limit: 100, offset: 0 }),
  ]);

  return {
    kpis: kpiRows[0] ?? emptyKpis(dateBasis),
    trend,
    exceptions,
    dateBasis,
    trendDateBasis,
    lastFetchedAt: new Date().toISOString(),
  };
}
