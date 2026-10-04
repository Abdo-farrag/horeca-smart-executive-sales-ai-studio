import { callAnalyticsRpc } from './client';
import { toFiniteNumber } from './normalizers';
import { assertIsoDate } from './validation';

export type OtcDateBasis = 'order_cohort' | 'event';
export type OtcTrendDateBasis = 'event' | 'order' | 'delivery' | 'return' | 'invoice' | 'credit_note';

export interface OrderToCashFilters {
  startDate: string;
  endDate: string;
  companyName?: string | null;
  salespersonId?: number | null;
  customerId?: number | null;
  productId?: number | null;
  brand?: string | null;
  category?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
}

export interface OrderToCashKpis {
  dateBasis: string;
  orderedValue: number;
  grossDeliveredValue: number;
  returnedValue: number;
  netDeliveredValue: number;
  grossInvoicedValue: number;
  creditNoteValue: number;
  netInvoicedValue: number;
  deliveryGapValue: number;
  invoiceGapValue: number;
  returnRatePct: number;
  uncreditedReturnsCount: number;
  uncreditedReturnsValue: number;
  directLinkPct: number;
  inferredLinkPct: number;
  unmatchedLinkCount: number;
}

export interface OrderToCashTrendPoint {
  periodStart: string;
  dateBasis: string;
  orderedValue: number;
  grossDeliveredValue: number;
  returnedValue: number;
  netDeliveredValue: number;
  grossInvoicedValue: number;
  creditNoteValue: number;
  netInvoicedValue: number;
}

export interface OrderToCashException {
  exceptionType: string;
  companyId: number;
  customerId: number;
  salespersonId: number;
  productId: number;
  saleOrderLineId: number;
  sourceEventId: number;
  eventDate: string;
  qty: number;
  value: number;
  linkConfidence: string;
  details: string;
}

const baseRpcParams = (p: OrderToCashFilters) => ({
  p_start_date: p.startDate,
  p_end_date: p.endDate,
  p_company_name: p.companyName ?? null,
  p_salesperson_id: p.salespersonId ?? null,
  p_customer_id: p.customerId ?? null,
  p_product_id: p.productId ?? null,
  p_brand: p.brand ?? null,
  p_category: p.category ?? null,
  p_governorate_code: p.governorateCode ?? null,
  p_area_code: p.areaCode ?? null,
});

export const orderToCash = {
  async kpis(params: OrderToCashFilters & { dateBasis?: OtcDateBasis }): Promise<OrderToCashKpis[]> {
    assertIsoDate(params.startDate, 'startDate');
    assertIsoDate(params.endDate, 'endDate');
    return callAnalyticsRpc('analytics_order_to_cash_kpis_v1', { ...baseRpcParams(params), p_date_basis: params.dateBasis ?? 'order_cohort' }, (row) => ({
      dateBasis: String(row.date_basis ?? ''), orderedValue: toFiniteNumber(row.ordered_value ?? 0, 'ordered_value'), grossDeliveredValue: toFiniteNumber(row.gross_delivered_value ?? 0, 'gross_delivered_value'), returnedValue: toFiniteNumber(row.returned_value ?? 0, 'returned_value'), netDeliveredValue: toFiniteNumber(row.net_delivered_value ?? 0, 'net_delivered_value'), grossInvoicedValue: toFiniteNumber(row.gross_invoiced_value ?? 0, 'gross_invoiced_value'), creditNoteValue: toFiniteNumber(row.credit_note_value ?? 0, 'credit_note_value'), netInvoicedValue: toFiniteNumber(row.net_invoiced_value ?? 0, 'net_invoiced_value'), deliveryGapValue: toFiniteNumber(row.delivery_gap_value ?? 0, 'delivery_gap_value'), invoiceGapValue: toFiniteNumber(row.invoice_gap_value ?? 0, 'invoice_gap_value'), returnRatePct: toFiniteNumber(row.return_rate_pct ?? 0, 'return_rate_pct'), uncreditedReturnsCount: toFiniteNumber(row.uncredited_returns_count ?? 0, 'uncredited_returns_count'), uncreditedReturnsValue: toFiniteNumber(row.uncredited_returns_value ?? 0, 'uncredited_returns_value'), directLinkPct: toFiniteNumber(row.direct_link_pct ?? 0, 'direct_link_pct'), inferredLinkPct: toFiniteNumber(row.inferred_link_pct ?? 0, 'inferred_link_pct'), unmatchedLinkCount: toFiniteNumber(row.unmatched_link_count ?? 0, 'unmatched_link_count'),
    }));
  },
  async trend(params: OrderToCashFilters & { dateBasis?: OtcTrendDateBasis; grain?: 'day' | 'month' }): Promise<OrderToCashTrendPoint[]> {
    assertIsoDate(params.startDate, 'startDate'); assertIsoDate(params.endDate, 'endDate');
    return callAnalyticsRpc('analytics_order_to_cash_trend_v1', { ...baseRpcParams(params), p_date_basis: params.dateBasis ?? 'event', p_grain: params.grain ?? 'day' }, (row) => ({
      periodStart: String(row.period_start ?? ''), dateBasis: String(row.date_basis ?? ''), orderedValue: toFiniteNumber(row.ordered_value ?? 0, 'ordered_value'), grossDeliveredValue: toFiniteNumber(row.gross_delivered_value ?? 0, 'gross_delivered_value'), returnedValue: toFiniteNumber(row.returned_value ?? 0, 'returned_value'), netDeliveredValue: toFiniteNumber(row.net_delivered_value ?? 0, 'net_delivered_value'), grossInvoicedValue: toFiniteNumber(row.gross_invoiced_value ?? 0, 'gross_invoiced_value'), creditNoteValue: toFiniteNumber(row.credit_note_value ?? 0, 'credit_note_value'), netInvoicedValue: toFiniteNumber(row.net_invoiced_value ?? 0, 'net_invoiced_value'),
    }));
  },
  async exceptions(params: OrderToCashFilters & { exceptionType?: string | null; limit?: number; offset?: number }): Promise<OrderToCashException[]> {
    assertIsoDate(params.endDate, 'endDate');
    return callAnalyticsRpc('analytics_returns_exception_queue_v1', { p_as_of_date: params.endDate, p_company_name: params.companyName ?? null, p_salesperson_id: params.salespersonId ?? null, p_customer_id: params.customerId ?? null, p_product_id: params.productId ?? null, p_exception_type: params.exceptionType ?? null, p_limit: params.limit ?? 100, p_offset: params.offset ?? 0 }, (row) => ({
      exceptionType: String(row.exception_type ?? ''), companyId: toFiniteNumber(row.company_id ?? 0, 'company_id'), customerId: toFiniteNumber(row.customer_id ?? 0, 'customer_id'), salespersonId: toFiniteNumber(row.salesperson_id ?? 0, 'salesperson_id'), productId: toFiniteNumber(row.product_id ?? 0, 'product_id'), saleOrderLineId: toFiniteNumber(row.sale_order_line_id ?? 0, 'sale_order_line_id'), sourceEventId: toFiniteNumber(row.source_event_id ?? 0, 'source_event_id'), eventDate: String(row.event_date ?? ''), qty: toFiniteNumber(row.qty ?? 0, 'qty'), value: toFiniteNumber(row.value ?? 0, 'value'), linkConfidence: String(row.link_confidence ?? ''), details: String(row.details ?? ''),
    }));
  },
};
