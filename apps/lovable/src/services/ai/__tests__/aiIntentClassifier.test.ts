import { describe, it, expect } from 'vitest';
import {
  classifyAiQueryIntent,
  resolveAiIntent,
  intentRequiresCustomer,
  intentRequiresProduct,
  getDeterministicIntentResponse,
} from '../aiIntentClassifier';
import { GlobalFilterState } from '../../../types';

const mockDefaultFilters: GlobalFilterState = {
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
    label: 'August 2026 MTD',
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

describe('aiIntentClassifier - Deterministic Intent Precedence & Rules', () => {
  // 1. Phone request
  it('1. phone request -> PROHIBITED_DATA_REQUEST', () => {
    expect(classifyAiQueryIntent('اديني رقم تليفون العميل', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
    expect(classifyAiQueryIntent('What is customer phone number?', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
  });

  // 2. Email request
  it('2. email request -> PROHIBITED_DATA_REQUEST', () => {
    expect(classifyAiQueryIntent('عايز إيميل مسؤول المشتريات', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
    expect(classifyAiQueryIntent('give me email address', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
  });

  // 3. IBAN request
  it('3. IBAN request -> PROHIBITED_DATA_REQUEST', () => {
    expect(classifyAiQueryIntent('هات رقم الآيبان IBAN الخاص بالعميل', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
  });

  // 4. Receipt request
  it('4. receipt request -> PROHIBITED_DATA_REQUEST', () => {
    expect(classifyAiQueryIntent('اعرض صورة إيصال التحويل', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
    expect(classifyAiQueryIntent('show transfer receipt', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
  });

  // 5. Payment status
  it('5. payment status -> PAYMENT_STATUS', () => {
    expect(classifyAiQueryIntent('ما هي حالة السداد للعميل؟', mockDefaultFilters)).toBe('PAYMENT_STATUS');
    expect(classifyAiQueryIntent('check customer payment status', mockDefaultFilters)).toBe('PAYMENT_STATUS');
    expect(classifyAiQueryIntent('هل الفواتير مدفوعة أم غير مدفوعة؟', mockDefaultFilters)).toBe('PAYMENT_STATUS');
  });

  // 6. Bank transfer details
  it('6. bank transfer details -> PROHIBITED_DATA_REQUEST', () => {
    expect(classifyAiQueryIntent('تفاصيل التحويل البنكي ورقم الحساب', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
    expect(classifyAiQueryIntent('show bank account number', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
  });

  // 7. Customer recent orders
  it('7. customer recent orders -> CUSTOMER_RECENT_ORDERS', () => {
    expect(classifyAiQueryIntent('اعرض آخر 10 أوردرات للعميل المحدد', mockDefaultFilters)).toBe('CUSTOMER_RECENT_ORDERS');
    expect(classifyAiQueryIntent('إيه آخر طلبات العميل؟', mockDefaultFilters)).toBe('CUSTOMER_RECENT_ORDERS');
  });

  // 8. General top orders
  it('8. general top orders -> ORDER_LOOKUP', () => {
    expect(classifyAiQueryIntent('اعرض أكبر 10 أوردرات في الفترة', mockDefaultFilters)).toBe('ORDER_LOOKUP');
    expect(classifyAiQueryIntent('أحدث الطلبات في الشركة', mockDefaultFilters)).toBe('ORDER_LOOKUP');
  });

  // 9. Stopped customer products
  it('9. stopped customer products -> CUSTOMER_PRODUCT_HISTORY', () => {
    expect(classifyAiQueryIntent('المنتجات اللي العميل وقف يشتريها', mockDefaultFilters)).toBe('CUSTOMER_PRODUCT_HISTORY');
    expect(classifyAiQueryIntent('بطل يشتري إيه من منتجاتنا؟', mockDefaultFilters)).toBe('CUSTOMER_PRODUCT_HISTORY');
    expect(classifyAiQueryIntent('show customer product dropoff', mockDefaultFilters)).toBe('CUSTOMER_PRODUCT_HISTORY');
  });

  // 10. Cross-sell
  it('10. cross-sell -> CROSS_SELL', () => {
    expect(classifyAiQueryIntent('بيع متقاطع للعميل المحدد', mockDefaultFilters)).toBe('CROSS_SELL');
    expect(classifyAiQueryIntent('إيه منتجات جديدة ممكن نبيعها للعميل؟', mockDefaultFilters)).toBe('CROSS_SELL');
    expect(classifyAiQueryIntent('cross sell recommendations for client', mockDefaultFilters)).toBe('CROSS_SELL');
  });

  // 11. Declining customers
  it('11. declining customers -> DECLINING_CUSTOMERS', () => {
    expect(classifyAiQueryIntent('عملاء مبيعاتهم انخفضت', mockDefaultFilters)).toBe('DECLINING_CUSTOMERS');
    expect(classifyAiQueryIntent('مين العملاء المتراجعين هذا الشهر؟', mockDefaultFilters)).toBe('DECLINING_CUSTOMERS');
    expect(classifyAiQueryIntent('show declining customers', mockDefaultFilters)).toBe('DECLINING_CUSTOMERS');
  });

  // 12. Lost customers
  it('12. lost customers -> LOST_CUSTOMERS', () => {
    expect(classifyAiQueryIntent('مين العملاء المفقودين؟', mockDefaultFilters)).toBe('LOST_CUSTOMERS');
    expect(classifyAiQueryIntent('العملاء اللي وقفوا شراء تماما ونقدر نعملهم استرجاع', mockDefaultFilters)).toBe('LOST_CUSTOMERS');
    expect(classifyAiQueryIntent('win-back lost customers list', mockDefaultFilters)).toBe('LOST_CUSTOMERS');
  });

  // 13. Product customers
  it('13. product customers -> PRODUCT_CUSTOMERS', () => {
    expect(classifyAiQueryIntent('مين أكبر عملاء المنتج؟', mockDefaultFilters)).toBe('PRODUCT_CUSTOMERS');
    expect(classifyAiQueryIntent('مين بيشتري الصنف ده؟', mockDefaultFilters)).toBe('PRODUCT_CUSTOMERS');
    expect(classifyAiQueryIntent('who are the top customers for product?', mockDefaultFilters)).toBe('PRODUCT_CUSTOMERS');
  });

  // 14. Selected customer analysis
  it('14. selected customer analysis -> CUSTOMER_ANALYSIS', () => {
    expect(classifyAiQueryIntent('حلل العميل المحدد بالتفصيل', mockDefaultFilters)).toBe('CUSTOMER_ANALYSIS');
    expect(classifyAiQueryIntent('customer deep dive analysis', mockDefaultFilters)).toBe('CUSTOMER_ANALYSIS');
  });

  // 15. Selected product analysis
  it('15. selected product analysis -> PRODUCT_ANALYSIS', () => {
    expect(classifyAiQueryIntent('حلل أداء المنتج المحدد', mockDefaultFilters)).toBe('PRODUCT_ANALYSIS');
    expect(classifyAiQueryIntent('product deep dive analysis', mockDefaultFilters)).toBe('PRODUCT_ANALYSIS');
  });

  // 16. Sales reps
  it('16. sales reps -> SALES_REPS', () => {
    expect(classifyAiQueryIntent('قارن أداء مناديب المبيعات', mockDefaultFilters)).toBe('SALES_REPS');
    expect(classifyAiQueryIntent('sales reps performance comparison', mockDefaultFilters)).toBe('SALES_REPS');
  });

  // 17. Retention
  it('17. retention -> RETENTION', () => {
    expect(classifyAiQueryIntent('ما هو معدل احتفاظ العملاء؟', mockDefaultFilters)).toBe('RETENTION');
    expect(classifyAiQueryIntent('calculate customer retention and churn rate', mockDefaultFilters)).toBe('RETENTION');
  });

  // 18. Risk
  it('18. risk -> RISK', () => {
    expect(classifyAiQueryIntent('مين العملاء المعرضين للفقد ومستوى المخاطر؟', mockDefaultFilters)).toBe('RISK');
    expect(classifyAiQueryIntent('high risk at-risk accounts', mockDefaultFilters)).toBe('RISK');
  });

  // 19. Geography
  it('19. geography -> GEOGRAPHY', () => {
    expect(classifyAiQueryIntent('كيف يتوزع الأداء عبر المحافظات والمناطق؟', mockDefaultFilters)).toBe('GEOGRAPHY');
    expect(classifyAiQueryIntent('sales performance by governorate and area', mockDefaultFilters)).toBe('GEOGRAPHY');
  });

  // 20. Top products
  it('20. top products -> PRODUCT_PERFORMANCE', () => {
    expect(classifyAiQueryIntent('ما المنتجات الأعلى مبيعا؟', mockDefaultFilters)).toBe('PRODUCT_PERFORMANCE');
    expect(classifyAiQueryIntent('show best selling products', mockDefaultFilters)).toBe('PRODUCT_PERFORMANCE');
  });

  // 21. Sales trend
  it('21. sales trend -> SALES_PERFORMANCE', () => {
    expect(classifyAiQueryIntent('حلل اتجاه المبيعات اليومية ومتوسط قيمة الطلب', mockDefaultFilters)).toBe('SALES_PERFORMANCE');
    expect(classifyAiQueryIntent('daily revenue and sales trend', mockDefaultFilters)).toBe('SALES_PERFORMANCE');
  });

  // 22. Executive summary
  it('22. executive summary -> EXECUTIVE_SUMMARY', () => {
    expect(classifyAiQueryIntent('لخص لي أداء المبيعات الحالية', mockDefaultFilters)).toBe('EXECUTIVE_SUMMARY');
    expect(classifyAiQueryIntent('executive summary overview', mockDefaultFilters)).toBe('EXECUTIVE_SUMMARY');
  });

  // 23. Unknown question
  it('23. unknown question -> GENERAL_EXECUTIVE_QUESTION', () => {
    expect(classifyAiQueryIntent('صباح الخير، كيف حالك؟', mockDefaultFilters)).toBe('GENERAL_EXECUTIVE_QUESTION');
    expect(classifyAiQueryIntent('what is the general outlook?', mockDefaultFilters)).toBe('GENERAL_EXECUTIVE_QUESTION');
  });

  // 24. Collision: Phone + Payment status -> PROHIBITED_DATA_REQUEST wins
  it('24. Collision: Phone + Payment status -> PROHIBITED_DATA_REQUEST', () => {
    expect(classifyAiQueryIntent('هات رقم تليفون العميل وحالة السداد', mockDefaultFilters)).toBe('PROHIBITED_DATA_REQUEST');
  });

  // 25. Collision: Payment status without PII
  it('25. Collision: Payment status without PII -> PAYMENT_STATUS', () => {
    expect(classifyAiQueryIntent('اعرض سداد العميل', mockDefaultFilters)).toBe('PAYMENT_STATUS');
  });

  // 26. Collision: Customer recent orders
  it('26. Collision: Customer recent orders -> CUSTOMER_RECENT_ORDERS', () => {
    expect(classifyAiQueryIntent('اعرض آخر أوردرات العميل', mockDefaultFilters)).toBe('CUSTOMER_RECENT_ORDERS');
  });

  // 27. Collision: Stopped buying + win-back context -> CUSTOMER_PRODUCT_HISTORY
  it('27. Collision: Stopped buying -> CUSTOMER_PRODUCT_HISTORY', () => {
    expect(classifyAiQueryIntent('إيه المنتجات اللي العميل وقف يشتريها وممكن نرجع نبيعها؟', mockDefaultFilters)).toBe(
      'CUSTOMER_PRODUCT_HISTORY'
    );
  });

  // 28. Collision: New cross-sell products -> CROSS_SELL
  it('28. Collision: New cross-sell products -> CROSS_SELL', () => {
    expect(classifyAiQueryIntent('إيه منتجات جديدة ممكن نبيعها للعميل؟', mockDefaultFilters)).toBe('CROSS_SELL');
  });

  // 29. Active customer filter + general summary query -> EXECUTIVE_SUMMARY (NOT CUSTOMER_ANALYSIS)
  it('29. Active customer filter + "لخص مبيعات الشركة كلها" -> EXECUTIVE_SUMMARY', () => {
    const filterWithCustomer: GlobalFilterState = {
      ...mockDefaultFilters,
      customerId: 30709,
      customerName: 'Secret VIP Client',
    };
    expect(classifyAiQueryIntent('لخص مبيعات الشركة كلها', filterWithCustomer)).toBe('EXECUTIVE_SUMMARY');
  });

  // 30. shortcutIntent bypass authoritative behavior
  it('30. shortcutIntent bypass authoritative behavior', () => {
    const resolved = resolveAiIntent({
      message: 'أداء عام غير محدد',
      filters: mockDefaultFilters,
      shortcutIntent: 'PRODUCT_ANALYSIS',
    });
    expect(resolved).toBe('PRODUCT_ANALYSIS');
  });

  // 31. Helper: intentRequiresCustomer
  it('31. intentRequiresCustomer identifies customer-dependent intents', () => {
    expect(intentRequiresCustomer('CUSTOMER_RECENT_ORDERS')).toBe(true);
    expect(intentRequiresCustomer('CUSTOMER_PRODUCT_HISTORY')).toBe(true);
    expect(intentRequiresCustomer('CROSS_SELL')).toBe(true);
    expect(intentRequiresCustomer('CUSTOMER_ANALYSIS')).toBe(true);

    expect(intentRequiresCustomer('EXECUTIVE_SUMMARY')).toBe(false);
    expect(intentRequiresCustomer('PRODUCT_ANALYSIS')).toBe(false);
    expect(intentRequiresCustomer('ORDER_LOOKUP')).toBe(false);
    expect(intentRequiresCustomer('SALES_REPS')).toBe(false);
  });

  // 32. Helper: intentRequiresProduct
  it('32. intentRequiresProduct identifies product-dependent intents', () => {
    expect(intentRequiresProduct('PRODUCT_ANALYSIS')).toBe(true);
    expect(intentRequiresProduct('PRODUCT_CUSTOMERS')).toBe(true);

    expect(intentRequiresProduct('CUSTOMER_ANALYSIS')).toBe(false);
    expect(intentRequiresProduct('PRODUCT_PERFORMANCE')).toBe(false);
    expect(intentRequiresProduct('EXECUTIVE_SUMMARY')).toBe(false);
  });

  // 33. Helper: getDeterministicIntentResponse
  it('33. getDeterministicIntentResponse returns privacy refusal for PROHIBITED_DATA_REQUEST and null for others', () => {
    const refusal = getDeterministicIntentResponse('PROHIBITED_DATA_REQUEST');
    expect(refusal).toBe(
      'عذرًا، بيانات التواصل الشخصية والمعلومات البنكية وتفاصيل التحصيلات الفردية غير متاحة لأسباب تتعلق بالخصوصية وأمن البيانات.'
    );
    expect(getDeterministicIntentResponse('EXECUTIVE_SUMMARY')).toBeNull();
    expect(getDeterministicIntentResponse('CUSTOMER_ANALYSIS')).toBeNull();
  });
});
