import { GlobalFilterState } from '../contracts/appTypes';
import { AiQueryIntent } from '../contracts/ai';

/**
 * Deterministic Regex Patterns for Intent Classification.
 * Evaluated in strict priority order (1 to 19).
 */

// 1. Prohibited Data Patterns (PII and sensitive banking/financial credentials)
const PROHIBITED_PII_REGEX =
  /(تليفون|موبايل|هاتف|رقم العميل|ايميل|إيميل|بريد|عنوان|شارع|\bphone\b|\bmobile\b|\bemail\b|\baddress\b|\bstreet\b)/i;

const PROHIBITED_FINANCIAL_REGEX =
  /(حساب بنكي|رقم الحساب|ايبان|\biban\b|سويفت|\bswift\b|فيزا|ماستر|كارت|تحويل بنكي|انستاباي|انستا باي|\binstapay\b|فوري|\bfawry\b|إيصال|ايصال|مرجع الدفع|\bbank\b|\baccount number\b|\bcard\b|\btransfer reference\b|\breceipt\b|\bpayment reference\b)/i;

// 2. Payment Status Patterns (Status queries only - sensitive details handled in priority 1)
const PAYMENT_STATUS_REGEX =
  /(حالة السداد|سداد العميل|سداد الفواتير|مدفوع|غير مدفوع|تحصيل|مديونية|موقف السداد|موقف التحصيل|\bpayment status\b|\bpaid\b|\bunpaid\b|\bpartial payment\b|\bcredit status\b|\bpayment\b|سداد|دفع|تحصيلات)/i;

// 3. Customer Recent Orders
const CUSTOMER_ORDERS_REGEX =
  /(آخر (أوردرات|اوردرات|طلبات|فواتير)|احدث (أوردرات|اوردرات|طلبات|فواتير)|طلبات العميل|أوردرات العميل|اوردرات العميل|فواتير العميل|أوردرات للعميل|اوردرات للعميل|طلبات للعميل|\brecent orders\b|\blatest orders\b|\bcustomer orders\b|\bcustomer invoices\b)/i;

// 4. Order Lookup (General / Top / Period orders - distinct from AOV/Sales performance)
const ORDER_LOOKUP_REGEX =
  /(أكبر (الأوردرات|الاوردرات|الطلبات|الفواتير)|اكبر (الأوردرات|الاوردرات|الطلبات|الفواتير)|أحدث الطلبات|أحدث الأوردرات|أوردرات الفترة|اوردرات الفترة|طلبات الفترة|فواتير الفترة|أوردرات الشركة|قائمة الأوردرات|قائمة الطلبات|\btop orders\b|\blarge orders\b|\ball orders\b|\border lookup\b|أكبر \d+ (أوردر|اوردر|طلب|فاتورة)|أحدث \d+ (أوردر|اوردر|طلب|فاتورة))/i;

// 5. Customer Product History (Stopped buying / Dropoff / Favorites)
const CUSTOMER_PRODUCT_HISTORY_REGEX =
  /(وقف يشتري|توقف عن شراء|بطل يشتري|منتجات متوقفة|المنتجات المتراجعة عند العميل|أصناف توقف|أصناف بطل|المنتجات المفضلة للعميل|مفضلة عند العميل|\bproduct dropoff\b|\bstopped buying\b|\bfavorite products\b|dropoff)/i;

// 6. Cross-Sell
const CROSS_SELL_REGEX =
  /((?:ال)?بيع\s+(?:ال)?متقاطع|\bcross[- ]?sell(ing)?\b|منتجات ممكن أبيعها|منتجات ممكن نبيعها|منتجات أقترحها|منتجات نقترحها|فرص منتجات جديدة|منتجات جديدة ممكن نبيعها|أصناف جديدة للعميل|اقتراح منتجات|منتجات العميل مش بيشتريها)/i;

// 7. Declining Customers
const DECLINING_CUSTOMERS_REGEX =
  /(عملاء مبيعاتهم انخفضت|(?:ال)?عملاء (?:ال)?متراجعين|عملاء متراجعين|انخفاض مبيعات العملاء|تراجع العملاء|عملاء متراجعة|عملاء انخفضت|\bdeclining customers\b|\bsales decline customers\b)/i;

// 8. Lost Customers (Churned / Win-back)
const LOST_CUSTOMERS_REGEX =
  /((?:ال)?عملاء (?:ال)?مفقودين|(?:ال)?عملاء اللي وقفوا شراء|عملاء وقفوا شراء|استرجاع العملاء|استعادة العملاء|(?:ال)?عملاء (?:ال)?متسربين|\blost customers\b|\bchurned customers\b|\bwin[- ]?back\b)/i;

// 9. Product Customers
const PRODUCT_CUSTOMERS_REGEX =
  /(مين (أكبر|اكبر|اهم|أهم) عملاء (هذا |هذه )?(?:ال)?(منتج|صنف)|مين بيشتري (هذا |هذه )?(?:ال)?(منتج|صنف|أصناف|بضاعة|ده)|عملاء (هذا |هذه )?(?:ال)?(صنف|منتج)|من يشتري (هذا |هذه )?(?:ال)?(منتج|صنف)|مشترين (هذا |هذه )?(?:ال)?(منتج|صنف)|\btop customers for product\b|\bcustomers of product\b|\bwho buys\b)/i;

// 10. Customer Analysis (Deep Dive)
const CUSTOMER_ANALYSIS_REGEX =
  /(حلل العميل|تحليل العميل|أداء العميل|تفاصيل العميل|وضع العميل|العميل المحدد|بيانات العميل|\bcustomer deep dive\b|\bcustomer analysis\b|\banalyze customer\b)/i;

// 11. Product Analysis (Deep Dive)
const PRODUCT_ANALYSIS_REGEX =
  /(حلل المنتج|تحليل المنتج|أداء المنتج المحدد|تفاصيل المنتج|وضع المنتج|المنتج المحدد|حلل الصنف|تحليل الصنف|\bproduct deep dive\b|\bproduct analysis\b|\banalyze product\b)/i;

// 12. Sales Reps
const SALES_REPS_REGEX =
  /(مندوب|مناديب|فريق البيع|مناديب المبيعات|مسؤولي المبيعات|مسؤول المبيعات|\bsales reps?\b|\bsales team\b)/i;

// 13. Retention
const RETENTION_REGEX =
  /(احتفاظ|معدل الاحتفاظ|تسرب العملاء|نسبة الاحتفاظ|\bretention\b|\bchurn rate\b|\bcustomer retention\b)/i;

// 14. Risk
const RISK_REGEX =
  /(مخاطر|معرضين للفقد|معرض للخطر|مستوى الخطورة|عملاء في خطر|\brisk\b|\bhigh risk\b|\bat[- ]risk\b)/i;

// 15. Geography
const GEOGRAPHY_REGEX =
  /(محافظة|محافظات|منطقة|مناطق|جغرافيا|توزيع جغرافي|القاهرة|الجيزة|الإسكندرية|\bgovernorate(s)?\b|\barea(s)?\b|\bgeography\b)/i;

// 16. Product Performance (Aggregate Top / Trend)
const PRODUCT_PERFORMANCE_REGEX =
  /(المنتجات الأعلى مبيعا|أفضل المنتجات|أعلى الأصناف|المنتجات المتصدرة|أداء المنتجات|المنتجات الأكثر مبيعا|أفضل الأصناف|\btop products\b|\bbest selling products\b|\bproduct performance\b)/i;

// 17. Sales Performance (Aggregate Trend / AOV)
const SALES_PERFORMANCE_REGEX =
  /(اتجاه المبيعات|تحليل المبيعات|مبيعات يومية|متوسط قيمة الطلب|حجم المبيعات|المبيعات اليومية|\baov\b|\brevenue\b|\bsales performance\b|\bsales trend\b)/i;

// 18. Executive Summary
const EXECUTIVE_SUMMARY_REGEX =
  /(لخص الفترة|تقرير تنفيذي|ملخص تنفيذي|لخص الأداء|ملخص المبيعات|لخص لي أداء المبيعات|أداء الفترة الحالية|لخص مبيعات الشركة|مبيعات الشركة كلها|ملخص شامل|\bexecutive summary\b|\boverview\b|\bsummarize\b)/i;

/**
 * Classifies a user query message into an AiQueryIntent using strict precedence.
 * Zero database queries. Zero AI model calls.
 */
export function classifyAiQueryIntent(
  message: string,
  filters: GlobalFilterState
): AiQueryIntent {
  const norm = message.trim();

  // 1. PROHIBITED_DATA_REQUEST (Highest Priority - Never overridden)
  if (PROHIBITED_PII_REGEX.test(norm) || PROHIBITED_FINANCIAL_REGEX.test(norm)) {
    return 'PROHIBITED_DATA_REQUEST';
  }

  // 2. PAYMENT_STATUS
  if (PAYMENT_STATUS_REGEX.test(norm)) {
    return 'PAYMENT_STATUS';
  }

  // 3. CUSTOMER_RECENT_ORDERS
  if (CUSTOMER_ORDERS_REGEX.test(norm)) {
    return 'CUSTOMER_RECENT_ORDERS';
  }
  // If user asks about orders and refers to customer or customer is selected with customer-specific order phrasing
  if (
    /(أوردر|اوردر|طلب|طلبات|orders?|invoices?)/i.test(norm) &&
    /(عميل|العميل|للعميل|customer|زبون)/i.test(norm)
  ) {
    return 'CUSTOMER_RECENT_ORDERS';
  }

  // 4. ORDER_LOOKUP (General / Period orders)
  if (ORDER_LOOKUP_REGEX.test(norm)) {
    return 'ORDER_LOOKUP';
  }

  // 5. CUSTOMER_PRODUCT_HISTORY (Dropoff, stopped buying, favorite products)
  if (CUSTOMER_PRODUCT_HISTORY_REGEX.test(norm)) {
    return 'CUSTOMER_PRODUCT_HISTORY';
  }
  if (
    /(وقف|توقف|بطل|متراجع|dropoff|stopped)/i.test(norm) &&
    /(منتج|صنف|بضاعة|products?)/i.test(norm)
  ) {
    return 'CUSTOMER_PRODUCT_HISTORY';
  }

  // 6. CROSS_SELL
  if (CROSS_SELL_REGEX.test(norm)) {
    return 'CROSS_SELL';
  }

  // 7. DECLINING_CUSTOMERS
  if (DECLINING_CUSTOMERS_REGEX.test(norm)) {
    return 'DECLINING_CUSTOMERS';
  }

  // 8. LOST_CUSTOMERS
  if (LOST_CUSTOMERS_REGEX.test(norm)) {
    return 'LOST_CUSTOMERS';
  }

  // 9. PRODUCT_CUSTOMERS
  if (PRODUCT_CUSTOMERS_REGEX.test(norm)) {
    return 'PRODUCT_CUSTOMERS';
  }

  // 10. CUSTOMER_ANALYSIS
  if (CUSTOMER_ANALYSIS_REGEX.test(norm)) {
    return 'CUSTOMER_ANALYSIS';
  }

  // 11. PRODUCT_ANALYSIS
  if (PRODUCT_ANALYSIS_REGEX.test(norm)) {
    return 'PRODUCT_ANALYSIS';
  }

  // 12. SALES_REPS
  if (SALES_REPS_REGEX.test(norm)) {
    return 'SALES_REPS';
  }

  // 13. RETENTION
  if (RETENTION_REGEX.test(norm)) {
    return 'RETENTION';
  }

  // 14. RISK
  if (RISK_REGEX.test(norm)) {
    return 'RISK';
  }

  // 15. GEOGRAPHY
  if (GEOGRAPHY_REGEX.test(norm)) {
    return 'GEOGRAPHY';
  }

  // 16. PRODUCT_PERFORMANCE
  if (PRODUCT_PERFORMANCE_REGEX.test(norm)) {
    return 'PRODUCT_PERFORMANCE';
  }

  // 17. SALES_PERFORMANCE
  if (SALES_PERFORMANCE_REGEX.test(norm)) {
    return 'SALES_PERFORMANCE';
  }

  // 18. EXECUTIVE_SUMMARY
  if (EXECUTIVE_SUMMARY_REGEX.test(norm)) {
    return 'EXECUTIVE_SUMMARY';
  }

  // Active filter contextual resolution:
  // If the query specifically references "العميل المحدد" or "هذا العميل" and was not caught above
  if (/(العميل المحدد|هذا العميل|الزبون المحدد)/i.test(norm) && filters.customerId) {
    return 'CUSTOMER_ANALYSIS';
  }
  if (/(المنتج المحدد|هذا المنتج|الصنف المحدد)/i.test(norm) && filters.productId) {
    return 'PRODUCT_ANALYSIS';
  }

  // 19. GENERAL_EXECUTIVE_QUESTION (Default Fallback)
  return 'GENERAL_EXECUTIVE_QUESTION';
}

/**
 * Resolves intent with direct shortcutIntent bypass.
 * If shortcutIntent is provided, it is authoritative and bypasses regex classification.
 */
export function resolveAiIntent(params: {
  message: string;
  filters: GlobalFilterState;
  shortcutIntent?: AiQueryIntent;
}): AiQueryIntent {
  if (params.shortcutIntent) {
    return params.shortcutIntent;
  }
  return classifyAiQueryIntent(params.message, params.filters);
}

/**
 * Returns true if the intent strictly requires a selected customer entity.
 */
export function intentRequiresCustomer(intent: AiQueryIntent): boolean {
  switch (intent) {
    case 'CUSTOMER_RECENT_ORDERS':
    case 'CUSTOMER_PRODUCT_HISTORY':
    case 'CROSS_SELL':
    case 'CUSTOMER_ANALYSIS':
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if the intent strictly requires a selected product entity.
 */
export function intentRequiresProduct(intent: AiQueryIntent): boolean {
  switch (intent) {
    case 'PRODUCT_ANALYSIS':
    case 'PRODUCT_CUSTOMERS':
      return true;
    default:
      return false;
  }
}

/**
 * Returns deterministic standard response for immediate short-circuiting.
 * For PROHIBITED_DATA_REQUEST, returns privacy guard refusal.
 */
export function getDeterministicIntentResponse(intent: AiQueryIntent): string | null {
  if (intent === 'PROHIBITED_DATA_REQUEST') {
    return 'عذرًا، بيانات التواصل الشخصية والمعلومات البنكية وتفاصيل التحصيلات الفردية غير متاحة لأسباب تتعلق بالخصوصية وأمن البيانات.';
  }
  return null;
}
