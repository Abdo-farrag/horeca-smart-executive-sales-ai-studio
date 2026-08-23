import { GlobalFilterState } from '../contracts/appTypes';
import { ExecutiveAIContext } from '../contracts/ai';
import { getEffectiveFilterParams } from '../filters/filterUtils';
import { analytics } from '../analytics';

export async function buildExecutiveAIContext(filters: GlobalFilterState): Promise<ExecutiveAIContext> {
  const effective = getEffectiveFilterParams(filters);
  const month = effective.effectiveStartDate ? effective.effectiveStartDate.slice(0, 7) + '-01' : '2026-08-01';

  // Concurrently fetch executive-level aggregates from analytics SDK
  const [
    kpisRes,
    freshnessRes,
    retentionRes,
    riskDistRes,
    salesRepsRes,
    productsRes,
    govRes,
  ] = await Promise.allSettled([
    analytics.sales.executive({
      startDate: effective.effectiveStartDate,
      endDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
    }),
    analytics.sales.freshness(),
    analytics.customers.retention({
      month,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
    }),
    analytics.customers.riskDistribution({
      asOfDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
    }),
    analytics.salesReps.summary({
      month,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
    }),
    analytics.products.summary({
      startDate: effective.effectiveStartDate,
      endDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salesperson: effective.salespersonName,
      governorateCode: effective.governorateCode,
      areaCode: effective.areaCode,
      customerId: effective.customerId,
      productId: effective.productId,
      limit: 10,
    }),
    analytics.filters.governorates({
      startDate: effective.effectiveStartDate,
      endDate: effective.effectiveEndDate,
      companyId: effective.companyId,
      salespersonName: effective.salespersonName,
    }),
  ]);

  const kpi = kpisRes.status === 'fulfilled' && kpisRes.value.length > 0 ? kpisRes.value[0] : null;
  const freshness = freshnessRes.status === 'fulfilled' && freshnessRes.value.length > 0 ? freshnessRes.value[0] : null;
  const retention = retentionRes.status === 'fulfilled' && retentionRes.value.length > 0 ? retentionRes.value[0] : null;
  const riskList = riskDistRes.status === 'fulfilled' ? riskDistRes.value : [];
  const repList = salesRepsRes.status === 'fulfilled' ? salesRepsRes.value : [];
  const productList = productsRes.status === 'fulfilled' ? productsRes.value : [];
  const govList = govRes.status === 'fulfilled' ? govRes.value : [];

  // Risk distribution aggregate rollup
  let riskDistribution: ExecutiveAIContext['riskDistribution'] = null;
  if (riskList.length > 0) {
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let totalRecoveryOpportunityEgp = 0;

    for (const r of riskList) {
      const level = (r.riskLevel || '').toUpperCase();
      if (level === 'HIGH' || level === 'CRITICAL') {
        highRiskCount += r.customersCount;
      } else if (level === 'MEDIUM' || level === 'MED') {
        mediumRiskCount += r.customersCount;
      } else {
        lowRiskCount += r.customersCount;
      }
      totalRecoveryOpportunityEgp += r.recoveryOpportunity || 0;
    }

    riskDistribution = {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      totalRecoveryOpportunityEgp,
    };
  }

  // Top Sales Reps (aggregated league table, max 5)
  const topSalesRepsAggregate = repList
    .slice(0, 5)
    .map((r) => ({
      salesperson: r.salesperson,
      companyName: r.companyName,
      salesValue: r.salesValue,
      ordersCount: r.ordersCount,
      activeCustomers: r.activeCustomers,
      retentionRate: r.retentionRate != null ? r.retentionRate : null,
    }));

  // Top Products (aggregated league table, max 5)
  const topProductsAggregate = productList
    .slice(0, 5)
    .map((p) => ({
      productName: p.productName,
      categoryName: p.productCategory ?? null,
      salesValue: p.salesValue,
      quantitySold: p.quantitySold,
      uniqueCustomersCount: p.uniqueCustomers,
    }));

  // Geography Aggregate (max 5)
  const geographyAggregate = govList
    .slice(0, 5)
    .map((g) => ({
      governorate: g.governorateNameAr || g.governorateCode,
      salesValue: g.salesValue,
      ordersCount: g.ordersCount,
    }));

  const customerFilterActive = Boolean(
    effective.customerId != null || (filters.customerName && filters.customerName.trim().length > 0)
  );

  const context: ExecutiveAIContext = {
    metadata: {
      generatedAt: new Date().toISOString(),
      dataFreshnessDate: freshness?.maxOrderDate || effective.effectiveEndDate,
      operatingCurrency: 'EGP',
    },
    activeFilters: {
      dateRangeLabel: filters.dateRange?.label || filters.periodMode || 'Custom',
      effectiveStartDate: effective.effectiveStartDate,
      effectiveEndDate: effective.effectiveEndDate,
      companyName: effective.companyName,
      salespersonName: effective.salespersonName,
      governorateName: effective.governorateName,
      areaName: effective.areaName,
      customerFilterActive,
      productName: effective.productName,
    },
    salesKpis: {
      totalSales: kpi?.salesValue ?? 0,
      confirmedOrders: kpi?.ordersCount ?? 0,
      activeCustomers: kpi?.activeCustomers ?? 0,
      averageOrderValue: kpi?.averageOrderValue ?? 0,
      revenueGrowthPct: kpi?.revenueGrowthPct != null ? kpi.revenueGrowthPct : null,
      previousPeriodSales: kpi?.previousSalesValue != null ? kpi.previousSalesValue : null,
    },
    retentionSummary: retention
      ? {
          previousActiveCustomers: retention.previousActiveCustomers,
          retainedWithSameRep: retention.retainedWithSameRep,
          transferredCustomers: retention.transferredCustomers,
          trueLostCustomers: retention.trueLostCustomers,
          newCustomers: retention.newCustomers,
          companyRetentionRate: retention.companyRetentionRate,
          sameRepRetentionRate: retention.sameRepRetentionRate,
          lostCustomerRevenueEgp: retention.lostCustomerRevenueEgp,
        }
      : null,
    riskDistribution,
    topSalesRepsAggregate: topSalesRepsAggregate.length > 0 ? topSalesRepsAggregate : undefined,
    topProductsAggregate: topProductsAggregate.length > 0 ? topProductsAggregate : undefined,
    geographyAggregate: geographyAggregate.length > 0 ? geographyAggregate : undefined,
  };

  return context;
}
