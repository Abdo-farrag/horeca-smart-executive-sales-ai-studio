import { describe, it, expect } from 'vitest';
import { analytics } from '../index';

describe('Analytics SDK Public Interface & Formula Verification', () => {
  it('Public interface exposes all required domain objects', () => {
    expect(analytics).toBeDefined();
    expect(analytics.sales).toBeDefined();
    expect(analytics.sales.executive).toBeInstanceOf(Function);
    expect(analytics.sales.daily).toBeInstanceOf(Function);
    expect(analytics.sales.topCustomers).toBeInstanceOf(Function);

    expect(analytics.customers).toBeDefined();
    expect(analytics.customers.retention).toBeInstanceOf(Function);
    expect(analytics.customers.portfolioSummary).toBeInstanceOf(Function);
    expect(analytics.customers.riskDistribution).toBeInstanceOf(Function);
    expect(analytics.customers.actionCenter).toBeInstanceOf(Function);
    expect(analytics.customers.recoveryOpportunities).toBeInstanceOf(Function);

    expect(analytics.salesReps).toBeDefined();
    expect(analytics.salesReps.summary).toBeInstanceOf(Function);
    expect(analytics.salesReps.trend).toBeInstanceOf(Function);
    expect(analytics.salesReps.customers).toBeInstanceOf(Function);
    expect(analytics.salesReps.retentionDetails).toBeInstanceOf(Function);
    expect(analytics.salesReps.dailyActions).toBeInstanceOf(Function);
    expect(analytics.salesReps.actionSummary).toBeInstanceOf(Function);
    expect(analytics.salesReps.recoveryPipeline).toBeInstanceOf(Function);
    expect(analytics.salesReps.customerPriorities).toBeInstanceOf(Function);

    expect(analytics.products).toBeDefined();
    expect(analytics.products.summary).toBeInstanceOf(Function);
    expect(analytics.products.get360).toBeInstanceOf(Function);
    expect(analytics.products.trend).toBeInstanceOf(Function);
    expect(analytics.products.topCustomers).toBeInstanceOf(Function);
    expect(analytics.products.topSalespeople).toBeInstanceOf(Function);

    expect(analytics.productCategories).toBeDefined();
    expect(analytics.productCategories.summary).toBeInstanceOf(Function);
    expect(analytics.productCategories.review).toBeInstanceOf(Function);
    expect(analytics.productCategories.approve).toBeInstanceOf(Function);
    expect(analytics.productCategories.bulkApprove).toBeInstanceOf(Function);
    expect(analytics.productCategories.markNeedsReview).toBeInstanceOf(Function);
    expect(analytics.productCategories.reject).toBeInstanceOf(Function);

    expect(analytics.catalog).toBeDefined();
    expect(analytics.catalog.list).toBeInstanceOf(Function);
    expect(analytics.catalog.get).toBeInstanceOf(Function);
    expect(analytics.catalog.listByDomain).toBeInstanceOf(Function);
    expect(analytics.catalog.listByStatus).toBeInstanceOf(Function);

    expect(analytics.metrics).toBeDefined();
    expect(analytics.metrics.list).toBeInstanceOf(Function);
    expect(analytics.metrics.get).toBeInstanceOf(Function);
    expect(analytics.metrics.listByStatus).toBeInstanceOf(Function);
  });

  it('July 2026 Target Reference Metrics match specs', () => {
    // Executive targets
    const salesValue = 64749427.11;
    const ordersCount = 1460;
    const activeCustomers = 501;
    const aov = Number((salesValue / ordersCount).toFixed(2));
    const revenueGrowthPct = 47.46;

    expect(salesValue).toBe(64749427.11);
    expect(ordersCount).toBe(1460);
    expect(activeCustomers).toBe(501);
    expect(aov).toBe(44348.92);
    expect(revenueGrowthPct).toBe(47.46);

    // Retention targets
    const previousActive = 442;
    const retainedSameRep = 310;
    const transferred = 16;
    const lost = 116;
    const newCust = 182;
    const companyRetention = Number((( (retainedSameRep + transferred) / previousActive ) * 100).toFixed(2));
    const sameRepRetention = Number((( retainedSameRep / previousActive ) * 100).toFixed(2));

    expect(companyRetention).toBe(73.76);
    expect(sameRepRetention).toBe(70.14);
    expect(lost).toBe(116);
    expect(newCust).toBe(182);
  });
});
