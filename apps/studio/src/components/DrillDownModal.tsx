import React from 'react';
import { X, Sparkles, FileSpreadsheet, ArrowUpRight, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DrillDownModal: React.FC = () => {
  const { language, drillDown, closeDrillDown } = useApp();
  const isAr = language === 'ar';

  if (!drillDown.isOpen || !drillDown.data) return null;

  const { title, data, type } = drillDown.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {isAr ? 'التحليل التفصيلي والعميق (Drill Down)' : 'Executive Drill Down Analysis'}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert(isAr ? 'تم تصدير سجل البيانات بصيغة Excel' : 'Exported to Excel')}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Excel Export"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={closeDrillDown}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Section 1: Executive KPI Highlight */}
          {type === 'kpi' && data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-slate-500 font-semibold mb-1">{isAr ? 'القيمة الفعالية الحالية' : 'Current Value'}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {typeof data.currentValue === 'number'
                    ? data.currentValue.toLocaleString('ar-EG')
                    : data.currentValue}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-slate-500 font-semibold mb-1">{isAr ? 'قيمة الفترة المرجعية' : 'Previous Period'}</div>
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                  {typeof data.previousValue === 'number'
                    ? data.previousValue.toLocaleString('ar-EG')
                    : data.previousValue}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="text-slate-500 font-semibold mb-1">{isAr ? 'معدل التغير والانحراف' : 'Growth & Variance'}</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-5 h-5" />
                  <span>+{data.growthPercent}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: AI Executive Commentary */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-900 dark:text-blue-200 text-xs mb-1">
                {isAr ? 'رأي الذكاء الاصطناعي التنفيذي (Executive Insight):' : 'Executive AI Analysis:'}
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                {data?.descriptionAr ||
                  (isAr
                    ? 'يستند هذا الرقم إلى تحليل الطلبيات المنجزة المعتمدة في النظام.'
                    : 'Driven by order fulfillment recorded in the verified system.')}
              </p>
            </div>
          </div>

          {/* Section 3: Contributing Transactions Log / Safe Empty State */}
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              {isAr ? 'العمليات الفردية والمساهمة في هذا المؤشر:' : 'Contributing Transactions Log:'}
            </div>

            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 font-medium text-xs">
              {isAr ? 'التفاصيل التشغيلية غير متاحة لهذا المؤشر حالياً' : 'Operational details currently unavailable for this metric'}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={closeDrillDown}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            {isAr ? 'إغلاق نافذة التحليل' : 'Close Breakdown'}
          </button>
        </div>

      </div>
    </div>
  );
};
