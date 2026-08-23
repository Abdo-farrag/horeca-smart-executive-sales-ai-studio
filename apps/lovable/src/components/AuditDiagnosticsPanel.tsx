import React from 'react';
import { Zap, CheckCircle2, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { ExecutiveDiagnostics } from '../services/executiveService';

interface AuditDiagnosticsPanelProps {
  diagnostics: ExecutiveDiagnostics;
  isAr: boolean;
  lastFetchedAt?: string | null;
  error?: string | null;
  onRetry?: () => void;
}

export const AuditDiagnosticsPanel: React.FC<AuditDiagnosticsPanelProps> = ({
  diagnostics: diag,
  isAr,
  lastFetchedAt,
  error,
  onRetry
}) => {
  return (
    <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>
                {isAr
                  ? 'لوحة تدقيق واختبار الاتصال المباشر (Supabase Audit Diagnostics)'
                  : 'Supabase Live Connection Audit & Diagnostics'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'بيانات الاستعلام المباشرة من مناظر Odoo 18 والمقارنة بالمراجع المعتمدة'
                : 'Live query metrics from Odoo 18 views & reference validation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة الفحص' : 'Re-sync & Audit'}</span>
            </button>
          )}

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              diag.dataMode === 'Live — Supabase'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : diag.dataMode === 'Mock fallback'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {isAr ? `نمط البيانات: ${diag.dataMode}` : `Data Mode: ${diag.dataMode}`}
          </span>
          <span className="bg-blue-950 text-blue-300 text-[9px] font-extrabold px-2 py-0.5 rounded border border-blue-800">
            [SECTION STATUS: Live]
          </span>
        </div>
      </div>

      {/* Error Banner if any */}
      {(error || diag.queryErrorMsg) && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">{isAr ? 'تفاصيل الخطأ:' : 'Error details:'}</span>
              <span>{error || diag.queryErrorMsg}</span>
            </div>
          </div>
        </div>
      )}

      {/* Technical Diagnostics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2 text-xs">
        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'مستضيف Supabase' : 'Supabase Host'}
          </div>
          <div className="font-mono font-bold text-slate-200 mt-0.5 truncate text-[10px]">
            {diag.supabaseHost}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'فترة الاستعلام' : 'Date Range'}
          </div>
          <div className="font-mono font-bold text-blue-300 mt-0.5 text-[10px]">
            {diag.selectedDateRange.startDate} → {diag.selectedDateRange.endDate}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'المنظر المستعلم' : 'Source View'}
          </div>
          <div className="font-mono font-bold text-emerald-400 mt-0.5 text-[10px] truncate">
            {diag.sourceViewQueried}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'حقل الإيرادات' : 'Revenue Field'}
          </div>
          <div className="font-mono font-bold text-cyan-400 mt-0.5 text-[10px]">
            {diag.revenueFieldUsed || 'price_total'}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'حقل التاريخ' : 'Date Field'}
          </div>
          <div className="font-mono font-bold text-indigo-300 mt-0.5 text-[10px]">
            {diag.dateFieldUsed || 'date_order'}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'سجلات الاستعلام' : 'Fetched Rows'}
          </div>
          <div className="font-mono font-bold text-amber-300 mt-0.5 text-xs">
            {diag.rawRowCountReturned.toLocaleString('ar-EG')}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'دفعة التصفح' : 'Pagination Batches'}
          </div>
          <div className="font-mono font-bold text-purple-300 mt-0.5 text-xs">
            {diag.paginationBatches || 1} {isAr ? 'دفعة' : 'batches'}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'حالة الاستعلام' : 'Query Completion'}
          </div>
          <div
            className={`font-mono font-bold mt-0.5 text-xs ${
              diag.queryCompletedFully ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {diag.queryCompletedFully
              ? isAr
                ? 'مكتمل'
                : 'Completed'
              : isAr
              ? 'جزئي'
              : 'Partial'}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'وضع احتياطي' : 'Mock Fallback?'}
          </div>
          <div
            className={`font-mono font-bold mt-0.5 text-xs ${
              diag.isMockFallback ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {diag.isMockFallback
              ? isAr
                ? 'نعم (Mock)'
                : 'Yes (Mock)'
              : isAr
              ? 'لا (مباشر)'
              : 'No (Live)'}
          </div>
        </div>

        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase font-black">
            {isAr ? 'آخر تحديث' : 'Last Fetch'}
          </div>
          <div className="font-mono font-bold text-slate-300 mt-0.5 text-[10px] truncate">
            {lastFetchedAt ||
              (diag.queryTimestamp
                ? new Date(diag.queryTimestamp).toLocaleTimeString('ar-EG')
                : 'N/A')}
          </div>
        </div>
      </div>

      {/* Live Query Figures & Company Mapping Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        
        {/* Query Output Numbers */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-black uppercase text-blue-400 tracking-wider mb-2 flex items-center justify-between">
            <span>{isAr ? 'نتائج الاستعلام المباشرة' : 'Live Query Figures'}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {diag.selectedDateRange.startDate} → {diag.selectedDateRange.endDate}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">{isAr ? 'عدد الطلبات المؤكدة:' : 'Confirmed Orders:'}</span>
              <span className="font-mono font-black text-white">
                {diag.confirmedOrdersCount.toLocaleString('ar-EG')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">{isAr ? 'إجمالي المبيعات:' : 'Total Sales Amount:'}</span>
              <span className="font-mono font-black text-emerald-400">
                {diag.totalSalesAmountEgp.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">{isAr ? 'العملاء المميزون:' : 'Unique Customers:'}</span>
              <span className="font-mono font-bold text-slate-200">
                {diag.uniqueCustomersCount.toLocaleString('ar-EG')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">{isAr ? 'نطاق التواريخ:' : 'Min/Max Dates:'}</span>
              <span className="font-mono font-semibold text-slate-300 text-[10px]">
                {diag.minOrderDate || 'N/A'} → {diag.maxOrderDate || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Raw Company Mapping List */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2">
            <span>{isAr ? 'أسماء الشركات الخام المرتجعة من قاعدة البيانات' : 'Raw Company Strings Returned from Supabase'}</span>
          </div>

          {diag.rawCompanyBreakdown.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-2">
              {isAr ? 'لا توجد سجلات مرتجعة' : 'No rows returned'}
            </div>
          ) : (
            <div className="space-y-1.5 text-xs font-mono">
              {diag.rawCompanyBreakdown.map((c) => (
                <div key={c.rawCompanyName} className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="font-bold text-slate-200">"{c.rawCompanyName}"</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {c.ordersCount.toLocaleString('ar-EG')} {isAr ? 'طلب' : 'orders'}
                    </span>
                    <span className="font-bold text-emerald-400">
                      {c.totalAmount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Reference Validation & Discrepancy Report Box */}
      {diag.hasValidationReference ? (
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            diag.discrepancyAnalysis.isExactMatch
              ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200'
              : 'bg-slate-900 border-amber-500/60 text-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold">
            <div className="flex items-center gap-2 text-sm">
              {diag.discrepancyAnalysis.isExactMatch ? (
                <span className="text-emerald-400 font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `تطابق تام مع مرجع (${diag.validationLabel})`
                      : `EXACT MATCH with validated reference (${diag.validationLabel})!`}
                  </span>
                </span>
              ) : (
                <span className="text-amber-400 font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `تقرير المقارنة بالمرجع المعتمد (${diag.validationLabel})`
                      : `Validation Reference Report (${diag.validationLabel})`}
                  </span>
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              {isAr
                ? `الهدف المعتمد: ${diag.targetReference.confirmedOrders.toLocaleString('ar-EG')} طلب | ${diag.targetReference.totalSalesEgp.toLocaleString('ar-EG')} ج.م`
                : `Reference Target: ${diag.targetReference.confirmedOrders.toLocaleString('en-US')} orders | ${diag.targetReference.totalSalesEgp.toLocaleString('en-US')} EGP`}
            </div>
          </div>

          {!diag.discrepancyAnalysis.isExactMatch && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">{isAr ? 'الفروق في عدد الطلبات:' : 'Orders Variance:'} </span>
                  <span className="font-mono font-bold text-amber-300">
                    {diag.discrepancyAnalysis.ordersDifference > 0 ? '+' : ''}
                    {diag.discrepancyAnalysis.ordersDifference.toLocaleString('ar-EG')} {isAr ? 'طلب' : 'orders'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">{isAr ? 'الفروق في إجمالي المبيعات:' : 'Sales Variance:'} </span>
                  <span className="font-mono font-bold text-amber-300">
                    {diag.discrepancyAnalysis.salesDifferenceEgp > 0 ? '+' : ''}
                    {diag.discrepancyAnalysis.salesDifferenceEgp.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold">{isAr ? 'الفلاتر المطبقة:' : 'Applied Filters:'} </span>
                <span className="font-mono text-slate-300">
                  {diag.discrepancyAnalysis.appliedFiltersList.join(' | ')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold">{isAr ? 'تحليل أسباب الفروق:' : 'Audit Cause Breakdown:'}</span>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-mono text-slate-300">
                  {diag.discrepancyAnalysis.potentialCauses.map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-blue-800/60 bg-blue-950/40 text-blue-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-blue-300">
            <Info className="w-4 h-4 text-blue-400" />
            <span>{isAr ? 'ملاحظة التدقيق للفترة المختارة' : 'Audit Reference Notice'}</span>
          </div>
          <p className="text-[11px] font-mono text-slate-300">
            {isAr
              ? 'لا مرجع تدقيق ثابت لهذه الفترة المحددة. يتم عرض نتائج Supabase المباشرة بدون مقارنة مرجعية.'
              : 'No fixed validation reference for this selected period. Live Supabase results are displayed without reference comparison.'}
          </p>
        </div>
      )}

    </div>
  );
};
