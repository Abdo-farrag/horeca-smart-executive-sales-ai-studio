import { describe, it, expect } from 'vitest';
import {
  getSmartSuggestedQuestions,
  getAllAvailableQuestions,
  getSuggestedFollowUps,
  buildScopeBadgeLabel,
  getAnalysisBadgeLabel,
  AI_QUESTIONS_CATALOG,
  AI_QUESTION_CATEGORIES,
} from '../aiQuestionsPack';
import { GlobalFilterState } from '../../../types';

describe('Phase 5 — AI Questions Pack & Suggestion Engine', () => {
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

  // Test 1: No customer/product -> 4 to 6 suggestions
  it('1. Returns 4 to 6 suggestions when no customer/product is selected', () => {
    const suggestions = getSmartSuggestedQuestions(baseFilters);
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions.some((s) => s.targetIntent === 'EXECUTIVE_SUMMARY')).toBe(true);
    expect(suggestions.some((s) => s.targetIntent === 'DECLINING_CUSTOMERS')).toBe(true);
  });

  // Test 2: Customer selected -> customer drill-down questions prioritized
  it('2. Prioritizes customer drill-down questions when customerId is present', () => {
    const customerFilters: GlobalFilterState = {
      ...baseFilters,
      customerId: 30709,
      customerName: 'Four Seasons Hotel',
    };

    const suggestions = getSmartSuggestedQuestions(customerFilters);
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions.some((s) => s.id === 'cust-drill-down')).toBe(true);
    expect(suggestions.some((s) => s.id === 'order-cust-recent')).toBe(true);
    expect(suggestions.some((s) => s.id === 'cust-stopped-products')).toBe(true);
  });

  // Test 3: Product selected -> product questions prioritized
  it('3. Prioritizes product questions when productId is present', () => {
    const productFilters: GlobalFilterState = {
      ...baseFilters,
      productId: 8516,
      productName: 'Juhayna Milk',
    };

    const suggestions = getSmartSuggestedQuestions(productFilters);
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions.some((s) => s.id === 'prod-drill-down')).toBe(true);
    expect(suggestions.some((s) => s.id === 'prod-top-customers')).toBe(true);
  });

  // Test 4: Salesperson selected -> rep and recovery questions prioritized
  it('4. Prioritizes sales rep and recovery questions when salesperson is selected', () => {
    const repFilters: GlobalFilterState = {
      ...baseFilters,
      salespersonName: 'Haddil Haron',
    };

    const suggestions = getSmartSuggestedQuestions(repFilters);
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions.some((s) => s.id === 'rep-top' || s.id === 'rep-compare')).toBe(true);
    expect(suggestions.some((s) => s.id === 'cust-declining')).toBe(true);
  });

  // Test 5: Geography selected -> geography compatible questions
  it('5. Returns geography-compatible questions when governorate or area is selected', () => {
    const geoFilters: GlobalFilterState = {
      ...baseFilters,
      governorateName: 'Giza',
      governorateCode: 'GZ',
    };

    const suggestions = getSmartSuggestedQuestions(geoFilters);
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions.some((s) => s.id === 'sales-summary')).toBe(true);
    expect(suggestions.some((s) => s.id === 'cust-declining')).toBe(true);
  });

  // Test 6: Customer + Product -> only supported relationship / entity questions
  it('6. Returns supported customer and product questions when both are selected', () => {
    const bothFilters: GlobalFilterState = {
      ...baseFilters,
      customerId: 30709,
      customerName: 'Four Seasons Hotel',
      productId: 8516,
      productName: 'Juhayna Milk',
    };

    const suggestions = getSmartSuggestedQuestions(bothFilters);
    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions.some((s) => s.id === 'cust-drill-down')).toBe(true);
    expect(suggestions.some((s) => s.id === 'prod-drill-down')).toBe(true);
  });

  // Test 7: No customer -> customer-required shortcuts excluded
  it('7. Excludes customer-required shortcuts when no customer is selected', () => {
    const suggestions = getSmartSuggestedQuestions(baseFilters);
    for (const s of suggestions) {
      expect(s.requiresCustomer).not.toBe(true);
    }
  });

  // Test 8: No product -> product-required shortcuts excluded
  it('8. Excludes product-required shortcuts when no product is selected', () => {
    const suggestions = getSmartSuggestedQuestions(baseFilters);
    for (const s of suggestions) {
      expect(s.requiresProduct).not.toBe(true);
    }
  });

  // Test 9: Cross-sell + salesperson -> excluded
  it('9. Excludes cross-sell when salesperson filter is active', () => {
    const repFilters: GlobalFilterState = {
      ...baseFilters,
      customerId: 30709,
      salespersonName: 'Haddil Haron',
    };

    const suggestions = getSmartSuggestedQuestions(repFilters);
    expect(suggestions.some((s) => s.id === 'rec-cross-sell')).toBe(false);

    const fullCatalog = getAllAvailableQuestions(repFilters);
    expect(fullCatalog.RECOVERY_GROWTH.some((s) => s.id === 'rec-cross-sell')).toBe(false);
  });

  // Test 10: Cross-sell + governorate -> excluded
  it('10. Excludes cross-sell when governorate filter is active', () => {
    const govFilters: GlobalFilterState = {
      ...baseFilters,
      customerId: 30709,
      governorateName: 'Giza',
    };

    const suggestions = getSmartSuggestedQuestions(govFilters);
    expect(suggestions.some((s) => s.id === 'rec-cross-sell')).toBe(false);

    const fullCatalog = getAllAvailableQuestions(govFilters);
    expect(fullCatalog.RECOVERY_GROWTH.some((s) => s.id === 'rec-cross-sell')).toBe(false);
  });

  // Test 11: Cross-sell + area -> excluded
  it('11. Excludes cross-sell when area filter is active', () => {
    const areaFilters: GlobalFilterState = {
      ...baseFilters,
      customerId: 30709,
      areaName: 'Dokki',
    };

    const suggestions = getSmartSuggestedQuestions(areaFilters);
    expect(suggestions.some((s) => s.id === 'rec-cross-sell')).toBe(false);

    const fullCatalog = getAllAvailableQuestions(areaFilters);
    expect(fullCatalog.RECOVERY_GROWTH.some((s) => s.id === 'rec-cross-sell')).toBe(false);
  });

  // Test 12: getAllAvailableQuestions -> exactly 6 category groups
  it('12. getAllAvailableQuestions returns exactly 6 category groups', () => {
    const fullCatalog = getAllAvailableQuestions(baseFilters);
    const keys = Object.keys(fullCatalog);
    expect(keys).toHaveLength(6);
    expect(keys).toContain('SALES');
    expect(keys).toContain('CUSTOMERS');
    expect(keys).toContain('PRODUCTS');
    expect(keys).toContain('SALES_REPS');
    expect(keys).toContain('RECOVERY_GROWTH');
    expect(keys).toContain('ORDERS');
  });

  // Test 13: All shortcut IDs unique
  it('13. All shortcut IDs across catalog are unique', () => {
    const ids = AI_QUESTIONS_CATALOG.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // Test 14: Every shortcut has valid targetIntent
  it('14. Every shortcut has a non-empty targetIntent and textAr', () => {
    for (const q of AI_QUESTIONS_CATALOG) {
      expect(q.id).toBeDefined();
      expect(q.textAr).toBeDefined();
      expect(q.textAr.trim().length).toBeGreaterThan(0);
      expect(q.targetIntent).toBeDefined();
      expect(q.category).toBeDefined();
    }
  });

  // Test 15: Smart suggestions max = 6
  it('15. Smart suggestions count is capped at 6 across all filter variations', () => {
    expect(getSmartSuggestedQuestions(baseFilters).length).toBeLessThanOrEqual(6);
    expect(getSmartSuggestedQuestions({ ...baseFilters, customerId: 10 }).length).toBeLessThanOrEqual(6);
    expect(getSmartSuggestedQuestions({ ...baseFilters, productId: 20 }).length).toBeLessThanOrEqual(6);
    expect(getSmartSuggestedQuestions({ ...baseFilters, salespersonName: 'Ahmed' }).length).toBeLessThanOrEqual(6);
  });

  // Test 16: Follow-ups max = 4
  it('16. Follow-up suggestions count is capped at 4 across all responded intents', () => {
    const intents = [
      'CUSTOMER_ANALYSIS',
      'CUSTOMER_PRODUCT_HISTORY',
      'DECLINING_CUSTOMERS',
      'LOST_CUSTOMERS',
      'PRODUCT_ANALYSIS',
      'PRODUCT_CUSTOMERS',
      'SALES_REPS',
      'EXECUTIVE_SUMMARY',
      'SALES_PERFORMANCE',
      'RETENTION',
      'RISK',
      'PRODUCT_PERFORMANCE',
      'CUSTOMER_RECENT_ORDERS',
    ] as const;

    for (const intent of intents) {
      const followUps = getSuggestedFollowUps({ intent, filters: baseFilters });
      expect(followUps.length).toBeGreaterThanOrEqual(1);
      expect(followUps.length).toBeLessThanOrEqual(4);
      for (const fu of followUps) {
        expect(fu.id).toBeDefined();
        expect(fu.textAr).toBeDefined();
        expect(fu.targetIntent).toBeDefined();
      }
    }
  });

  // Test 17: Scope badge formatting uses human-readable labels and zero IDs
  it('17. buildScopeBadgeLabel builds human-readable labels without IDs', () => {
    const label = buildScopeBadgeLabel({
      ...baseFilters,
      companyName: 'MAS',
      governorateName: 'القاهرة',
      dateRange: { label: 'أغسطس 2026', startDate: '2026-08-01', endDate: '2026-08-09', preset: 'current_mtd' },
    });

    expect(label).toContain('MAS');
    expect(label).toContain('القاهرة');
    expect(label).toContain('أغسطس 2026');
    expect(label).not.toContain('30709');
    expect(label).not.toContain('customerId');
  });

  // Test 18: Analysis badges map correctly to Arabic display strings
  it('18. getAnalysisBadgeLabel returns clear executive Arabic badge labels', () => {
    expect(getAnalysisBadgeLabel('CUSTOMER_ANALYSIS')).toBe('تحليل عميل');
    expect(getAnalysisBadgeLabel('CUSTOMER_RECENT_ORDERS')).toBe('تفاصيل أوردرات');
    expect(getAnalysisBadgeLabel('CUSTOMER_PRODUCT_HISTORY')).toBe('تحليل مشتريات العميل');
    expect(getAnalysisBadgeLabel('PRODUCT_ANALYSIS')).toBe('تحليل منتج');
    expect(getAnalysisBadgeLabel('PRODUCT_CUSTOMERS')).toBe('عملاء المنتج');
    expect(getAnalysisBadgeLabel('LOST_CUSTOMERS')).toBe('استعادة عملاء');
    expect(getAnalysisBadgeLabel('DECLINING_CUSTOMERS')).toBe('عملاء متراجعين');
    expect(getAnalysisBadgeLabel('RISK')).toBe('مخاطر العملاء');
    expect(getAnalysisBadgeLabel('EXECUTIVE_SUMMARY')).toBe('تحليل تنفيذي');
  });
});
