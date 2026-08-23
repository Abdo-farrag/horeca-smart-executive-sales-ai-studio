import { analytics } from '../../analytics';
import {
  CustomerSummaryResult,
  CustomerOrdersV2Result,
  CustomerProductDropoffV2Result,
  CustomerFavoriteProductsV2Result,
  CustomerRetentionDetailsV2Result,
  CustomerActionCenterScopedV2Result,
  CustomerCrossSellCandidatesResult,
  ProductSummaryResult,
  ProductTopCustomersV2Result,
} from '../../analytics/types';
import { GlobalFilterState } from '../../types';
import { getEffectiveFilterParams, EffectiveFilterParams } from '../../utils/filterUtils';
import {
  AiQueryIntent,
  AiContextMode,
  AiContextRouterResult,
  ExecutiveAIContext,
  ExecutiveDrillDownContext,
  SafeOrderDTO,
  SafeCustomerDetailDTO,
  SafeCustomerProductHistoryDTO,
  SafeProductDetailDTO,
  SafeProductCustomerDTO,
  SafeRetentionDetailDTO,
  SafeActionCenterDTO,
  SafeCrossSellCandidateDTO,
} from '../../types/ai';
import {
  resolveAiIntent,
  intentRequiresCustomer,
  intentRequiresProduct,
  getDeterministicIntentResponse,
} from './aiIntentClassifier';
import { buildExecutiveAIContext } from '../aiChatService';

// ==============================================================================
// EXPLICIT DTO ALLOWLIST MAPPERS
// Rule: NEVER use { ...rawObject }. Explicit property assignments only.
// Prohibited: phone, mobile, email, address, street, bank, account number,
//             IBAN, SWIFT, card, transfer reference, Instapay, Fawry, receipt,
//             payment reference, raw payment data.
// ==============================================================================

/**
 * Maps CustomerSummaryResult into SafeCustomerDetailDTO
 */
export function mapCustomerSummaryToSafeDTO(
  row: CustomerSummaryResult,
  actionCenterRow?: CustomerActionCenterScopedV2Result
): SafeCustomerDetailDTO {
  return {
    customerId: row.customerId,
    customerName: row.customerName,
    companyName: row.companyName,
    salespersonName: row.primarySalesperson,
    governorateName: null,
    areaName: null,
    totalSales: row.salesValue,
    ordersCount: row.ordersCount,
    averageOrderValue: row.averageOrderValue,
    firstOrderDate: row.firstOrderDate ?? null,
    lastOrderDate: row.lastOrderDate ?? null,
    daysSinceLastOrder: row.daysSinceLastOrder,
    previousPeriodSales: row.previousPeriodSales,
    currentPeriodSales: row.salesValue,
    salesChangePct: row.salesChangePct ?? null,
    customerStatus: row.customerStatus,
    riskLevel: actionCenterRow ? actionCenterRow.riskLevel : undefined,
    recoveryOpportunity: actionCenterRow ? actionCenterRow.recoveryOpportunity : undefined,
  };
}

/**
 * Maps CustomerOrdersV2Result into SafeOrderDTO
 */
export function mapCustomerOrderToSafeDTO(row: CustomerOrdersV2Result): SafeOrderDTO {
  return {
    orderId: row.orderId,
    orderName: row.orderName,
    orderDate: row.orderDate,
    companyName: row.companyName,
    salesperson: row.salesperson,
    governorateName: row.governorateName ?? null,
    areaName: row.areaName ?? null,
    orderValue: row.orderValue,
    productsCount: row.productsCount,
    linesCount: row.linesCount,
    totalQuantity: row.totalQty,
    orderStatus: 'CONFIRMED',
    paymentStatus: 'UNKNOWN',
  };
}

/**
 * Maps CustomerProductDropoffV2Result into SafeCustomerProductHistoryDTO stopped product item
 */
export function mapCustomerDropoffToSafeDTO(
  row: CustomerProductDropoffV2Result
): SafeCustomerProductHistoryDTO['stoppedProducts'][0] {
  return {
    productId: row.productId,
    productName: row.productName,
    previousSales: row.previousSales,
    currentSales: row.currentSales,
    recoveryValue: row.recoveryValue,
    status: row.status,
  };
}

/**
 * Maps CustomerFavoriteProductsV2Result into SafeCustomerProductHistoryDTO favorite product item
 */
export function mapFavoriteProductToSafeDTO(
  row: CustomerFavoriteProductsV2Result
): SafeCustomerProductHistoryDTO['favoriteProducts'][0] {
  return {
    productId: row.productId,
    productName: row.productName,
    salesValue: row.salesValue,
    ordersCount: row.ordersCount,
    salesSharePct: row.salesSharePct ?? 0,
    lastOrderDate: row.lastOrderDate ?? null,
  };
}

/**
 * Maps CustomerRetentionDetailsV2Result into SafeRetentionDetailDTO
 */
export function mapRetentionDetailToSafeDTO(
  row: CustomerRetentionDetailsV2Result
): SafeRetentionDetailDTO {
  return {
    companyName: row.companyName,
    customerId: row.customerId,
    customerName: row.customerName,
    previousSalesperson: row.previousSalesperson,
    currentSalesperson: row.currentSalesperson,
    previousOrders: row.previousOrders,
    currentOrders: row.currentOrders,
    previousSales: row.previousSales,
    currentSales: row.currentSales,
    retentionStatus: row.retentionStatus,
    salesChangePct: row.salesChangePct ?? null,
    previousLastOrderDate: row.previousLastOrderDate ?? null,
    currentLastOrderDate: row.currentLastOrderDate ?? null,
  };
}

/**
 * Maps CustomerActionCenterScopedV2Result into SafeActionCenterDTO
 */
export function mapActionCenterToSafeDTO(
  row: CustomerActionCenterScopedV2Result
): SafeActionCenterDTO {
  return {
    customerId: row.customerId,
    customerName: row.customerName,
    companyName: row.companyName,
    currentSalesperson: row.currentSalesperson,
    lastOrderDate: row.lastOrderDate ?? null,
    daysSinceLastOrder: row.daysSinceLastOrder,
    medianDaysBetweenOrders: row.medianDaysBetweenOrders,
    recent30dSales: row.recent30dSales,
    previous30dSales: row.previous30dSales,
    salesChangePct: row.salesChangePct ?? null,
    recoveryOpportunity: row.recoveryOpportunity,
    riskLevel: row.riskLevel,
    actionType: row.actionType,
    priority: row.priority,
    actionReason: row.actionReason,
    salespersonChanged: row.salespersonChanged,
  };
}

/**
 * Maps ProductSummaryResult into SafeProductDetailDTO
 */
export function mapProductSummaryToSafeDTO(row: ProductSummaryResult): SafeProductDetailDTO {
  return {
    productId: row.productId,
    productName: row.productName,
    categoryName: row.productCategory ?? null,
    periodSales: row.salesValue,
    periodQuantity: row.quantitySold,
    periodOrders: row.ordersCount,
    periodCustomers: row.uniqueCustomers,
    averageUnitValue: row.averageUnitValue,
    firstOrderDate: row.firstOrderDate ?? null,
    lastOrderDate: row.lastOrderDate ?? null,
  };
}

/**
 * Maps ProductTopCustomersV2Result into SafeProductCustomerDTO
 */
export function mapProductCustomerToSafeDTO(
  row: ProductTopCustomersV2Result
): SafeProductCustomerDTO {
  return {
    customerId: row.customerId,
    customerName: row.customerName,
    companyName: row.companyName,
    salesperson: row.salesperson,
    governorateName: row.governorateName ?? null,
    areaName: row.areaName ?? null,
    ordersCount: row.ordersCount,
    salesValue: row.salesValue,
    quantity: row.quantity,
    lastOrderDate: row.lastOrderDate ?? null,
  };
}

/**
 * Maps CustomerCrossSellCandidatesResult into SafeCrossSellCandidateDTO
 */
export function mapCrossSellCandidateToSafeDTO(
  row: CustomerCrossSellCandidatesResult
): SafeCrossSellCandidateDTO {
  return {
    productId: row.productId,
    productName: row.productName,
    peerCustomersCount: row.peerCustomersCount,
    peerOrdersCount: row.peerOrdersCount,
    peerSalesValue: row.peerSalesValue,
    affinityScore: row.affinityScore,
  };
}

export interface BuildAiContextParams {
  message: string;
  filters: GlobalFilterState;
  shortcutIntent?: AiQueryIntent;
}

/**
 * Safe B3 Context Router.
 * Resolves intent, validates entity requirements, ensures zero PII, applies minimum data rule,
 * and calls solely through src/analytics SDK.
 */
export async function buildAiContextForQuery(
  params: BuildAiContextParams
): Promise<AiContextRouterResult> {
  const { message, filters, shortcutIntent } = params;

  // 1. Resolve Intent
  const intent = resolveAiIntent({
    message,
    filters,
    shortcutIntent,
  });

  // 2. Deterministic Intent Handlers (0 DB Calls)
  if (intent === 'PROHIBITED_DATA_REQUEST') {
    const userMessage =
      getDeterministicIntentResponse('PROHIBITED_DATA_REQUEST') ||
      'عذرًا، بيانات التواصل الشخصية والمعلومات البنكية وتفاصيل التحصيلات الفردية غير متاحة لأسباب تتعلق بالخصوصية وأمن البيانات.';
    return {
      status: 'PROHIBITED_DATA_DETECTED',
      intent: 'PROHIBITED_DATA_REQUEST',
      contextMode: 'AGGREGATED',
      userMessage,
      errorMessage: 'PROHIBITED_DATA_DETECTED',
    };
  }

  if (intent === 'PAYMENT_STATUS') {
    return {
      status: 'PAYMENT_STATUS_UNKNOWN',
      intent: 'PAYMENT_STATUS',
      contextMode: 'DRILL_DOWN',
      drillDownContext: {
        paymentStatusSummary: {
          statusNote: 'حالة السداد وموقف التحصيلات غير مسجلة في سجل المعاملات التحليلي المتاح.',
          hasReliablePaymentLedger: false,
        },
      },
      userMessage: 'حالة السداد وموقف التحصيلات غير مسجلة في النظام التحليلي الحالي.',
    };
  }

  const effective = getEffectiveFilterParams(filters);

  // 3. Entity Validation (Strictly before making DB calls)
  if (intentRequiresCustomer(intent) && !effective.customerId) {
    return {
      status: 'ENTITY_NOT_FOUND',
      intent,
      contextMode: 'DRILL_DOWN',
      userMessage: 'يرجى تحديد العميل من قائمة الفلاتر أولاً للحصول على تحليل تفصيلي دقيق.',
      errorMessage: 'CUSTOMER_REQUIRED',
    };
  }

  if (intentRequiresProduct(intent) && !effective.productId) {
    return {
      status: 'ENTITY_NOT_FOUND',
      intent,
      contextMode: 'DRILL_DOWN',
      userMessage: 'يرجى تحديد المنتج من قائمة الفلاتر أولاً للحصول على تحليل تفصيلي دقيق.',
      errorMessage: 'PRODUCT_REQUIRED',
    };
  }

  // 4. Intent Execution & Minimum Data Routing
  try {
    switch (intent) {
      // ----------------------------------------------------------------------
      // DRILL-DOWN: CUSTOMER RECENT ORDERS
      // ----------------------------------------------------------------------
      case 'CUSTOMER_RECENT_ORDERS': {
        const rawOrders = await analytics.customers.customerOrdersV2({
          customerId: effective.customerId!,
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          productId: effective.productId,
          limit: 10,
          offset: 0,
        });

        const recentOrders = rawOrders.slice(0, 20).map(mapCustomerOrderToSafeDTO);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            recentOrders,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: ORDER LOOKUP
      // ----------------------------------------------------------------------
      case 'ORDER_LOOKUP': {
        if (!effective.customerId) {
          return {
            status: 'ENTITY_NOT_FOUND',
            intent,
            contextMode: 'DRILL_DOWN',
            userMessage: 'يرجى تحديد العميل من قائمة الفلاتر أولاً للبحث في تفاصيل الأوردرات.',
            errorMessage: 'CUSTOMER_REQUIRED_FOR_ORDERS',
          };
        }

        const rawOrders = await analytics.customers.customerOrdersV2({
          customerId: effective.customerId,
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          productId: effective.productId,
          limit: 10,
          offset: 0,
        });

        const recentOrders = rawOrders.slice(0, 20).map(mapCustomerOrderToSafeDTO);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            recentOrders,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: CUSTOMER PRODUCT HISTORY
      // ----------------------------------------------------------------------
      case 'CUSTOMER_PRODUCT_HISTORY': {
        const [dropoffRes, favoritesRes] = await Promise.all([
          analytics.customers.customerProductDropoffV2({
            customerId: effective.customerId!,
            startDate: effective.effectiveStartDate,
            endDate: effective.effectiveEndDate,
            companyName: effective.companyName,
            salesperson: effective.salespersonName,
            governorateCode: effective.governorateCode,
            areaCode: effective.areaCode,
            productId: effective.productId,
            limit: 20,
          }),
          analytics.customers.customerFavoriteProductsV2({
            customerId: effective.customerId!,
            startDate: effective.effectiveStartDate,
            endDate: effective.effectiveEndDate,
            companyName: effective.companyName,
            salesperson: effective.salespersonName,
            governorateCode: effective.governorateCode,
            areaCode: effective.areaCode,
            limit: 20,
          }),
        ]);

        const stoppedProducts = dropoffRes.slice(0, 20).map(mapCustomerDropoffToSafeDTO);
        const favoriteProducts = favoritesRes.slice(0, 20).map(mapFavoriteProductToSafeDTO);

        const customerProductHistory: SafeCustomerProductHistoryDTO = {
          customerId: effective.customerId!,
          customerName: effective.customerName || '',
          stoppedProducts,
          favoriteProducts,
        };

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            customerProductHistory,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: CROSS SELL
      // ----------------------------------------------------------------------
      case 'CROSS_SELL': {
        // If salesperson, governorate, or area filter is active, cross-sell v1 cannot represent scope
        if (effective.salespersonName || effective.governorateCode || effective.areaCode) {
          return {
            status: 'DRILLDOWN_DATA_UNAVAILABLE',
            intent,
            contextMode: 'DRILL_DOWN',
            userMessage: 'تحليل البيع المتقاطع غير متاح مع فلاتر المناديب أو التوزيع الجغرافي النشطة حالياً.',
            errorMessage: 'DRILLDOWN_DATA_UNAVAILABLE',
          };
        }

        const candidates = await analytics.customers.crossSellCandidates({
          customerId: effective.customerId!,
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          limit: 20,
        });

        const crossSellCandidates = candidates.slice(0, 20).map(mapCrossSellCandidateToSafeDTO);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            crossSellCandidates,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: CUSTOMER ANALYSIS
      // ----------------------------------------------------------------------
      case 'CUSTOMER_ANALYSIS': {
        const summaries = await analytics.customers.summary({
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          customerId: effective.customerId!,
          limit: 1,
        });

        if (!summaries || summaries.length === 0) {
          return {
            status: 'ENTITY_NOT_FOUND',
            intent,
            contextMode: 'DRILL_DOWN',
            userMessage: 'لم يتم العثور على بيانات مبيعات للعميل المحدد خلال هذه الفترة.',
            errorMessage: 'CUSTOMER_NOT_FOUND',
          };
        }

        const targetCustomer = mapCustomerSummaryToSafeDTO(summaries[0]);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            targetCustomer,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: LOST CUSTOMERS
      // ----------------------------------------------------------------------
      case 'LOST_CUSTOMERS': {
        const month = effective.effectiveStartDate
          ? effective.effectiveStartDate.slice(0, 7) + '-01'
          : '2026-08-01';

        const lostRows = await analytics.customers.customerRetentionDetailsV2({
          month,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          customerId: effective.customerId,
          productId: effective.productId,
          status: 'LOST',
          limit: 20,
          offset: 0,
        });

        const lostCustomers = lostRows.slice(0, 20).map(mapRetentionDetailToSafeDTO);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            lostCustomers,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: DECLINING CUSTOMERS
      // ----------------------------------------------------------------------
      case 'DECLINING_CUSTOMERS': {
        const summaryRows = await analytics.customers.summary({
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          productId: effective.productId,
          limit: 100,
        });

        const decliningCustomers = summaryRows
          .filter(
            (c) =>
              (c.salesChangePct != null && c.salesChangePct < 0) ||
              c.previousPeriodSales > c.salesValue
          )
          .map((c) => {
            const salesGap = Math.max(c.previousPeriodSales - c.salesValue, 0);
            return {
              customerId: c.customerId,
              customerName: c.customerName,
              companyName: c.companyName,
              primarySalesperson: c.primarySalesperson,
              salesValue: c.salesValue,
              previousSales: c.previousPeriodSales,
              salesChangePct: c.salesChangePct,
              salesGap,
            };
          })
          .sort((a, b) => b.salesGap - a.salesGap)
          .slice(0, 20);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            decliningCustomers,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN / RISK: RISK
      // ----------------------------------------------------------------------
      case 'RISK': {
        const actionRows = await analytics.customers.customerActionCenterScopedV2({
          asOfDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          customerId: effective.customerId,
          productId: effective.productId,
          limit: 20,
        });

        const riskActionCenter = actionRows.slice(0, 20).map(mapActionCenterToSafeDTO);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            riskActionCenter,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: PRODUCT ANALYSIS
      // ----------------------------------------------------------------------
      case 'PRODUCT_ANALYSIS': {
        const productSummaries = await analytics.products.summary({
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          customerId: effective.customerId,
          productId: effective.productId!,
          limit: 1,
        });

        if (!productSummaries || productSummaries.length === 0) {
          return {
            status: 'ENTITY_NOT_FOUND',
            intent,
            contextMode: 'DRILL_DOWN',
            userMessage: 'لم يتم العثور على بيانات مبيعات للمنتج المحدد خلال هذه الفترة.',
            errorMessage: 'PRODUCT_NOT_FOUND',
          };
        }

        const targetProduct = mapProductSummaryToSafeDTO(productSummaries[0]);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            targetProduct,
          },
        };
      }

      // ----------------------------------------------------------------------
      // DRILL-DOWN: PRODUCT CUSTOMERS
      // ----------------------------------------------------------------------
      case 'PRODUCT_CUSTOMERS': {
        const topCustomerRows = await analytics.products.productTopCustomersV2({
          productId: effective.productId!,
          startDate: effective.effectiveStartDate,
          endDate: effective.effectiveEndDate,
          companyName: effective.companyName,
          salesperson: effective.salespersonName,
          governorateCode: effective.governorateCode,
          areaCode: effective.areaCode,
          customerId: effective.customerId,
          limit: 20,
        });

        const productTopCustomers = topCustomerRows.slice(0, 20).map(mapProductCustomerToSafeDTO);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'DRILL_DOWN',
          drillDownContext: {
            productTopCustomers,
          },
        };
      }

      // ----------------------------------------------------------------------
      // AGGREGATED QUERIES
      // ----------------------------------------------------------------------
      case 'EXECUTIVE_SUMMARY':
      case 'SALES_PERFORMANCE':
      case 'SALES_REPS':
      case 'RETENTION':
      case 'GEOGRAPHY':
      case 'PRODUCT_PERFORMANCE':
      case 'GENERAL_EXECUTIVE_QUESTION':
      default: {
        const analyticsContext = await buildExecutiveAIContext(filters);

        return {
          status: 'SUCCESS',
          intent,
          contextMode: 'AGGREGATED',
          analyticsContext,
        };
      }
    }
  } catch (err: any) {
    const errorMsg = err?.message || 'Analytics service query failed';
    return {
      status: 'AI_SERVICE_UNAVAILABLE',
      intent,
      contextMode: intentRequiresCustomer(intent) || intentRequiresProduct(intent) ? 'DRILL_DOWN' : 'AGGREGATED',
      errorMessage: errorMsg,
      userMessage: 'تعذر تحميل البيانات التحليلية المطلوبة حاليًا.',
    };
  }
}
