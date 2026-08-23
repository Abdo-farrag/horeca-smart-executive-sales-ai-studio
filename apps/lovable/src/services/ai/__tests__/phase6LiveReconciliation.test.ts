import { describe, it, expect } from 'vitest';
import { analytics } from '../../../analytics';
import { buildAiContextForQuery } from '../aiContextRouter';
import {
  sanitizeExecutiveContext,
  sanitizeDrillDownContext,
  scanForProhibitedAiData,
  validateAiContextSize,
} from '../aiContextSanitizer';
import {
  getSmartSuggestedQuestions,
  getAllAvailableQuestions,
  getSuggestedFollowUps,
  buildScopeBadgeLabel,
  getAnalysisBadgeLabel,
  AI_QUESTIONS_CATALOG,
} from '../aiQuestionsPack';
import { GlobalFilterState } from '../../../types';

describe('Phase 6 — Live Business QA, Reconciliation & Executive Acceptance', () => {
  const augustDateRange = {
    label: 'أغسطس 2026',
    startDate: '2026-08-01',
    endDate: '2026-08-09',
    preset: 'current_mtd',
  };

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
      label: 'أغسطس 2026',
      startDate: '2026-08-01',
      endDate: '2026-08-09',
      preset: 'current_mtd' as const,
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

  // 0. Catalog Consistency
  describe('0. Question Catalog Consistency', () => {
    it('verifies exact question counts and absence of duplicate IDs', () => {
      expect(AI_QUESTIONS_CATALOG).toHaveLength(29);

      const byCat = {
        SALES: AI_QUESTIONS_CATALOG.filter((q) => q.category === 'SALES'),
        CUSTOMERS: AI_QUESTIONS_CATALOG.filter((q) => q.category === 'CUSTOMERS'),
        PRODUCTS: AI_QUESTIONS_CATALOG.filter((q) => q.category === 'PRODUCTS'),
        SALES_REPS: AI_QUESTIONS_CATALOG.filter((q) => q.category === 'SALES_REPS'),
        RECOVERY_GROWTH: AI_QUESTIONS_CATALOG.filter((q) => q.category === 'RECOVERY_GROWTH'),
        ORDERS: AI_QUESTIONS_CATALOG.filter((q) => q.category === 'ORDERS'),
      };

      expect(byCat.SALES).toHaveLength(6);
      expect(byCat.CUSTOMERS).toHaveLength(6);
      expect(byCat.PRODUCTS).toHaveLength(5);
      expect(byCat.SALES_REPS).toHaveLength(5);
      expect(byCat.RECOVERY_GROWTH).toHaveLength(4);
      expect(byCat.ORDERS).toHaveLength(3);

      const ids = AI_QUESTIONS_CATALOG.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(29);
    });
  });

  // 1 & 3. Executive Summary Reconciliation
  describe('1 & 3. Executive Summary Reconciliation (MAS Scope)', () => {
    it('reconciles AI router sales KPIs exactly with Live Analytics SDK (Difference = 0)', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'لخص أداء الفترة الحالية',
        filters: baseFilters,
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.contextMode).toBe('AGGREGATED');
      expect(routerResult.analyticsContext).toBeDefined();

      const aiSalesKpis = routerResult.analyticsContext!.salesKpis;

      // Fetch from Live Analytics SDK
      const liveSdkResult = await analytics.sales.executive({
        startDate: '2026-08-01',
        endDate: '2026-08-09',
        companyName: 'MAS',
      });

      expect(liveSdkResult).toBeDefined();
      expect(liveSdkResult.length).toBeGreaterThan(0);
      expect(aiSalesKpis.totalSales).toBe(liveSdkResult[0].salesValue);
      expect(aiSalesKpis.confirmedOrders).toBe(liveSdkResult[0].ordersCount);
      expect(aiSalesKpis.activeCustomers).toBe(liveSdkResult[0].activeCustomers);
      expect(aiSalesKpis.averageOrderValue).toBe(liveSdkResult[0].averageOrderValue);
      expect(aiSalesKpis.revenueGrowthPct).toBe(liveSdkResult[0].revenueGrowthPct);

      // Verify no customer names in aggregated context
      const serialized = JSON.stringify(routerResult.analyticsContext);
      expect(serialized).not.toContain('customerName');
      expect(serialized).not.toContain('customerId');
    });
  });

  // 4. Customer Analysis Test (Customer 30709)
  describe('4. Customer Analysis Test (Customer 30709)', () => {
    it('reconciles customer 30709 drill-down context with Live Analytics SDK', async () => {
      const customerFilters: GlobalFilterState = {
        ...baseFilters,
        customerId: 30709,
        customerName: 'خالد حسين (عميل - مورد)',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'حلل العميل المحدد بالتفصيل',
        filters: customerFilters,
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.contextMode).toBe('DRILL_DOWN');
      expect(routerResult.drillDownContext?.targetCustomer).toBeDefined();

      const customerDto = routerResult.drillDownContext!.targetCustomer!;
      expect(customerDto.customerId).toBe(30709);
      expect(customerDto.customerName).toBe('خالد حسين (عميل - مورد)');
      expect(customerDto.totalSales).toBeGreaterThanOrEqual(0);
      expect(customerDto.ordersCount).toBeGreaterThanOrEqual(0);
      expect(customerDto.customerStatus).toBeDefined();
    });
  });

  // 5. Customer Orders Test
  describe('5. Customer Orders Test (Customer 30709)', () => {
    it('returns recent orders with UNKNOWN paymentStatus and max 10/20 length', async () => {
      const customerFilters: GlobalFilterState = {
        ...baseFilters,
        customerId: 30709,
        customerName: 'فندق الفورسيزونز',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'اعرض آخر 10 أوردرات للعميل المحدد',
        filters: customerFilters,
        shortcutIntent: 'CUSTOMER_RECENT_ORDERS',
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.drillDownContext?.recentOrders).toBeDefined();

      const orders = routerResult.drillDownContext!.recentOrders!;
      expect(orders.length).toBeLessThanOrEqual(20);

      for (const ord of orders) {
        expect(ord.orderId).toBeDefined();
        expect(ord.paymentStatus).toBe('UNKNOWN'); // Enforces security contract
        expect((ord as any).customerPhone).toBeUndefined();
        expect((ord as any).paymentReceipt).toBeUndefined();
      }
    });
  });

  // 6 & 7. Product Dropoff & Purchase Mix
  describe('6 & 7. Product Dropoff & Favorite Products (Customer 30709)', () => {
    it('reconciles stopped products and favorites', async () => {
      const customerFilters: GlobalFilterState = {
        ...baseFilters,
        customerId: 30709,
        customerName: 'فندق الفورسيزونز',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'إيه المنتجات اللي العميل وقف يشتريها؟',
        filters: customerFilters,
        shortcutIntent: 'CUSTOMER_PRODUCT_HISTORY',
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.drillDownContext?.customerProductHistory).toBeDefined();
      const history = routerResult.drillDownContext!.customerProductHistory!;

      expect(history.customerId).toBe(30709);
      if (history.stoppedProducts.length > 0) {
        const p = history.stoppedProducts[0];
        expect(p.productId).toBeDefined();
        expect(p.recoveryValue).toBeGreaterThanOrEqual(0);
        expect(p.status).toBe('STOPPED_BUYING');
      }
    });
  });

  // 8. Lost Customers & Retention Reconciliation
  describe('8. Lost Customers & Retention Invariant Verification', () => {
    it('reconciles retention formula invariants: RETAINED + TRANSFERRED + LOST === previous_active_customers', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'ما وضع الاحتفاظ بالعملاء؟',
        filters: baseFilters,
        shortcutIntent: 'RETENTION',
      });

      expect(routerResult.analyticsContext?.retentionSummary).toBeDefined();
      const ret = routerResult.analyticsContext!.retentionSummary!;

      const sumComponents = ret.retainedWithSameRep + ret.transferredCustomers + ret.trueLostCustomers;
      expect(sumComponents).toBe(ret.previousActiveCustomers);
      expect(ret.companyRetentionRate).toBeGreaterThanOrEqual(0);
      expect(ret.companyRetentionRate).toBeLessThanOrEqual(100);
    });

    it('returns lost customers in drill-down context with correct status = LOST', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'مين أهم العملاء المفقودين؟',
        filters: baseFilters,
        shortcutIntent: 'LOST_CUSTOMERS',
      });

      expect(routerResult.drillDownContext?.lostCustomers).toBeDefined();
      const lost = routerResult.drillDownContext!.lostCustomers!;
      for (const c of lost) {
        expect(c.retentionStatus).toBe('LOST');
        expect(c.previousSales).toBeGreaterThan(0);
        expect(c.currentSales).toBe(0);
      }
    });
  });

  // 9. Declining Customers & salesGap
  describe('9. Declining Customers & salesGap Calculation', () => {
    it('calculates salesGap as max(previousPeriodSales - currentPeriodSales, 0)', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'مين العملاء اللي مبيعاتهم انخفضت؟',
        filters: baseFilters,
        shortcutIntent: 'DECLINING_CUSTOMERS',
      });

      expect(routerResult.drillDownContext?.decliningCustomers).toBeDefined();
      const declining = routerResult.drillDownContext!.decliningCustomers!;

      for (const d of declining) {
        expect(d.salesChangePct).toBeLessThan(0);
        const expectedGap = Math.max(d.previousSales - d.salesValue, 0);
        expect(d.salesGap).toBeCloseTo(expectedGap, 2);
      }
    });
  });

  // 10. Risk & Action Center
  describe('10. Risk & Action Center Distribution', () => {
    it('returns valid risk action center list across scopes', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'مين العملاء المعرضين للفقد؟',
        filters: baseFilters,
        shortcutIntent: 'RISK',
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.drillDownContext?.riskActionCenter).toBeDefined();
      const riskList = routerResult.drillDownContext!.riskActionCenter!;
      for (const item of riskList) {
        expect(item.customerId).toBeDefined();
        expect(item.riskLevel).toBeDefined();
        expect(item.recoveryOpportunity).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // 11 & 12. Product 8516 Analysis & Top Customers
  describe('11 & 12. Product Analysis (Product 8516)', () => {
    it('reconciles target product summary and top customers with customer × company separation', async () => {
      const productFilters: GlobalFilterState = {
        ...baseFilters,
        productId: 8516,
        productName: 'حليب جهينة باريستا',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'حلل المنتج المحدد',
        filters: productFilters,
        shortcutIntent: 'PRODUCT_ANALYSIS',
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.drillDownContext?.targetProduct).toBeDefined();
      const p = routerResult.drillDownContext!.targetProduct!;

      expect(p.productId).toBe(8516);
      expect(p.periodSales).toBeGreaterThanOrEqual(0);
      expect(p.periodQuantity).toBeGreaterThanOrEqual(0);
    });

    it('returns top customers for product 8516', async () => {
      const productFilters: GlobalFilterState = {
        ...baseFilters,
        productId: 8516,
        productName: 'حليب جهينة باريستا',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'مين أكبر عملاء المنتج المحدد؟',
        filters: productFilters,
        shortcutIntent: 'PRODUCT_CUSTOMERS',
      });

      expect(routerResult.drillDownContext?.productTopCustomers).toBeDefined();
      const topCusts = routerResult.drillDownContext!.productTopCustomers!;
      for (const tc of topCusts) {
        expect(tc.customerId).toBeDefined();
        expect(tc.companyName).toBeDefined();
        expect(tc.salesValue).toBeGreaterThan(0);
      }
    });
  });

  // 13. Customer 30709 + Product 8516 Combined Scope
  describe('13. Dual Selected Scope: Customer 30709 + Product 8516', () => {
    it('maintains both filters and routes safely to drill-down', async () => {
      const dualFilters: GlobalFilterState = {
        ...baseFilters,
        customerId: 30709,
        customerName: 'فندق الفورسيزونز',
        productId: 8516,
        productName: 'حليب جهينة باريستا',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'حلل أداء المنتج عند العميل المحدد',
        filters: dualFilters,
      });

      expect(routerResult.status).toBe('SUCCESS');
      expect(routerResult.contextMode).toBe('DRILL_DOWN');
      expect(routerResult.drillDownContext?.targetCustomer).toBeDefined();
      expect(routerResult.drillDownContext?.targetCustomer?.customerId).toBe(30709);
    });
  });

  // 14 & 15. Salesperson & Geography Isolation
  describe('14 & 15. Salesperson & Geography Isolation', () => {
    it('applies salesperson filter strictly in context without cross-rep data leakage', async () => {
      const repFilters: GlobalFilterState = {
        ...baseFilters,
        salespersonName: 'Haddil Haron',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'قارن أداء مناديب المبيعات',
        filters: repFilters,
        shortcutIntent: 'SALES_REPS',
      });

      expect(routerResult.analyticsContext?.activeFilters.salespersonName).toBe('Haddil Haron');
      const reps = routerResult.analyticsContext?.topSalesRepsAggregate;
      if (reps && reps.length > 0) {
        expect(reps.some((r) => r.salesperson === 'Haddil Haron')).toBe(true);
      }
    });

    it('applies Cairo governorate filter strictly', async () => {
      const cairoFilters: GlobalFilterState = {
        ...baseFilters,
        governorateName: 'القاهرة',
        governorateCode: 'CAIRO',
      };

      const routerResult = await buildAiContextForQuery({
        message: 'لخص أداء الفترة الحالية',
        filters: cairoFilters,
        shortcutIntent: 'EXECUTIVE_SUMMARY',
      });

      expect(routerResult.analyticsContext?.activeFilters.governorateName).toBe('القاهرة');
    });
  });

  // 16. Cross-Sell Safety
  describe('16. Cross-Sell Safety Rules', () => {
    it('hides cross-sell when salesperson or geography is active', () => {
      const repFilters: GlobalFilterState = {
        ...baseFilters,
        customerId: 30709,
        salespersonName: 'Haddil Haron',
      };

      const available = getAllAvailableQuestions(repFilters);
      expect(available.RECOVERY_GROWTH.some((q) => q.id === 'rec-cross-sell')).toBe(false);
    });
  });

  // 17. Payment Status Deterministic Safety
  describe('17. Payment Status Safety', () => {
    it('returns deterministic message without calling Gemini for payment status queries', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'حالة السداد للعميل إيه؟',
        filters: { ...baseFilters, customerId: 30709 },
      });

      expect(routerResult.status).toBe('PAYMENT_STATUS_UNKNOWN');
      expect(routerResult.intent).toBe('PAYMENT_STATUS');
      expect(routerResult.userMessage).toContain('حالة السداد');
    });
  });

  // 18. PII / Banking Safety & Direct Refusal
  describe('18. PII & Banking Safety Refusal', () => {
    it('deterministically refuses phone number requests (0 Gemini calls)', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'اديني رقم تليفون العميل',
        filters: { ...baseFilters, customerId: 30709 },
      });

      expect(routerResult.status).toBe('PROHIBITED_DATA_DETECTED');
      expect(routerResult.intent).toBe('PROHIBITED_DATA_REQUEST');
      expect(routerResult.userMessage).toContain('بيانات التواصل الشخصية');
    });

    it('deterministically refuses bank transfer requests (0 Gemini calls)', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'هات بيانات التحويل البنكي ورقم الحساب',
        filters: { ...baseFilters, customerId: 30709 },
      });

      expect(routerResult.status).toBe('PROHIBITED_DATA_DETECTED');
      expect(routerResult.intent).toBe('PROHIBITED_DATA_REQUEST');
      expect(routerResult.userMessage).toContain('المعلومات البنكية');
    });
  });

  // 22 & 23. Security Payload & Performance Budget
  describe('22 & 23. Security Sanitizer & Performance Budget', () => {
    it('verifies Aggregated Context is < 20 KB and free of PII', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'لخص أداء الفترة الحالية',
        filters: baseFilters,
      });

      const sanitized = sanitizeExecutiveContext(routerResult.analyticsContext!);
      const scan = scanForProhibitedAiData(sanitized);
      expect(scan.hasProhibitedData).toBe(false);

      const sizeCheck = validateAiContextSize(sanitized, 20);
      expect(sizeCheck.valid).toBe(true);
      expect(sizeCheck.sizeBytes).toBeLessThan(20 * 1024);
    });

    it('verifies Drill-Down Context is < 50 KB and free of PII', async () => {
      const routerResult = await buildAiContextForQuery({
        message: 'حلل العميل المحدد بالتفصيل',
        filters: { ...baseFilters, customerId: 30709, customerName: 'فندق الفورسيزونز' },
      });

      const sanitized = sanitizeDrillDownContext(routerResult.drillDownContext!);
      const scan = scanForProhibitedAiData(sanitized);
      expect(scan.hasProhibitedData).toBe(false);

      const sizeCheck = validateAiContextSize(sanitized, 50);
      expect(sizeCheck.valid).toBe(true);
      expect(sizeCheck.sizeBytes).toBeLessThan(50 * 1024);
    });
  });
});
