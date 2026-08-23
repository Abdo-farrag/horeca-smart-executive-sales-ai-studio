export type OperatingCompany = 'All' | 'Horeca Smart' | 'MAS';

export type HorecaSector = 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'catering';

export type CustomerLifecycleStatus = 'active' | 'at_risk' | 'churned' | 'new' | 'transferred';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AbcClassification = 'A' | 'B' | 'C';
export type XyzClassification = 'X' | 'Y' | 'Z';

export type LostCustomerPriority = 'high' | 'medium' | 'low';
export type RecoveryStatus = 'new_lost' | 'contacted' | 'negotiating' | 'recovered' | 'unrecoverable';

export type PeriodMode = 'current_month' | 'previous_month' | 'custom';

export interface DateRangeFilter {
  label: string;
  startDate: string;
  endDate: string;
  preset: 'current_mtd' | 'previous_month' | 'custom' | 'today' | 'yesterday' | 'last_7_days' | 'mtd' | 'last_month' | 'ytd';
}

export interface GlobalFilterState {
  periodMode: PeriodMode;
  selectedStartDate: string;
  selectedEndDate: string;
  effectiveStartDate: string;
  effectiveEndDate: string;
  latestAvailableDataDate: string;
  companyId: number | null;
  companyName: string | null;
  company: OperatingCompany;
  salespersonOptionKey: string | null;
  salespersonName: string | null;
  salespersonCompanyId: number | null;
  salesperson: string | null;
  salesRepId: string;
  governorateCode: string | null;
  governorateName: string | null;
  areaCode: string | null;
  areaName: string | null;
  customerId: number | null;
  customerName: string | null;
  productId: number | null;
  productName: string | null;
  dateRange: DateRangeFilter;
  area: string;
  city: string;
  category: string;
  customerStatus: string | null;
  priority: string | null;
  risk: string | null;
  actionType: string | null;
  customerSector: string;
  searchQuery: string;
}

export interface KpiMetric {
  id: string;
  titleAr: string;
  titleEn: string;
  currentValue: number;
  previousValue: number;
  growthPercent: number;
  isPositiveGrowthGood: boolean;
  unit: 'currency' | 'number' | 'percent';
  sparkline: number[];
  category: 'sales' | 'customers' | 'operations';
  descriptionAr: string;
  descriptionEn: string;
}

export interface OrderItem {
  productId: string;
  productNameAr: string;
  productNameEn: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderRecord {
  id: string;
  company: 'Horeca Smart' | 'MAS';
  orderNumber: string;
  date: string;
  time: string;
  customerId: string;
  customerNameAr: string;
  customerNameEn: string;
  sector: HorecaSector;
  salesRepId: string;
  salesRepNameAr: string;
  salesRepNameEn: string;
  area: string;
  city: string;
  amount: number;
  status: 'completed' | 'pending' | 'cancelled';
  itemsCount: number;
  items: OrderItem[];
}

export interface Customer {
  id: string;
  nameAr: string;
  nameEn: string;
  company: 'Horeca Smart' | 'MAS';
  sector: HorecaSector;
  area: string;
  city: string;
  salesRepId: string;
  salesRepName: string;
  healthScore: number; // 0-100
  lifecycle: CustomerLifecycleStatus;
  riskLevel: RiskLevel;
  lastOrderDate: string;
  avgDaysBetweenOrders: number;
  daysSinceLastOrder: number;
  totalRevenueYtd: number;
  ordersCount: number;
  avgOrderValue: number;
  retentionRate: number; // %
  topCategoryPurchased: string;
  topProductPurchased: string;
  crossSellOpportunities: string[];
  aiRecommendationAr: string;
  aiRecommendationEn: string;
  phone: string;
  email: string;
}

export interface SalesRep {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  avatar: string;
  company: 'Horeca Smart' | 'MAS';
  primaryArea: string;
  totalSalesYtd: number;
  monthlyTarget: number;
  monthlyAchieved: number;
  targetAchievementPercent: number;
  totalCustomers: number;
  activeCustomers: number;
  previousCustomers?: number;
  retainedCustomers?: number;
  lostCustomers: number;
  transferredCustomers: number;
  newCustomers?: number;
  retentionRate: number;
  areaCoveragePercent: number;
  avgOrderValue: number;
  recentOrdersCount: number;
  lostPreviousSales?: number;
  trend: number[];
}

export interface SalesRepSummaryRpcRow {
  order_month: string;
  company_name: string;
  salesperson: string;
  active_customers: number;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  previous_customers: number;
  retained_customers: number;
  lost_customers: number;
  transferred_out_customers: number;
  transferred_in_customers: number;
  new_customers: number;
  reactivated_customers: number;
  lost_previous_sales: number;
  retention_rate: number;
}

export interface SalesRepTrendRpcRow {
  order_month: string;
  company_name: string;
  salesperson: string;
  active_customers: number;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  retention_rate: number | null;
  lost_customers: number;
  new_customers: number;
}

export interface SalesRepCustomerRpcRow {
  company_name: string;
  salesperson: string;
  customer_id: number;
  customer_name: string;
  orders_count: number;
  sales_value: number;
  average_order_value: number;
  first_order_at: string;
  last_order_at: string;
}

export interface SalesRepRetentionDetailRpcRow {
  company_name: string;
  customer_id: number;
  customer_name: string;
  previous_salesperson: string | null;
  current_salesperson: string | null;
  previous_orders: number;
  current_orders: number;
  previous_sales: number;
  current_sales: number;
  retention_status: 'RETAINED' | 'LOST' | 'TRANSFERRED' | 'NEW_IN_WINDOW' | string;
  sales_change_pct: number;
  previous_last_order_at: string | null;
  current_last_order_at: string | null;
}

export interface Product {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  marginPercent: number;
  totalSalesValue: number;
  totalQuantitySold: number;
  buyingCustomersCount: number;
  growthPercent: number;
  abcClassification: AbcClassification;
  xyzClassification: XyzClassification;
  topArea: string;
  topCustomerName: string;
  topSalesRepName: string;
  monthlySalesTrend: number[];
}

export interface CategoryPerformance {
  id: string;
  categoryAr: string;
  categoryEn: string;
  revenue: number;
  ordersCount: number;
  customersCount: number;
  growthPercent: number;
  bestSellingProductAr: string;
  bestSellingProductEn: string;
  topArea: string;
  topSalesRep: string;
  marginPercent: number;
  trend: number[];
}

export interface AreaTerritory {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  revenue: number;
  customersCount: number;
  ordersCount: number;
  retentionRate: number;
  growthPercent: number;
  topCategory: string;
  topProduct: string;
  responsibleRepNameAr: string;
  responsibleRepNameEn: string;
}

export interface LostCustomerRecord {
  id: string;
  customerId: string;
  customerNameAr: string;
  customerNameEn: string;
  company: 'Horeca Smart' | 'MAS';
  sector: HorecaSector;
  area: string;
  city: string;
  salesRepId: string;
  salesRepNameAr: string;
  salesRepNameEn: string;
  lastOrderDate: string;
  lostRevenueYtd: number;
  priority: LostCustomerPriority;
  churnReasonAr: string;
  churnReasonEn: string;
  recoveryStatus: RecoveryStatus;
  recoveryRecommendationAr: string;
  recoveryRecommendationEn: string;
  daysSilent: number;
}

export interface DrillDownData {
  type: 'kpi' | 'customer' | 'sales_rep' | 'product' | 'category' | 'area' | 'lost_customer' | 'chart_point';
  title: string;
  data: any;
  contextParams?: Record<string, any>;
}
