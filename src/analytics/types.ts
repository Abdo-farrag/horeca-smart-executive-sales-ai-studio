export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsFilters {
  companyName?: string | null;
  salesperson?: string | null;
}

export interface PaginationInput {
  limit?: number;
  offset?: number;
}

export interface MonthInput {
  month: string;
}

export type RetentionStatus =
  | 'RETAINED'
  | 'LOST'
  | 'TRANSFERRED'
  | 'NEW_IN_WINDOW';

export type AnalyticsObjectStatus =
  | 'validated'
  | 'live'
  | 'pending_data_quality'
  | 'pending_live_source'
  | 'deprecated';

export interface ExecutiveKpisResult {
  salesValue: number;
  ordersCount: number;
  activeCustomers: number;
  averageOrderValue: number;
  previousSalesValue: number;
  revenueGrowthPct: number;
  minOrderDate?: string | null;
  maxOrderDate?: string | null;
  lastSourceUpdate?: string | null;
}

export interface DailySalesSummaryResult {
  orderDate: string;
  horecaSales: number;
  masSales: number;
  totalSales: number;
  ordersCount: number;
}

export interface TopCustomerResult {
  customerId: number | string;
  customerName: string;
  companyName: string;
  ordersCount: number;
  salesValue: number;
  averageOrderValue: number;
  lastOrderAt: string;
  primarySalesperson: string;
}

export interface CustomerRetentionSummaryResult {
  previousActiveCustomers: number;
  retainedWithSameRep: number;
  transferredCustomers: number;
  trueLostCustomers: number;
  newCustomers: number;
  companyRetentionRate: number;
  sameRepRetentionRate: number;
  lostCustomerRevenueEgp: number;
}

export interface SalesRepSummaryResult {
  orderMonth: string;
  companyName: string;
  salesperson: string;
  activeCustomers: number;
  ordersCount: number;
  salesValue: number;
  averageOrderValue: number;
  previousCustomers: number;
  retainedCustomers: number;
  lostCustomers: number;
  transferredOutCustomers: number;
  transferredInCustomers: number;
  newCustomers: number;
  reactivatedCustomers: number;
  lostPreviousSales: number;
  retentionRate: number | null;
}

export interface SalesRepTrendResult {
  orderMonth: string;
  companyName: string;
  salesperson: string;
  activeCustomers: number;
  ordersCount: number;
  salesValue: number;
  averageOrderValue: number;
  retentionRate: number | null;
  lostCustomers: number;
  newCustomers: number;
}

export interface SalesRepCustomerResult {
  companyName: string;
  salesperson: string;
  customerId: number | string;
  customerName: string;
  ordersCount: number;
  salesValue: number;
  averageOrderValue: number;
  firstOrderAt: string;
  lastOrderAt: string;
}

export interface SalesRepRetentionDetailResult {
  companyName: string;
  customerId: number | string;
  customerName: string;
  previousSalesperson: string | null;
  currentSalesperson: string | null;
  previousOrders: number;
  currentOrders: number;
  previousSales: number;
  currentSales: number;
  retentionStatus: RetentionStatus | string;
  salesChangePct: number;
  previousLastOrderAt: string | null;
  currentLastOrderAt: string | null;
}

export interface DailySalesRepPerformanceRow {
  reportDate: string;
  salesperson: string;
  companyName: string;
  ordersCount: number;
  uniqueCustomers: number;
  salesValue: number;
  averageOrderValue: number | null;
  ordersRank: number;
}

export interface DailySalesRepPerformanceParams {
  date?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
}

export interface DailySalesRepKpisResult {
  requestedDate: string;
  reportDate: string;
  ordersCount: number;
  uniqueCustomers: number;
  activeSalespeople: number;
  representativeCompanyRows: number;
  salesValue: number;
  averageOrderValue: number;
}

export interface SalesRepDailyActionsParams {
  asOfDate?: string | null;
  salesperson?: string | null;
  companyName?: string | null;
  priority?: string | null;
  actionType?: string | null;
  risk?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface SalesRepDailyActionResult {
  actionRank: number;
  customerId: number;
  customerName: string;
  companyName: string;
  salesperson: string;
  priority: string;
  actionType: string;
  actionReason: string;
  risk: string;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  medianBuyingInterval: number;
  previous30dSales: number;
  recent30dSales: number;
  salesChangePct: number | null;
  recoveryOpportunity: number;
}

export interface SalesRepActionSummaryParams {
  asOfDate?: string | null;
  salesperson?: string | null;
  companyName?: string | null;
}

export interface SalesRepActionSummaryResult {
  totalCustomers: number;
  actionableCustomers: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  winBackCustomers: number;
  decliningCustomers: number;
  overdueCustomers: number;
  transferReviewCustomers: number;
  totalRecoveryOpportunity: number;
  highPriorityRecoveryOpportunity: number;
  previous30dSales: number;
  recent30dSales: number;
}

export interface SalesRepRecoveryPipelineParams {
  asOfDate?: string | null;
  salesperson?: string | null;
  companyName?: string | null;
  limit?: number | null;
}

export interface SalesRepRecoveryPipelineResult {
  customerId: number;
  customerName: string;
  companyName: string;
  salesperson: string;
  priority: string;
  actionType: string;
  previous30dSales: number;
  recent30dSales: number;
  salesGap: number;
  salesChangePct: number | null;
  daysSinceLastOrder: number;
  recoveryOpportunity: number;
}

export interface SalesRepCustomerPrioritiesParams {
  asOfDate?: string | null;
  salesperson?: string | null;
  companyName?: string | null;
}

export interface SalesRepCustomerPrioritiesResult {
  priority: string;
  customersCount: number;
  customersPct: number;
  recoveryOpportunity: number;
}

export interface DataFreshnessResult {
  maxOrderDate: string | null;
  maxSourceUpdatedAt: string | null;
  lastSuccessfulSalesSyncStartedAt: string | null;
  lastSuccessfulSalesSyncFinishedAt: string | null;
  lastSalesSyncRowsCount: number;
  lastFailedFullSyncStartedAt: string | null;
  lastFailedFullSyncMessage: string | null;
}

export interface CatalogObject {
  objectName: string;
  objectType: string;
  domain: string;
  description: string;
  status: AnalyticsObjectStatus | string;
  refreshFrequency?: string | null;
  primaryKey?: string | null;
  dateField?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CustomerSummaryResult {
  customerId: number;
  customerName: string;
  companyName: string;
  primarySalesperson: string;
  ordersCount: number;
  salesValue: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  customerStatus: string;
  previousPeriodSales: number;
  salesChangePct: number | null;
}

export interface CustomerSummaryParams {
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
  status?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface Customer360Result {
  customerId: number;
  customerName: string;
  companyName: string;
  currentSalesperson: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  city: string | null;
  periodOrders: number;
  periodSales: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  averageDaysBetweenOrders: number;
  lifetimeOrders: number;
  lifetimeSales: number;
  uniqueProductsCount: number;
  customerStatus: string;
}

export interface ProductSummaryResult {
  productId: number;
  productName: string;
  productCategory: string | null;
  ordersCount: number;
  uniqueCustomers: number;
  quantitySold: number;
  salesValue: number;
  averageUnitValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  activeSalespeople: number;
  companiesCount: number;
}

export interface ProductSummaryParams {
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
  governorateCode?: string | null;
  areaCode?: string | null;
  customerId?: number | null;
  productId?: number | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface Product360Result {
  productId: number;
  productName: string;
  productCategory: string | null;
  periodSales: number;
  periodQuantity: number;
  periodOrders: number;
  periodCustomers: number;
  periodSalespeople: number;
  periodCompanies: number;
  averageUnitValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  lifetimeSales: number;
  lifetimeQuantity: number;
  lifetimeOrders: number;
  lifetimeCustomers: number;
  lifetimeFirstOrderDate?: string | null;
  lifetimeLastOrderDate?: string | null;
}

export interface Product360Params {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface ProductTrendResult {
  orderMonth: string;
  salesValue: number;
  quantitySold: number;
  ordersCount: number;
  uniqueCustomers: number;
  averageUnitValue: number;
}

export interface ProductTrendParams {
  productId: number;
  companyName?: string | null;
}

export interface ProductDailyTrendParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface ProductDailyTrendResult {
  reportDate: string;
  ordersCount: number;
  customersCount: number;
  quantitySold: number;
  salesValue: number;
  averageUnitValue: number;
}

export interface ProductCompanySplitParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ProductCompanySplitResult {
  companyName: string;
  ordersCount: number;
  customersCount: number;
  quantitySold: number;
  salesValue: number;
  salesSharePct: number;
}

export interface ProductLifecycleParams {
  productId: number;
}

export interface ProductLifecycleResult {
  firstSaleDate: string | null;
  lastSaleDate: string | null;
  daysSinceLastSale: number;
  lifetimeOrders: number;
  lifetimeCustomers: number;
  lifetimeQuantity: number;
  lifetimeSales: number;
  activeMonths: number;
  averageDaysBetweenSales: number;
}

export interface ProductDataQualityParams {
  productId: number;
}

export interface ProductDataQualityResult {
  productId: number;
  productName: string;
  internalReference: string | null;
  barcode: string | null;
  categoryName: string | null;
  cost: number | null;
  salePrice: number | null;
  productType: string | null;
  isActive: boolean;
  hasName: boolean;
  hasInternalReference: boolean;
  hasBarcode: boolean;
  hasCategory: boolean;
  hasCost: boolean;
  hasSalePrice: boolean;
  qualityScore: number;
}

export interface ProductAlertsParams {
  productId: number;
  asOfDate?: string | null;
  companyName?: string | null;
}

export interface ProductAlertResult {
  alertCode: 'NO_RECENT_SALES' | 'SALES_DROP' | 'SALES_SURGE' | 'LOW_REP_COVERAGE' | string;
  severity: 'high' | 'medium' | 'low' | 'info' | string;
  titleAr: string;
  detailsAr: string;
  metricValue: number | null;
}

export interface ProductScoreParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface ProductScoreResult {
  salesStrengthScore: number;
  growthScore: number;
  coverageScore: number;
  consistencyScore: number;
  dataQualityScore: number;
  totalScore: number;
  methodologyVersion: string;
}

export interface ProductReconciliationParams {
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface ProductReconciliationResult {
  orderSales: number;
  productLineSales: number;
  differenceValue: number;
  reconciliationPct: number;
  status: 'verified' | 'mismatch' | string;
}

export interface ProductTopCustomerResult {
  customerId: number;
  customerName: string;
  companyName: string;
  ordersCount: number;
  quantitySold: number;
  salesValue: number;
  lastOrderDate: string | null;
  primarySalesperson: string | null;
}

export interface ProductTopCustomerParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface ProductTopSalespersonResult {
  salesperson: string;
  companyName: string;
  ordersCount: number;
  uniqueCustomers: number;
  quantitySold: number;
  salesValue: number;
  averageOrderValue: number;
}

export interface ProductTopSalespersonParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface ProductCustomerRetentionParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface ProductCustomerRetentionResult {
  customerId: number;
  customerName: string;
  companyName: string;
  primarySalesperson: string | null;
  previousOrders: number;
  currentOrders: number;
  previousQuantity: number;
  currentQuantity: number;
  previousSales: number;
  currentSales: number;
  salesChangePct: number;
  previousLastOrder: string | null;
  currentLastOrder: string | null;
  status: 'RETAINED' | 'NEW_TO_PRODUCT' | 'STOPPED_BUYING' | 'DECLINING' | string;
  recoveryPriority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
}

export interface ProductCustomerRetentionSummaryParams {
  productId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface ProductCustomerRetentionSummaryResult {
  previousCustomers: number;
  currentCustomers: number;
  retainedCustomers: number;
  newToProductCustomers: number;
  stoppedBuyingCustomers: number;
  decliningCustomers: number;
  previousSales: number;
  currentSales: number;
  stoppedSalesOpportunity: number;
  decliningSalesGap: number;
  retentionRate: number;
}

export interface Customer360Params {
  customerId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface CustomerTrendResult {
  orderMonth: string;
  ordersCount: number;
  salesValue: number;
  averageOrderValue: number;
  activeSalespeople: number;
}

export interface CustomerTrendParams {
  customerId: number;
  companyName?: string | null;
}

export interface CustomerOrderResult {
  orderId: number;
  orderName: string;
  orderDate: string;
  companyName: string;
  salesperson: string;
  orderValue: number;
  linesCount: number;
  productsCount: number;
  totalQty: number;
}

export interface CustomerOrderParams {
  customerId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CustomerBuyingFrequencyParams {
  customerId: number;
  companyName?: string | null;
}

export interface CustomerBuyingFrequencyResult {
  ordersCount: number;
  activeDays: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  averageDaysBetweenOrders: number;
  medianDaysBetweenOrders: number;
  daysSinceLastOrder: number;
  expectedNextOrderDate: string | null;
  frequencyStatus: 'ON_TIME' | 'LATE' | 'OVERDUE' | 'INSUFFICIENT_HISTORY' | 'NO_ACTIVITY' | string;
}

export interface CustomerFavoriteProductsParams {
  customerId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  limit?: number | null;
}

export interface CustomerFavoriteProductsResult {
  productId: number;
  productName: string;
  ordersCount: number;
  quantity: number;
  salesValue: number;
  salesSharePct: number;
  lastOrderDate: string | null;
  primarySalesperson: string | null;
}

export interface CustomerSalespersonHistoryParams {
  customerId: number;
  companyName?: string | null;
}

export interface CustomerSalespersonHistoryResult {
  orderMonth: string;
  salespersonName: string;
  ordersCount: number;
  salesValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  isPrimary: boolean;
}

export interface CustomerRiskParams {
  customerId: number;
  companyName?: string | null;
}

export interface CustomerRiskResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'LOST' | 'NO_HISTORY' | string;
  riskReason: string;
  recoveryPriority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  medianBuyingInterval: number;
  recent30DaySales: number;
  previous30DaySales: number;
  salesChangePct: number;
}

export interface CustomerProductDropoffParams {
  customerId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
}

export interface CustomerProductDropoffResult {
  productId: number;
  productName: string;
  previousSales: number;
  currentSales: number;
  previousQuantity: number;
  currentQuantity: number;
  salesChangePct: number;
  status: 'STOPPED_BUYING' | 'DECLINING' | 'NEW_PRODUCT' | 'STABLE_OR_GROWING' | string;
  recoveryValue: number;
}

export interface CustomerCrossSellCandidatesParams {
  customerId: number;
  startDate?: string | null;
  endDate?: string | null;
  companyName?: string | null;
  limit?: number | null;
}

export interface CustomerCrossSellCandidatesResult {
  productId: number;
  productName: string;
  peerCustomersCount: number;
  peerOrdersCount: number;
  peerSalesValue: number;
  affinityScore: number;
}

export interface MetricItem {
  metricCode: string;
  metricNameAr: string;
  metricNameEn: string;
  domain: string;
  description: string;
  status: AnalyticsObjectStatus | string;
  calculationFormula?: string | null;
  unit?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type MappingStatus = 'needs_review' | 'suggested' | 'approved' | 'rejected';

export interface ProductCategoryMappingSummaryResult {
  totalProducts: number;
  approvedProducts: number;
  suggestedProducts: number;
  needsReviewProducts: number;
  rejectedProducts: number;
  approvedCoveragePct: number;
  suggestedOrApprovedCoveragePct: number;
}

export interface ProductCategoryMappingReviewResult {
  productId: number;
  productName: string;
  internalReference: string | null;
  mappingStatus: MappingStatus;
  suggestedCategoryCode: string | null;
  suggestedCategoryNameAr: string | null;
  suggestedCategoryNameEn: string | null;
  suggestionConfidence: number;
  suggestionReason: string | null;
  approvedCategoryCode: string | null;
  approvedCategoryNameAr: string | null;
  approvedCategoryNameEn: string | null;
  approvedAt: string | null;
  sourceUpdatedAt: string | null;
  updatedAt: string | null;
}

export interface ProductCategoryMappingReviewParams {
  status?: MappingStatus | null;
  categoryCode?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CategoryMasterItem {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  isActive: boolean;
  displayOrder: number;
}

// ==================== Sprint C2 Customer Action Center Types ====================

export interface CustomerPortfolioSummaryParams {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
}

export interface CustomerPortfolioSummaryResult {
  totalCustomers: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  winBackCustomers: number;
  decliningCustomers: number;
  overdueCustomers: number;
  salespersonTransferReviews: number;
  totalRecoveryOpportunity: number;
  highPriorityRecoveryOpportunity: number;
}

export interface CustomerRiskDistributionParams {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
}

export interface CustomerRiskDistributionResult {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'LOST' | string;
  customersCount: number;
  customersPct: number;
  recoveryOpportunity: number;
}

export interface CustomerActionCenterParams {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
  priority?: string | null;
  actionType?: string | null;
  risk?: string | null;
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
}

export interface CustomerActionCenterResult {
  customerId: number;
  customerName: string;
  companyName: string;
  salesperson: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  actionType: 'REACTIVATE_LOST' | 'WIN_BACK' | 'RECOVER_DECLINE' | 'OVERDUE_FOLLOWUP' | 'OWNER_TRANSFER_REVIEW' | 'MONITOR' | string;
  actionReason: string;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  medianBuyingInterval: number;
  previous30dSales: number;
  recent30dSales: number;
  salesChangePct: number | null;
  recoveryOpportunity: number;
  risk: string;
  salespersonChanged: boolean;
}

export interface CustomerRecoveryOpportunitiesParams {
  asOfDate?: string | null;
  companyName?: string | null;
  salesperson?: string | null;
  limit?: number | null;
}

export interface CustomerRecoveryOpportunitiesResult {
  customerId: number;
  customerName: string;
  companyName: string;
  salesperson: string;
  recoveryValue: number;
  previous30dSales: number;
  recent30dSales: number;
  salesDeclinePct: number | null;
  daysSinceLastOrder: number;
  actionReason: string;
}

export interface GovernorateOption {
  governorateCode: string;
  governorateNameAr: string;
  customersCount: number;
  ordersCount: number;
  salesValue: number;
  mappedCustomers?: number;
  coveragePct?: number;
}

export interface AreaOption {
  areaCode: string;
  areaNameAr: string;
  governorateCode: string;
  governorateNameAr: string;
  customersCount: number;
  ordersCount: number;
  salesValue: number;
  highConfidenceCustomers?: number;
  avgConfidence?: number;
  needsReviewCustomers?: number;
}

export interface GeographyQualitySummary {
  salesCustomers: number;
  governorateMapped: number;
  areaMapped: number;
  highConfidenceArea: number;
  needsReview: number;
  governorateCoveragePct: number;
  areaCoveragePct: number;
  highConfidencePct: number;
}

