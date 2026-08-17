import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildExecutiveAIContext,
  validateSanitizedContext,
  trimChatHistory,
  sendAiChatMessage,
} from '../aiChatService';
import { GlobalFilterState } from '../../types';
import { analytics } from '../../analytics';
import { AiChatMessage } from '../../types/ai';

// Mock analytics SDK
vi.mock('../../analytics', () => ({
  analytics: {
    sales: {
      executive: vi.fn(),
      freshness: vi.fn(),
    },
    customers: {
      retention: vi.fn(),
      portfolioSummary: vi.fn(),
      riskDistribution: vi.fn(),
    },
    salesReps: {
      summary: vi.fn(),
    },
    products: {
      summary: vi.fn(),
    },
    filters: {
      governorates: vi.fn(),
    },
  },
}));

const mockGlobalFilters: GlobalFilterState = {
  periodMode: 'custom',
  selectedStartDate: '2026-08-01',
  selectedEndDate: '2026-08-09',
  effectiveStartDate: '2026-08-01',
  effectiveEndDate: '2026-08-09',
  latestAvailableDataDate: '2026-08-09',
  companyId: 1,
  companyName: 'MAS',
  company: 'MAS',
  salespersonOptionKey: 'Haddil Haron',
  salespersonName: 'Haddil Haron',
  salespersonCompanyId: 1,
  salesperson: 'Haddil Haron',
  salesRepId: '1',
  governorateCode: 'EGY.GZ',
  governorateName: 'Giza',
  areaCode: 'EGY.GZ.DOK',
  areaName: 'Dokki',
  customerId: 30709,
  customerName: 'Secret VIP Customer',
  productId: 8516,
  productName: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
  dateRange: {
    label: 'August 2026',
    startDate: '2026-08-01',
    endDate: '2026-08-09',
    preset: 'custom',
  },
  area: 'Dokki',
  city: 'Giza',
  category: 'Dairy',
  customerStatus: null,
  priority: null,
  risk: null,
  actionType: null,
  customerSector: 'restaurant',
  searchQuery: '',
};

describe('AI Chat Service & ExecutiveAIContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (analytics.sales.executive as any).mockResolvedValue([
      {
        salesValue: 15445469.44,
        ordersCount: 220,
        activeCustomers: 170,
        averageOrderValue: 70206.68,
        previousSalesValue: 12000000.0,
        revenueGrowthPct: 28.71,
        minOrderDate: '2026-08-01',
        maxOrderDate: '2026-08-09',
        lastSourceUpdate: '2026-08-09T10:00:00Z',
      },
    ]);

    (analytics.sales.freshness as any).mockResolvedValue([
      {
        maxOrderDate: '2026-08-09',
        maxSourceUpdatedAt: '2026-08-09T10:00:00Z',
        lastSuccessfulSalesSyncStartedAt: '2026-08-09T09:00:00Z',
        lastSuccessfulSalesSyncFinishedAt: '2026-08-09T09:05:00Z',
        lastSalesSyncRowsCount: 15000,
        lastFailedFullSyncStartedAt: null,
        lastFailedFullSyncMessage: null,
      },
    ]);

    (analytics.customers.retention as any).mockResolvedValue([
      {
        month: '2026-08-01',
        previousActiveCustomers: 500,
        retainedWithSameRep: 400,
        transferredCustomers: 30,
        trueLostCustomers: 70,
        newCustomers: 50,
        companyRetentionRate: 86.0,
        sameRepRetentionRate: 80.0,
        lostCustomerRevenueEgp: 1500000,
        activeCustomers: 480,
      },
    ]);

    (analytics.customers.riskDistribution as any).mockResolvedValue([
      {
        riskLevel: 'HIGH',
        customersCount: 15,
        customersPct: 10,
        recoveryOpportunity: 500000,
      },
      {
        riskLevel: 'MEDIUM',
        customersCount: 25,
        customersPct: 15,
        recoveryOpportunity: 300000,
      },
    ]);

    (analytics.salesReps.summary as any).mockResolvedValue([
      {
        salesperson: 'Haddil Haron',
        companyName: 'MAS',
        salesValue: 5000000,
        ordersCount: 80,
        activeCustomers: 60,
        retentionRate: 90.0,
      },
    ]);

    (analytics.products.summary as any).mockResolvedValue([
      {
        productId: 8516,
        productName: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
        productCategory: null,
        salesValue: 2000000,
        quantitySold: 500,
        uniqueCustomers: 40,
      },
    ]);

    (analytics.filters.governorates as any).mockResolvedValue([
      {
        governorateCode: 'EGY.GZ',
        governorateNameAr: 'الجيزة',
        salesValue: 8000000,
        ordersCount: 120,
        customersCount: 90,
      },
    ]);
  });

  it('1. Context contains correct aggregate KPIs', async () => {
    const context = await buildExecutiveAIContext(mockGlobalFilters);

    expect(context.salesKpis.totalSales).toBe(15445469.44);
    expect(context.salesKpis.confirmedOrders).toBe(220);
    expect(context.salesKpis.activeCustomers).toBe(170);
    expect(context.salesKpis.averageOrderValue).toBe(70206.68);
    expect(context.salesKpis.revenueGrowthPct).toBe(28.71);
    expect(context.salesKpis.previousPeriodSales).toBe(12000000.0);
    expect(context.metadata.operatingCurrency).toBe('EGP');
  });

  it('2. Context contains no customer identity (Scope A security compliance)', async () => {
    const context = await buildExecutiveAIContext(mockGlobalFilters);

    // Active filters must have customerFilterActive boolean, NOT customerName or customerId
    expect(context.activeFilters.customerFilterActive).toBe(true);
    expect((context.activeFilters as any).customerName).toBeUndefined();
    expect((context.activeFilters as any).customerId).toBeUndefined();

    // Verify stringified JSON does not contain the customer name or customer_id
    const serialized = JSON.stringify(context);
    expect(serialized).not.toContain('Secret VIP Customer');
    expect(serialized).not.toContain('30709');
    expect(serialized).not.toContain('customer_name');
    expect(serialized).not.toContain('customer_id');
  });

  it('3. Context contains no order IDs or invoice numbers', async () => {
    const context = await buildExecutiveAIContext(mockGlobalFilters);
    const serialized = JSON.stringify(context);

    expect(serialized).not.toContain('order_id');
    expect(serialized).not.toContain('order_name');
    expect(serialized).not.toContain('invoice');
  });

  it('4. Context contains no phone/mobile/email/address', async () => {
    const context = await buildExecutiveAIContext(mockGlobalFilters);
    const serialized = JSON.stringify(context);

    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('mobile');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('address');
    expect(serialized).not.toContain('street');

    const sanity = validateSanitizedContext(context);
    expect(sanity.valid).toBe(true);
  });

  it('5. Customer filter affects aggregate query parameters but customer identity is omitted in context', async () => {
    const context = await buildExecutiveAIContext(mockGlobalFilters);

    // analytics SDK should have received customerId to filter aggregates correctly
    expect(analytics.sales.executive).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 30709,
      })
    );

    // Context itself must not disclose the customer ID or customer name
    expect(context.activeFilters.customerFilterActive).toBe(true);
    expect(JSON.stringify(context)).not.toContain('Secret VIP Customer');
  });

  it('6. Product filter affects aggregate results and product name is preserved in activeFilters & product aggregates', async () => {
    const context = await buildExecutiveAIContext(mockGlobalFilters);

    expect(analytics.sales.executive).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 8516,
      })
    );

    expect(context.activeFilters.productName).toBe('[202069] Juhayna Barista Milk 1 L - 6 Pack');
    expect(context.topProductsAggregate?.[0].productName).toBe('[202069] Juhayna Barista Milk 1 L - 6 Pack');
  });

  it('7. Retention metrics correctly map retainedWithSameRep and lostCustomerRevenueEgp from live SDK', async () => {
    (analytics.customers.retention as any).mockResolvedValueOnce([
      {
        previousActiveCustomers: 85,
        retainedWithSameRep: 65,
        transferredCustomers: 2,
        trueLostCustomers: 18,
        newCustomers: 21,
        companyRetentionRate: 78.82,
        sameRepRetentionRate: 76.47,
        lostCustomerRevenueEgp: 2814924.60,
      },
    ]);

    const context = await buildExecutiveAIContext(mockGlobalFilters);

    expect(context.retentionSummary).not.toBeNull();
    // 1. retained_same_rep = 65 maps to retainedWithSameRep = 65
    expect(context.retentionSummary?.retainedWithSameRep).toBe(65);
    // 2. lost_previous_sales = 2814924.60 maps to lostCustomerRevenueEgp = 2814924.60
    expect(context.retentionSummary?.lostCustomerRevenueEgp).toBe(2814924.60);
    // 3. valid source values are not overwritten by fallback zero
    expect(context.retentionSummary?.previousActiveCustomers).toBe(85);
    expect(context.retentionSummary?.transferredCustomers).toBe(2);
    expect(context.retentionSummary?.trueLostCustomers).toBe(18);
    expect(context.retentionSummary?.newCustomers).toBe(21);
    expect(context.retentionSummary?.companyRetentionRate).toBe(78.82);
    expect(context.retentionSummary?.sameRepRetentionRate).toBe(76.47);
  });

  it('8. History trims to maximum 8 messages', () => {
    const longHistory: AiChatMessage[] = [
      { role: 'user', text: '1' },
      { role: 'model', text: '2' },
      { role: 'user', text: '3' },
      { role: 'model', text: '4' },
      { role: 'user', text: '5' },
      { role: 'model', text: '6' },
      { role: 'user', text: '7' },
      { role: 'model', text: '8' },
      { role: 'user', text: '9' },
      { role: 'model', text: '10' },
    ];

    const trimmed = trimChatHistory(longHistory);
    expect(trimmed).toHaveLength(8);
    expect(trimmed[0].text).toBe('3');
    expect(trimmed[7].text).toBe('10');
  });

  it('9. Sanitization rejects payload with prohibited keys', () => {
    const dirtyContext: any = {
      metadata: { generatedAt: '2026-08-16', dataFreshnessDate: '2026-08-09', operatingCurrency: 'EGP' },
      activeFilters: { customerFilterActive: true, dateRangeLabel: 'Current', customerName: 'Leaked Name' },
      salesKpis: { totalSales: 100, confirmedOrders: 1, activeCustomers: 1, averageOrderValue: 100, revenueGrowthPct: null, previousPeriodSales: null },
    };

    const sanity = validateSanitizedContext(dirtyContext);
    expect(sanity.valid).toBe(false);
    expect(sanity.violations.length).toBeGreaterThan(0);
  });

  it('10. Preserves null semantics (derived unavailable metrics remain null)', async () => {
    (analytics.sales.executive as any).mockResolvedValueOnce([
      {
        salesValue: 1000,
        ordersCount: 5,
        activeCustomers: 3,
        averageOrderValue: 200,
        previousSalesValue: null,
        revenueGrowthPct: null, // unavailable previous period
      },
    ]);

    const context = await buildExecutiveAIContext(mockGlobalFilters);
    expect(context.salesKpis.revenueGrowthPct).toBeNull();
    expect(context.salesKpis.previousPeriodSales).toBeNull();
  });

  it('11. API failure produces no fake response and throws structured error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'Service down',
        },
      }),
    } as any);

    await expect(
      sendAiChatMessage({
        message: 'Hello',
        history: [],
        filters: mockGlobalFilters,
        language: 'ar',
      })
    ).rejects.toThrow();

    fetchSpy.mockRestore();
  });
});
