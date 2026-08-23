import { describe, it, expect } from 'vitest';
import {
  sanitizeExecutiveContext,
  sanitizeDrillDownContext,
  scanForProhibitedAiData,
  validateAiContextSize,
  sanitizeHistoryText,
  AiContextSecurityViolationError,
  AiContextTooLargeError,
} from '../aiContextSanitizer';
import { ExecutiveAIContext, ExecutiveDrillDownContext } from '../../../types/ai';

describe('Phase 4 — AI Context Sanitizer & Security Boundary', () => {
  describe('scanForProhibitedAiData', () => {
    it('detects prohibited keys in nested structures', () => {
      const payload = {
        company: 'MAS',
        customer: {
          name: 'Ahmed',
          phone: '01012345678',
          bank_account: 'EG123456789012345678901234567',
        },
      };

      const result = scanForProhibitedAiData(payload);
      expect(result.hasProhibitedData).toBe(true);
      expect(result.violationCount).toBeGreaterThanOrEqual(2);
      expect(result.violations.some((v) => v.includes('phone'))).toBe(true);
      expect(result.violations.some((v) => v.includes('bank_account'))).toBe(true);
    });

    it('detects Arabic prohibited keys', () => {
      const payload = {
        مبيعات: 1000,
        تفاصيل: {
          رقم_الحساب: '123456',
          صورة_الإيصال: 'https://example.com/receipt.jpg',
        },
      };

      const result = scanForProhibitedAiData(payload);
      expect(result.hasProhibitedData).toBe(true);
      expect(result.violations.some((v) => v.includes('رقم_الحساب'))).toBe(true);
      expect(result.violations.some((v) => v.includes('صورة_الإيصال'))).toBe(true);
    });

    it('detects email addresses, credit cards, and IBANs in string values', () => {
      const emailPayload = { note: 'Contact me at director@horecasmart.com for quotes' };
      expect(scanForProhibitedAiData(emailPayload).hasProhibitedData).toBe(true);

      const cardPayload = { comment: 'Card 4111 2222 3333 4444 used' };
      expect(scanForProhibitedAiData(cardPayload).hasProhibitedData).toBe(true);

      const ibanPayload = { ref: 'EG380002000100000000012345678' };
      expect(scanForProhibitedAiData(ibanPayload).hasProhibitedData).toBe(true);
    });

    it('does not produce false positives on normal IDs, dates, and amounts', () => {
      const cleanPayload = {
        customerId: 30709,
        productId: 8516,
        orderId: 991,
        totalSales: 15445469.44,
        confirmedOrders: 220,
        orderDate: '2026-08-09',
        governorate: 'الجيزة',
        productName: '[202069] Juhayna Barista Milk 1 L - 6 Pack',
      };

      const result = scanForProhibitedAiData(cleanPayload);
      expect(result.hasProhibitedData).toBe(false);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('sanitizeExecutiveContext (Aggregated Mode)', () => {
    const validRawContext: ExecutiveAIContext = {
      metadata: {
        generatedAt: '2026-08-16T12:00:00Z',
        dataFreshnessDate: '2026-08-09',
        operatingCurrency: 'EGP',
      },
      activeFilters: {
        dateRangeLabel: 'August 2026',
        effectiveStartDate: '2026-08-01',
        effectiveEndDate: '2026-08-09',
        companyName: 'MAS',
        salespersonName: 'Haddil Haron',
        governorateName: 'Giza',
        areaName: 'Dokki',
        customerFilterActive: false,
        productName: null,
      },
      salesKpis: {
        totalSales: 15445469.44,
        confirmedOrders: 220,
        activeCustomers: 170,
        averageOrderValue: 70206.68,
        revenueGrowthPct: 28.71,
        previousPeriodSales: 12000000,
      },
      retentionSummary: {
        previousActiveCustomers: 500,
        retainedWithSameRep: 400,
        transferredCustomers: 30,
        trueLostCustomers: 70,
        newCustomers: 50,
        companyRetentionRate: 86.0,
        sameRepRetentionRate: 80.0,
        lostCustomerRevenueEgp: 1500000,
      },
      riskDistribution: {
        highRiskCount: 15,
        mediumRiskCount: 25,
        lowRiskCount: 130,
        totalRecoveryOpportunityEgp: 800000,
      },
      topSalesRepsAggregate: [
        {
          salesperson: 'Haddil Haron',
          companyName: 'MAS',
          salesValue: 5000000,
          ordersCount: 80,
          activeCustomers: 60,
          retentionRate: 90.0,
        },
      ],
      topProductsAggregate: [
        {
          productName: 'Juhayna Milk',
          categoryName: 'Dairy',
          salesValue: 2000000,
          quantitySold: 500,
          uniqueCustomersCount: 40,
        },
      ],
      geographyAggregate: [
        {
          governorate: 'Giza',
          salesValue: 8000000,
          ordersCount: 120,
        },
      ],
    };

    it('preserves valid aggregate KPIs and structures', () => {
      const sanitized = sanitizeExecutiveContext(validRawContext);
      expect(sanitized.salesKpis.totalSales).toBe(15445469.44);
      expect(sanitized.salesKpis.confirmedOrders).toBe(220);
      expect(sanitized.salesKpis.revenueGrowthPct).toBe(28.71);
      expect(sanitized.retentionSummary?.companyRetentionRate).toBe(86.0);
      expect(sanitized.riskDistribution?.highRiskCount).toBe(15);
      expect(sanitized.topSalesRepsAggregate).toHaveLength(1);
      expect(sanitized.topProductsAggregate).toHaveLength(1);
      expect(sanitized.geographyAggregate).toHaveLength(1);
    });

    it('strips customerName and customerId and preserves customerFilterActive boolean', () => {
      const dirtyContext: any = {
        ...validRawContext,
        activeFilters: {
          ...validRawContext.activeFilters,
          customerId: 30709,
          customerName: 'Top Secret VIP Hotel',
        },
      };

      const sanitized = sanitizeExecutiveContext(dirtyContext);
      expect(sanitized.activeFilters.customerFilterActive).toBe(true);
      expect((sanitized.activeFilters as any).customerId).toBeUndefined();
      expect((sanitized.activeFilters as any).customerName).toBeUndefined();

      const serialized = JSON.stringify(sanitized);
      expect(serialized).not.toContain('Top Secret VIP Hotel');
      expect(serialized).not.toContain('30709');
    });

    it('caps aggregate arrays to maximum 20 items', () => {
      const largeContext: ExecutiveAIContext = {
        ...validRawContext,
        topProductsAggregate: Array.from({ length: 35 }, (_, i) => ({
          productName: `Product ${i}`,
          categoryName: 'Food',
          salesValue: 1000 * i,
          quantitySold: i,
          uniqueCustomersCount: 2,
        })),
      };

      const sanitized = sanitizeExecutiveContext(largeContext);
      expect(sanitized.topProductsAggregate?.length).toBeLessThanOrEqual(20);
    });

    it('drops unknown extra properties from root and sub-objects', () => {
      const rogueContext: any = {
        ...validRawContext,
        internalOdooCredentials: { user: 'admin', pass: '123' },
        salesKpis: {
          ...validRawContext.salesKpis,
          unauthorizedSecretMetric: 99999,
        },
      };

      const sanitized = sanitizeExecutiveContext(rogueContext);
      expect((sanitized as any).internalOdooCredentials).toBeUndefined();
      expect((sanitized.salesKpis as any).unauthorizedSecretMetric).toBeUndefined();
    });

    it('throws AiContextSecurityViolationError on critical prohibited values like Credit Cards', () => {
      const hackedContext: any = {
        ...validRawContext,
        activeFilters: {
          ...validRawContext.activeFilters,
          dateRangeLabel: '4111 2222 3333 4444',
        },
      };

      expect(() => sanitizeExecutiveContext(hackedContext)).toThrow(AiContextSecurityViolationError);
    });
  });

  describe('sanitizeDrillDownContext (Drill-Down Mode)', () => {
    it('sanitizes targetCustomer with strict allowlist and drops unauthorized fields', () => {
      const rawDrillDown: any = {
        targetCustomer: {
          customerId: 30709,
          customerName: 'Four Seasons Hotel',
          companyName: 'MAS',
          salespersonName: 'Haddil Haron',
          governorateName: 'Giza',
          areaName: 'Dokki',
          totalSales: 250000,
          ordersCount: 12,
          averageOrderValue: 20833.33,
          firstOrderDate: '2026-01-10',
          lastOrderDate: '2026-08-05',
          daysSinceLastOrder: 4,
          previousPeriodSales: 200000,
          currentPeriodSales: 250000,
          salesChangePct: 25.0,
          customerStatus: 'ACTIVE',
          riskLevel: 'LOW',
          recoveryOpportunity: 0,
          // Unauthorized fields to drop:
          customerPhone: '01000000000',
          taxCardNumber: '123-456-789',
          creditLimit: 500000,
        },
      };

      const sanitized = sanitizeDrillDownContext(rawDrillDown);
      expect(sanitized.targetCustomer).toBeDefined();
      expect(sanitized.targetCustomer?.customerId).toBe(30709);
      expect(sanitized.targetCustomer?.customerName).toBe('Four Seasons Hotel');
      expect(sanitized.targetCustomer?.totalSales).toBe(250000);

      // Dropped fields:
      expect((sanitized.targetCustomer as any).customerPhone).toBeUndefined();
      expect((sanitized.targetCustomer as any).taxCardNumber).toBeUndefined();
      expect((sanitized.targetCustomer as any).creditLimit).toBeUndefined();
    });

    it('sanitizes recentOrders with paymentStatus enum validation and array cap of 20', () => {
      const rawOrders = Array.from({ length: 30 }, (_, i) => ({
        orderId: 1000 + i,
        orderName: `SO/2026/${1000 + i}`,
        orderDate: '2026-08-05',
        customerName: 'Four Seasons Hotel',
        companyName: 'MAS',
        salesperson: 'Haddil Haron',
        governorateName: 'Giza',
        areaName: 'Dokki',
        orderValue: 15000,
        productsCount: 4,
        linesCount: 4,
        totalQuantity: 20,
        orderStatus: 'CONFIRMED',
        paymentStatus: i % 2 === 0 ? 'PAID' : 'INVALID_STATUS_VALUE',
        // Unauthorized field:
        deliveryNotes: 'Leave at back door',
      }));

      const sanitized = sanitizeDrillDownContext({ recentOrders: rawOrders as any });
      expect(sanitized.recentOrders).toHaveLength(20); // capped to 20
      expect(sanitized.recentOrders?.[0].paymentStatus).toBe('PAID');
      expect(sanitized.recentOrders?.[1].paymentStatus).toBe('UNKNOWN'); // coerced invalid status
      expect((sanitized.recentOrders?.[0] as any).deliveryNotes).toBeUndefined();
    });

    it('sanitizes customerProductHistory, targetProduct, decliningCustomers, and lostCustomers', () => {
      const rawDrillDown: ExecutiveDrillDownContext = {
        customerProductHistory: {
          customerId: 30709,
          customerName: 'Four Seasons Hotel',
          stoppedProducts: [
            {
              productId: 8516,
              productName: 'Juhayna Milk',
              previousSales: 50000,
              currentSales: 0,
              recoveryValue: 50000,
              status: 'STOPPED_BUYING',
            },
          ],
          favoriteProducts: [
            {
              productId: 9001,
              productName: 'Anchor Butter',
              salesValue: 80000,
              ordersCount: 8,
              salesSharePct: 32.0,
              lastOrderDate: '2026-08-05',
            },
          ],
        },
        targetProduct: {
          productId: 8516,
          productName: 'Juhayna Milk',
          categoryName: 'Dairy',
          periodSales: 500000,
          periodQuantity: 1000,
          periodOrders: 40,
          periodCustomers: 25,
          averageUnitValue: 500,
          firstOrderDate: '2026-08-01',
          lastOrderDate: '2026-08-09',
        },
        decliningCustomers: [
          {
            customerId: 101,
            customerName: 'Marriott',
            companyName: 'MAS',
            primarySalesperson: 'Haddil Haron',
            salesValue: 20000,
            previousSales: 60000,
            salesChangePct: -66.67,
            salesGap: 40000,
          },
        ],
        lostCustomers: [
          {
            companyName: 'MAS',
            customerId: 102,
            customerName: 'Hilton',
            previousSalesperson: 'Haddil Haron',
            currentSalesperson: 'Unassigned',
            previousOrders: 5,
            currentOrders: 0,
            previousSales: 45000,
            currentSales: 0,
            retentionStatus: 'LOST',
            salesChangePct: -100,
            previousLastOrderDate: '2026-07-20',
            currentLastOrderDate: null,
          },
        ],
        paymentStatusSummary: {
          statusNote: 'حالة السداد غير مسجلة بشكل موثوق.',
          hasReliablePaymentLedger: false,
        },
      };

      const sanitized = sanitizeDrillDownContext(rawDrillDown);
      expect(sanitized.customerProductHistory?.stoppedProducts).toHaveLength(1);
      expect(sanitized.customerProductHistory?.favoriteProducts).toHaveLength(1);
      expect(sanitized.targetProduct?.productName).toBe('Juhayna Milk');
      expect(sanitized.decliningCustomers?.[0].salesGap).toBe(40000);
      expect(sanitized.lostCustomers?.[0].retentionStatus).toBe('LOST');
      expect(sanitized.paymentStatusSummary?.hasReliablePaymentLedger).toBe(false);
    });

    it('rejects / drops arbitrary unknown root blocks (fail-closed)', () => {
      const rogueDrillDown: any = {
        unauthorizedRawDatabaseDump: { secretTable: [1, 2, 3] },
        executiveFinancialScorecard: { ebitda: 5000000 },
      };

      const sanitized = sanitizeDrillDownContext(rogueDrillDown);
      expect((sanitized as any).unauthorizedRawDatabaseDump).toBeUndefined();
      expect((sanitized as any).executiveFinancialScorecard).toBeUndefined();
      expect(Object.keys(sanitized)).toHaveLength(0);
    });
  });

  describe('validateAiContextSize', () => {
    it('returns valid: true for payloads under limit', () => {
      const small = { kpi: 100, label: 'Sales' };
      const res = validateAiContextSize(small, 20);
      expect(res.valid).toBe(true);
      expect(res.sizeBytes).toBeLessThan(20 * 1024);
    });

    it('returns valid: false for payloads over limit', () => {
      const hugeString = 'x'.repeat(25 * 1024);
      const large = { data: hugeString };
      const res = validateAiContextSize(large, 20);
      expect(res.valid).toBe(false);
      expect(res.sizeBytes).toBeGreaterThan(20 * 1024);
    });
  });

  describe('sanitizeHistoryText', () => {
    it('redacts emails, phone numbers, and credit cards from user/model history text', () => {
      const dirtyHistory = 'My email is ceo@mas.com and my phone is 01012345678 and card 4111 2222 3333 4444.';
      const cleanHistory = sanitizeHistoryText(dirtyHistory);

      expect(cleanHistory).not.toContain('ceo@mas.com');
      expect(cleanHistory).not.toContain('01012345678');
      expect(cleanHistory).not.toContain('4111 2222 3333 4444');
      expect(cleanHistory).toContain('[EMAIL_REDACTED]');
      expect(cleanHistory).toContain('[PHONE_REDACTED]');
      expect(cleanHistory).toContain('[CARD_REDACTED]');
    });
  });
});
