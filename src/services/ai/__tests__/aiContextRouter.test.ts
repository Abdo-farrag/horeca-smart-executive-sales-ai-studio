import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analytics } from '../../../analytics';
import { GlobalFilterState } from '../../../types';
import {
  buildAiContextForQuery,
  mapCustomerSummaryToSafeDTO,
  mapCustomerOrderToSafeDTO,
  mapCustomerDropoffToSafeDTO,
  mapFavoriteProductToSafeDTO,
  mapRetentionDetailToSafeDTO,
  mapActionCenterToSafeDTO,
  mapProductSummaryToSafeDTO,
  mapProductCustomerToSafeDTO,
  mapCrossSellCandidateToSafeDTO,
} from '../aiContextRouter';

const baseFilters: GlobalFilterState = {
  periodMode: 'current_month',
  selectedStartDate: '2026-08-01',
  selectedEndDate: '2026-08-09',
  effectiveStartDate: '2026-08-01',
  effectiveEndDate: '2026-08-09',
  latestAvailableDataDate: '2026-08-09',
  companyId: null,
  companyName: 'MAS',
  company: 'MAS',
  salespersonOptionKey: null,
  salespersonName: null,
  salespersonCompanyId: null,
  salesperson: null,
  salesRepId: '',
  governorateCode: null,
  governorateName: null,
  areaCode: null,
  areaName: null,
  customerId: null,
  customerName: null,
  productId: null,
  productName: null,
  dateRange: {
    label: 'August 2026 MTD',
    startDate: '2026-08-01',
    endDate: '2026-08-09',
    preset: 'current_mtd',
  },
  area: '',
  city: '',
  category: '',
  customerStatus: null,
  priority: null,
  risk: null,
  actionType: null,
  customerSector: '',
  searchQuery: '',
};

describe('aiContextRouter - Safe Context Routing & DTO Mappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // A. PROHIBITED_DATA_REQUEST -> zero SDK calls
  // --------------------------------------------------------------------------
  it('A. PROHIBITED_DATA_REQUEST -> zero SDK calls and deterministic refusal', async () => {
    const summarySpy = vi.spyOn(analytics.customers, 'summary');
    const ordersSpy = vi.spyOn(analytics.customers, 'customerOrdersV2');
    const salesExecSpy = vi.spyOn(analytics.sales, 'executive');

    const res = await buildAiContextForQuery({
      message: 'اديني رقم تليفون العميل وعنوانه',
      filters: { ...baseFilters, customerId: 30709 },
    });

    expect(res.status).toBe('PROHIBITED_DATA_DETECTED');
    expect(res.intent).toBe('PROHIBITED_DATA_REQUEST');
    expect(res.userMessage).toContain('بيانات التواصل الشخصية والمعلومات البنكية');
    expect(summarySpy).not.toHaveBeenCalled();
    expect(ordersSpy).not.toHaveBeenCalled();
    expect(salesExecSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // B. PAYMENT_STATUS -> zero SDK calls
  // --------------------------------------------------------------------------
  it('B. PAYMENT_STATUS -> zero SDK calls and UNKNOWN status', async () => {
    const summarySpy = vi.spyOn(analytics.customers, 'summary');
    const ordersSpy = vi.spyOn(analytics.customers, 'customerOrdersV2');
    const salesExecSpy = vi.spyOn(analytics.sales, 'executive');

    const res = await buildAiContextForQuery({
      message: 'ما هي حالة السداد وموقف التحصيلات للعميل؟',
      filters: { ...baseFilters, customerId: 30709 },
    });

    expect(res.status).toBe('PAYMENT_STATUS_UNKNOWN');
    expect(res.intent).toBe('PAYMENT_STATUS');
    expect(res.drillDownContext?.paymentStatusSummary?.hasReliablePaymentLedger).toBe(false);
    expect(res.drillDownContext?.paymentStatusSummary?.statusNote).toBeDefined();
    expect(summarySpy).not.toHaveBeenCalled();
    expect(ordersSpy).not.toHaveBeenCalled();
    expect(salesExecSpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // C. CUSTOMER_ANALYSIS -> customer summary only
  // --------------------------------------------------------------------------
  it('C. CUSTOMER_ANALYSIS -> customer summary only', async () => {
    const summarySpy = vi.spyOn(analytics.customers, 'summary').mockResolvedValueOnce([
      {
        customerId: 30709,
        customerName: 'فندق ماريوت',
        companyName: 'MAS',
        primarySalesperson: 'أحمد علي',
        ordersCount: 5,
        salesValue: 125000,
        averageOrderValue: 25000,
        firstOrderDate: '2026-06-01',
        lastOrderDate: '2026-08-08',
        daysSinceLastOrder: 1,
        customerStatus: 'ACTIVE',
        previousPeriodSales: 100000,
        salesChangePct: 25,
      },
    ]);
    const ordersSpy = vi.spyOn(analytics.customers, 'customerOrdersV2');
    const dropoffSpy = vi.spyOn(analytics.customers, 'customerProductDropoffV2');

    const res = await buildAiContextForQuery({
      message: 'حلل أداء العميل بالتفصيل',
      filters: { ...baseFilters, customerId: 30709 },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('CUSTOMER_ANALYSIS');
    expect(res.contextMode).toBe('DRILL_DOWN');
    expect(summarySpy).toHaveBeenCalledTimes(1);
    expect(ordersSpy).not.toHaveBeenCalled();
    expect(dropoffSpy).not.toHaveBeenCalled();
    expect(res.drillDownContext?.targetCustomer).toBeDefined();
    expect(res.drillDownContext?.targetCustomer?.customerId).toBe(30709);
    expect(res.drillDownContext?.targetCustomer?.totalSales).toBe(125000);
  });

  // --------------------------------------------------------------------------
  // D. CUSTOMER_RECENT_ORDERS -> customerOrdersV2 only
  // --------------------------------------------------------------------------
  it('D. CUSTOMER_RECENT_ORDERS -> customerOrdersV2 only', async () => {
    const ordersSpy = vi.spyOn(analytics.customers, 'customerOrdersV2').mockResolvedValueOnce([
      {
        orderId: 991,
        orderName: 'SO-991',
        orderDate: '2026-08-08',
        companyName: 'MAS',
        salesperson: 'أحمد علي',
        governorateName: 'القاهرة',
        areaName: 'مدينة نصر',
        orderValue: 45000,
        linesCount: 4,
        productsCount: 4,
        totalQty: 120,
        orderStatus: 'CONFIRMED',
      },
    ]);
    const summarySpy = vi.spyOn(analytics.customers, 'summary');

    const res = await buildAiContextForQuery({
      message: 'ما هي آخر أوردرات العميل؟',
      filters: { ...baseFilters, customerId: 30709 },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('CUSTOMER_RECENT_ORDERS');
    expect(ordersSpy).toHaveBeenCalledTimes(1);
    expect(summarySpy).not.toHaveBeenCalled();
    expect(res.drillDownContext?.recentOrders).toHaveLength(1);
    expect(res.drillDownContext?.recentOrders?.[0].orderId).toBe(991);
    expect(res.drillDownContext?.recentOrders?.[0].paymentStatus).toBe('UNKNOWN');
    expect(res.drillDownContext?.recentOrders?.[0].orderStatus).toBe('CONFIRMED');
  });

  // --------------------------------------------------------------------------
  // E. CUSTOMER_PRODUCT_HISTORY -> dropoffV2 + favoritesV2
  // --------------------------------------------------------------------------
  it('E. CUSTOMER_PRODUCT_HISTORY -> dropoffV2 + favoritesV2 only', async () => {
    const dropoffSpy = vi.spyOn(analytics.customers, 'customerProductDropoffV2').mockResolvedValueOnce([
      {
        productId: 8516,
        productName: 'حليب كامل الدسم 1 لتر',
        categoryName: 'Dairy',
        previousSales: 20000,
        currentSales: 0,
        previousQty: 200,
        currentQty: 0,
        salesChangePct: -100,
        status: 'STOPPED_BUYING',
        recoveryValue: 20000,
      },
    ]);
    const favoritesSpy = vi.spyOn(analytics.customers, 'customerFavoriteProductsV2').mockResolvedValueOnce([
      {
        productId: 9100,
        productName: 'زبدة طبيعي 1 كجم',
        salesValue: 50000,
        ordersCount: 4,
        quantity: 100,
        salesSharePct: 40,
        lastOrderDate: '2026-08-07',
      },
    ]);
    const ordersSpy = vi.spyOn(analytics.customers, 'customerOrdersV2');

    const res = await buildAiContextForQuery({
      message: 'ما هي المنتجات التي توقف العميل عن شرائها والمنتجات المفضلة لديه؟',
      filters: { ...baseFilters, customerId: 30709 },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('CUSTOMER_PRODUCT_HISTORY');
    expect(dropoffSpy).toHaveBeenCalledTimes(1);
    expect(favoritesSpy).toHaveBeenCalledTimes(1);
    expect(ordersSpy).not.toHaveBeenCalled();
    expect(res.drillDownContext?.customerProductHistory?.stoppedProducts).toHaveLength(1);
    expect(res.drillDownContext?.customerProductHistory?.favoriteProducts).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // F. LOST_CUSTOMERS -> retentionDetailsV2 with status LOST
  // --------------------------------------------------------------------------
  it('F. LOST_CUSTOMERS -> retentionDetailsV2 with status LOST only', async () => {
    const retentionSpy = vi.spyOn(analytics.customers, 'customerRetentionDetailsV2').mockResolvedValueOnce([
      {
        companyName: 'MAS',
        customerId: 40100,
        customerName: 'مطعم الأهرام',
        previousSalesperson: 'محمود سامي',
        currentSalesperson: '',
        previousOrders: 3,
        currentOrders: 0,
        previousSales: 75000,
        currentSales: 0,
        retentionStatus: 'LOST',
        salesChangePct: -100,
        previousLastOrderDate: '2026-07-28',
        currentLastOrderDate: null,
      },
    ]);
    const summarySpy = vi.spyOn(analytics.customers, 'summary');

    const res = await buildAiContextForQuery({
      message: 'من هم العملاء المفقودين هذا الشهر؟',
      filters: baseFilters,
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('LOST_CUSTOMERS');
    expect(retentionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'LOST',
      })
    );
    expect(summarySpy).not.toHaveBeenCalled();
    expect(res.drillDownContext?.lostCustomers).toHaveLength(1);
    expect(res.drillDownContext?.lostCustomers?.[0].retentionStatus).toBe('LOST');
  });

  // --------------------------------------------------------------------------
  // G. RISK -> actionCenterScopedV2
  // --------------------------------------------------------------------------
  it('G. RISK -> actionCenterScopedV2 only', async () => {
    const actionSpy = vi.spyOn(analytics.customers, 'customerActionCenterScopedV2').mockResolvedValueOnce([
      {
        customerId: 50100,
        customerName: 'كافيه البستان',
        companyName: 'MAS',
        currentSalesperson: 'كريم عادل',
        salesperson: 'كريم عادل',
        lastOrderDate: '2026-06-15',
        daysSinceLastOrder: 55,
        medianDaysBetweenOrders: 14,
        medianBuyingInterval: 14,
        recent30dSales: 0,
        previous30dSales: 60000,
        salesChangePct: -100,
        recoveryOpportunity: 60000,
        riskLevel: 'HIGH',
        risk: 'HIGH',
        actionType: 'WIN_BACK',
        priority: 'HIGH',
        actionReason: 'العميل لم يطلب منذ أكثر من 30 يومًا',
        salespersonChanged: false,
      },
    ]);

    const res = await buildAiContextForQuery({
      message: 'ما هي مؤشرات المخاطر والعملاء المعرضين للفقد؟',
      filters: baseFilters,
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('RISK');
    expect(actionSpy).toHaveBeenCalledTimes(1);
    expect(res.drillDownContext?.riskActionCenter).toHaveLength(1);
    expect(res.drillDownContext?.riskActionCenter?.[0].riskLevel).toBe('HIGH');
    expect(res.drillDownContext?.riskActionCenter?.[0].recoveryOpportunity).toBe(60000);
  });

  // --------------------------------------------------------------------------
  // H. PRODUCT_ANALYSIS -> product summary
  // --------------------------------------------------------------------------
  it('H. PRODUCT_ANALYSIS -> product summary', async () => {
    const productSummarySpy = vi.spyOn(analytics.products, 'summary').mockResolvedValueOnce([
      {
        productId: 8516,
        productName: 'حليب كامل الدسم',
        productCategory: 'Dairy',
        ordersCount: 40,
        uniqueCustomers: 25,
        quantitySold: 500,
        salesValue: 250000,
        averageUnitValue: 500,
        firstOrderDate: '2026-06-01',
        lastOrderDate: '2026-08-08',
        activeSalespeople: 4,
        companiesCount: 1,
      },
    ]);
    const topCustSpy = vi.spyOn(analytics.products, 'productTopCustomersV2');

    const res = await buildAiContextForQuery({
      message: 'حلل أداء هذا المنتج المحدد بالتفصيل',
      filters: { ...baseFilters, productId: 8516 },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('PRODUCT_ANALYSIS');
    expect(productSummarySpy).toHaveBeenCalledTimes(1);
    expect(topCustSpy).not.toHaveBeenCalled();
    expect(res.drillDownContext?.targetProduct?.productId).toBe(8516);
    expect(res.drillDownContext?.targetProduct?.periodSales).toBe(250000);
  });

  // --------------------------------------------------------------------------
  // I. PRODUCT_CUSTOMERS -> productTopCustomersV2
  // --------------------------------------------------------------------------
  it('I. PRODUCT_CUSTOMERS -> productTopCustomersV2 only', async () => {
    const topCustSpy = vi.spyOn(analytics.products, 'productTopCustomersV2').mockResolvedValueOnce([
      {
        customerId: 30709,
        customerName: 'فندق ماريوت',
        companyName: 'MAS',
        salesperson: 'أحمد علي',
        governorateName: 'القاهرة',
        areaName: 'مدينة نصر',
        ordersCount: 10,
        salesValue: 120000,
        quantity: 240,
        lastOrderDate: '2026-08-08',
      },
    ]);
    const productSummarySpy = vi.spyOn(analytics.products, 'summary');

    const res = await buildAiContextForQuery({
      message: 'مين أكبر عملاء هذا المنتج؟',
      filters: { ...baseFilters, productId: 8516 },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('PRODUCT_CUSTOMERS');
    expect(topCustSpy).toHaveBeenCalledTimes(1);
    expect(productSummarySpy).not.toHaveBeenCalled();
    expect(res.drillDownContext?.productTopCustomers).toHaveLength(1);
    expect(res.drillDownContext?.productTopCustomers?.[0].customerName).toBe('فندق ماريوت');
  });

  // --------------------------------------------------------------------------
  // J. missing customer -> ENTITY_NOT_FOUND
  // --------------------------------------------------------------------------
  it('J. missing customer for customer-dependent intent -> ENTITY_NOT_FOUND with Arabic message', async () => {
    const summarySpy = vi.spyOn(analytics.customers, 'summary');

    const res = await buildAiContextForQuery({
      message: 'حلل العميل',
      filters: { ...baseFilters, customerId: null },
    });

    expect(res.status).toBe('ENTITY_NOT_FOUND');
    expect(res.userMessage).toBe('يرجى تحديد العميل من قائمة الفلاتر أولاً للحصول على تحليل تفصيلي دقيق.');
    expect(summarySpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // K. missing product -> ENTITY_NOT_FOUND
  // --------------------------------------------------------------------------
  it('K. missing product for product-dependent intent -> ENTITY_NOT_FOUND with Arabic message', async () => {
    const productSummarySpy = vi.spyOn(analytics.products, 'summary');

    const res = await buildAiContextForQuery({
      message: 'مين أكبر عملاء المنتج؟',
      filters: { ...baseFilters, productId: null },
    });

    expect(res.status).toBe('ENTITY_NOT_FOUND');
    expect(res.userMessage).toBe('يرجى تحديد المنتج من قائمة الفلاتر أولاً للحصول على تحليل تفصيلي دقيق.');
    expect(productSummarySpy).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // L. Cross-sell with geography active -> DRILLDOWN_DATA_UNAVAILABLE
  // --------------------------------------------------------------------------
  it('L. Cross-sell with geography or salesperson active -> DRILLDOWN_DATA_UNAVAILABLE', async () => {
    const crossSellSpy = vi.spyOn(analytics.customers, 'crossSellCandidates');

    const res = await buildAiContextForQuery({
      message: 'ما هي فرص البيع المتقاطع للعميل؟',
      filters: {
        ...baseFilters,
        customerId: 30709,
        governorateCode: 'EGY.1_1',
      },
    });

    expect(res.status).toBe('DRILLDOWN_DATA_UNAVAILABLE');
    expect(res.intent).toBe('CROSS_SELL');
    expect(res.userMessage).toContain('تحليل البيع المتقاطع غير متاح مع فلاتر المناديب أو التوزيع الجغرافي');
    expect(crossSellSpy).not.toHaveBeenCalled();
  });

  it('L2. Cross-sell without geography/salesperson active -> calls crossSellCandidates', async () => {
    const crossSellSpy = vi.spyOn(analytics.customers, 'crossSellCandidates').mockResolvedValueOnce([
      {
        productId: 9500,
        productName: 'جبنة موتزاريلا',
        peerCustomersCount: 15,
        peerOrdersCount: 40,
        peerSalesValue: 80000,
        affinityScore: 0.85,
      },
    ]);

    const res = await buildAiContextForQuery({
      message: 'ما هي فرص البيع المتقاطع للعميل؟',
      filters: {
        ...baseFilters,
        customerId: 30709,
        salespersonName: null,
        governorateCode: null,
        areaCode: null,
      },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('CROSS_SELL');
    expect(crossSellSpy).toHaveBeenCalledTimes(1);
    expect(res.drillDownContext?.crossSellCandidates).toHaveLength(1);
    expect(res.drillDownContext?.crossSellCandidates?.[0].productName).toBe('جبنة موتزاريلا');
  });

  // --------------------------------------------------------------------------
  // M. No PII survives DTO mapping
  // --------------------------------------------------------------------------
  it('M. No PII survives DTO mapping (phone, email, bank, address stripped)', () => {
    const rawOrder: any = {
      orderId: 101,
      orderName: 'SO-101',
      orderDate: '2026-08-05',
      companyName: 'MAS',
      salesperson: 'أحمد',
      governorateName: 'Cairo',
      areaName: 'Nasr City',
      orderValue: 5000,
      linesCount: 3,
      productsCount: 3,
      totalQty: 20,
      orderStatus: 'CONFIRMED',
      // Injected prohibited fields
      phone: '01012345678',
      mobile: '01098765432',
      email: 'client@example.com',
      address: '123 Test Street',
      bank: 'CIB',
      account_number: '123456789',
      iban: 'EG123456',
      receipt: 'REC-99',
    };

    const safeOrder = mapCustomerOrderToSafeDTO(rawOrder);
    const serializedOrder = JSON.stringify(safeOrder);

    expect(serializedOrder).not.toContain('01012345678');
    expect(serializedOrder).not.toContain('client@example.com');
    expect(serializedOrder).not.toContain('123 Test Street');
    expect(serializedOrder).not.toContain('CIB');
    expect(serializedOrder).not.toContain('123456789');
    expect((safeOrder as any).phone).toBeUndefined();
    expect((safeOrder as any).email).toBeUndefined();
    expect((safeOrder as any).bank).toBeUndefined();
    expect(safeOrder.paymentStatus).toBe('UNKNOWN');
    expect(safeOrder.orderStatus).toBe('CONFIRMED');
  });

  // --------------------------------------------------------------------------
  // N. Declining Customers -> calculated salesGap, NOT recoveryOpportunity
  // --------------------------------------------------------------------------
  it('N. Declining Customers -> calculated salesGap, NOT recoveryOpportunity', async () => {
    vi.spyOn(analytics.customers, 'summary').mockResolvedValueOnce([
      {
        customerId: 1001,
        customerName: 'مطعم أ',
        companyName: 'MAS',
        primarySalesperson: 'مندوب 1',
        ordersCount: 2,
        salesValue: 20000,
        averageOrderValue: 10000,
        firstOrderDate: '2026-06-01',
        lastOrderDate: '2026-08-05',
        daysSinceLastOrder: 4,
        customerStatus: 'ACTIVE',
        previousPeriodSales: 60000,
        salesChangePct: -66.67,
      },
    ]);

    const res = await buildAiContextForQuery({
      message: 'العملاء المتراجعين في المبيعات',
      filters: baseFilters,
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.intent).toBe('DECLINING_CUSTOMERS');
    expect(res.drillDownContext?.decliningCustomers).toHaveLength(1);
    expect(res.drillDownContext?.decliningCustomers?.[0].salesGap).toBe(40000);
    expect((res.drillDownContext?.decliningCustomers?.[0] as any).recoveryOpportunity).toBeUndefined();
  });
});
