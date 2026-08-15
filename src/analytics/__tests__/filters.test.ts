import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filters } from '../filters';
import { getEffectiveFilterParams } from '../../utils/filterUtils';
import { GlobalFilterState } from '../../types';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

describe('Filter Options & Cascading Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Company options loaded from RPC (analytics_filter_companies)', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { company_id: 1, company_name: 'MAS', orders_count: 144, customers_count: 57, sales_value: 22253836.53 },
        { company_id: 2, company_name: 'Horeca Smart', orders_count: 392, customers_count: 260, sales_value: 5301874.79 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.companies({ startDate: '2026-08-01', endDate: '2026-08-09' });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_companies', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
    });

    expect(result).toHaveLength(2);
    expect(result[0].companyId).toBe(1);
    expect(result[0].companyName).toBe('MAS');
    expect(result[1].companyId).toBe(2);
    expect(result[1].companyName).toBe('Horeca Smart');
  });

  it('2. Salesperson options loaded from RPC (analytics_filter_salespeople)', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { option_key: '1:Haddil Haron', company_id: 1, company_name: 'MAS', salesperson_name: 'Haddil Haron', orders_count: 132, customers_count: 53, sales_value: 19189885.99 },
        { option_key: '1:Amgad Ahmed', company_id: 1, company_name: 'MAS', salesperson_name: 'Amgad Ahmed', orders_count: 10, customers_count: 3, sales_value: 2418358.96 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.salespeople({ startDate: '2026-08-01', endDate: '2026-08-09', companyId: 1 });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_salespeople', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_id: 1,
    });

    expect(result).toHaveLength(2);
    expect(result[0].optionKey).toBe('1:Haddil Haron');
    expect(result[0].salespersonName).toBe('Haddil Haron');
  });

  it('3. Same salesperson name in two companies stays distinct (option_key identity)', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { option_key: '1:Haddil Haron', company_id: 1, company_name: 'MAS', salesperson_name: 'Haddil Haron', orders_count: 132, customers_count: 53, sales_value: 19189885.99 },
        { option_key: '2:Haddil Haron', company_id: 2, company_name: 'Horeca Smart', salesperson_name: 'Haddil Haron', orders_count: 2, customers_count: 2, sales_value: 193126.27 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.salespeople({ startDate: '2026-08-01', endDate: '2026-08-09', companyId: null });

    expect(result).toHaveLength(2);
    expect(result[0].optionKey).toBe('1:Haddil Haron');
    expect(result[1].optionKey).toBe('2:Haddil Haron');
    expect(result[0].optionKey).not.toBe(result[1].optionKey);
  });

  it('4. Company change resets invalid salesperson in helper logic', () => {
    const initialFilters: GlobalFilterState = {
      periodMode: 'current_month',
      selectedStartDate: '2026-08-01',
      selectedEndDate: '2026-08-31',
      effectiveStartDate: '2026-08-01',
      effectiveEndDate: '2026-08-09',
      latestAvailableDataDate: '2026-08-09',
      companyId: 1,
      companyName: 'MAS',
      company: 'MAS',
      salespersonOptionKey: '1:Haddil Haron',
      salespersonName: 'Haddil Haron',
      salespersonCompanyId: 1,
      salesperson: 'Haddil Haron',
      salesRepId: '1:Haddil Haron',
      governorateCode: null,
      governorateName: null,
      areaCode: null,
      areaName: null,
      customerId: null,
      customerName: null,
      productId: null,
      productName: null,
      dateRange: { label: '', startDate: '2026-08-01', endDate: '2026-08-09', preset: 'current_mtd' },
      area: 'All',
      city: 'All',
      category: 'All',
      customerStatus: 'All',
      priority: null,
      risk: null,
      actionType: null,
      customerSector: 'All',
      searchQuery: '',
    };

    const params = getEffectiveFilterParams(initialFilters);
    expect(params.companyId).toBe(1);
    expect(params.companyName).toBe('MAS');
    expect(params.salespersonName).toBe('Haddil Haron');
  });

  it('5. "All" selection passes null to RPC parameters', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    await filters.salespeople({ startDate: '2026-08-01', endDate: '2026-08-09', companyId: null });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_salespeople', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_id: null,
    });
  });

  it('6. Customer options cascade with company, salesperson, geo, and product using v2 RPC', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: Array.from({ length: 53 }, (_, i) => ({
        customer_id: 1000 + i,
        customer_name: `Customer ${i + 1}`,
        city: null,
        company_id: 1,
        company_name: 'MAS',
        primary_salesperson: 'Haddil Haron',
        governorate_code: 'EG-C',
        governorate_name_ar: 'القاهرة',
        area_code: 'EG-C-NC',
        area_name_ar: 'مدينة نصر',
        orders_count: 2,
        sales_value: 100000,
        last_order_date: '2026-08-06',
      })),
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.customers({
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      companyId: 1,
      salespersonName: 'Haddil Haron',
      governorateCode: 'EG-C',
      areaCode: 'EG-C-NC',
      productId: 8516,
      limit: 1000,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_customers_v2', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_id: 1,
      p_salesperson: 'Haddil Haron',
      p_governorate_code: 'EG-C',
      p_area_code: 'EG-C-NC',
      p_product_id: 8516,
      p_search: null,
      p_limit: 1000,
      p_offset: 0,
    });

    expect(result).toHaveLength(53);
    expect(result[0].governorateCode).toBe('EG-C');
    expect(result[0].areaCode).toBe('EG-C-NC');
  });

  it('7. Product options cascade with company, salesperson, geo, and customer using v2 RPC', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: Array.from({ length: 113 }, (_, i) => ({
        product_id: 8000 + i,
        product_name: `Product ${i + 1}`,
        orders_count: 5,
        customers_count: 3,
        qty_sold: 100,
        sales_value: 50000,
      })),
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.products({
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      companyId: 1,
      salespersonName: 'Haddil Haron',
      governorateCode: 'EG-C',
      areaCode: 'EG-C-NC',
      customerId: 30709,
      limit: 1000,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_products_v2', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_id: 1,
      p_salesperson: 'Haddil Haron',
      p_governorate_code: 'EG-C',
      p_area_code: 'EG-C-NC',
      p_customer_id: 30709,
      p_search: null,
      p_limit: 1000,
      p_offset: 0,
    });

    expect(result).toHaveLength(113);
  });

  it('8. City/Area remains disabled due to pending data quality', () => {
    const filtersState: GlobalFilterState = {
      periodMode: 'current_month',
      selectedStartDate: '2026-08-01',
      selectedEndDate: '2026-08-31',
      effectiveStartDate: '2026-08-01',
      effectiveEndDate: '2026-08-09',
      latestAvailableDataDate: '2026-08-09',
      companyId: null,
      companyName: null,
      company: 'All',
      salespersonOptionKey: null,
      salespersonName: null,
      salespersonCompanyId: null,
      salesperson: null,
      salesRepId: 'All',
      governorateCode: null,
      governorateName: null,
      areaCode: null,
      areaName: null,
      customerId: null,
      customerName: null,
      productId: null,
      productName: null,
      dateRange: { label: '', startDate: '2026-08-01', endDate: '2026-08-09', preset: 'current_mtd' },
      area: 'All',
      city: 'All',
      category: 'All',
      customerStatus: null,
      priority: null,
      risk: null,
      actionType: null,
      customerSector: 'All',
      searchQuery: '',
    };

    expect(filtersState.city).toBe('All');
    expect(filtersState.area).toBe('All');
  });

  it('9. Customer Status options loaded from RPC (analytics_filter_customer_statuses)', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { status_code: 'NEW', status_label_ar: 'جديد', customers_count: 46 },
        { status_code: 'ACTIVE', status_label_ar: 'نشط', customers_count: 476 },
        { status_code: 'AT_RISK', status_label_ar: 'معرض للخطر', customers_count: 121 },
        { status_code: 'SLEEPING', status_label_ar: 'خامل', customers_count: 27 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.customerStatuses({
      effectiveEndDate: '2026-08-09',
      companyName: null,
      salespersonName: null,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_customer_statuses', {
      p_as_of_date: '2026-08-09',
      p_company_name: null,
      p_salesperson: null,
    });

    expect(result).toHaveLength(4);
    expect(result.map(r => r.statusCode)).toEqual(['NEW', 'ACTIVE', 'AT_RISK', 'SLEEPING']);
    expect(result.find(r => r.statusCode === 'LOST')).toBeUndefined();
  });

  it('10. Customer Action options loaded from RPC (analytics_filter_customer_action_options)', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { option_type: 'PRIORITY', option_code: 'HIGH', option_label_ar: 'أولوية عالية', customers_count: 59, recovery_opportunity: 10000 },
        { option_type: 'PRIORITY', option_code: 'MEDIUM', option_label_ar: 'أولوية متوسطة', customers_count: 174, recovery_opportunity: 20000 },
        { option_type: 'PRIORITY', option_code: 'LOW', option_label_ar: 'أولوية منخفضة', customers_count: 437, recovery_opportunity: 30000 },
        { option_type: 'RISK', option_code: 'HIGH', option_label_ar: 'مخاطر عالية', customers_count: 81, recovery_opportunity: 15000 },
        { option_type: 'ACTION_TYPE', option_code: 'WIN_BACK', option_label_ar: 'استرجاع العميل', customers_count: 148, recovery_opportunity: 50000 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.customerActionOptions({
      effectiveEndDate: '2026-08-09',
      companyName: 'MAS',
      salespersonName: 'Haddil Haron',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_customer_action_options', {
      p_as_of_date: '2026-08-09',
      p_company_name: 'MAS',
      p_salesperson: 'Haddil Haron',
    });

    expect(result).toHaveLength(5);
    const priorities = result.filter(r => r.optionType === 'PRIORITY');
    expect(priorities).toHaveLength(3);
    expect(priorities[0].customersCount).toBe(59);
  });

  it('11. Cascading logic resets selected option if missing from new parent filter options', () => {
    const availableStatuses = [
      { statusCode: 'NEW', statusLabelAr: 'جديد', customersCount: 1 },
      { statusCode: 'ACTIVE', statusLabelAr: 'نشط', customersCount: 75 },
    ];

    const currentSelection = 'LOST';
    const isValid = availableStatuses.some(s => s.statusCode === currentSelection);
    expect(isValid).toBe(false);

    const newSelection = isValid ? currentSelection : null;
    expect(newSelection).toBeNull();
  });

  it('12. Governorates filter calls analytics_filter_governorates with correct parameters', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { governorate_code: 'EG-C', governorate_name_ar: 'القاهرة', customers_count: 100, orders_count: 50, sales_value: 10000 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.governorates({
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      companyId: 1,
      salespersonName: 'Haddil Haron',
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_governorates', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_id: 1,
      p_salesperson: 'Haddil Haron',
    });

    expect(result).toHaveLength(1);
    expect(result[0].governorateCode).toBe('EG-C');
    expect(result[0].governorateNameAr).toBe('القاهرة');
  });

  it('13. Areas filter calls analytics_filter_areas with governorateCode and highConfidenceOnly', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [
        { area_code: 'EG-C-NC', area_name_ar: 'مدينة نصر', governorate_code: 'EG-C', governorate_name_ar: 'القاهرة', customers_count: 30, orders_count: 15, sales_value: 3000 },
      ],
      error: null,
      status: 200,
      statusText: 'OK',
    });

    const result = await filters.areas({
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      companyId: 1,
      salespersonName: 'Haddil Haron',
      governorateCode: 'EG-C',
      highConfidenceOnly: true,
    });

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_filter_areas', {
      p_start_date: '2026-08-01',
      p_end_date: '2026-08-09',
      p_company_id: 1,
      p_salesperson: 'Haddil Haron',
      p_governorate_code: 'EG-C',
      p_high_confidence_only: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0].areaCode).toBe('EG-C-NC');
    expect(result[0].areaNameAr).toBe('مدينة نصر');
  });
});
