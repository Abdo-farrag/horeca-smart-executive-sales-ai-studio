import React from 'react';
import { FolderTree, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CategoryDashboard: React.FC = () => {
  const { language, setCurrentView } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              [SECTION STATUS: Pending Data Quality]
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? 'لوحة تحليلات الفئات (Category Analytics)' : 'Category Performance Intelligence'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? 'حالة التغطية والجاهزية لتحليلات الفئات الغذائية' : 'Coverage readiness for food categories'}
          </p>
        </div>

        <button
          onClick={() => setCurrentView('settings')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm self-start sm:self-center"
        >
          <FolderTree className="w-4 h-4" />
          <span>{isAr ? 'مراجعة وتصنيف المنتجات' : 'Product Category Review'}</span>
          {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Pending Data Quality Warning Banner */}
      <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-8 shadow-sm text-center max-w-2xl mx-auto space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl w-fit mx-auto border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-10 h-10" />
        </div>
        
        <div className="space-y-3">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
            [SECTION STATUS: Pending Data Quality]
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white pt-2">
            {isAr ? 'تغطية الفئات غير مكتملة في نظام أودو' : 'Category Data Quality Pending'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            {isAr
              ? 'يجب استكمال فئات المنتجات في أودو قبل تفعيل تحليلات الفئات. يمكنك مراجعة واعتماد مقترحات الفئات في شاشة جودة البيانات.'
              : 'Product categories must be completed in Odoo before category analytics can be activated. You can review and approve category mapping suggestions under Settings.'}
          </p>

          <div className="pt-2">
            <button
              onClick={() => setCurrentView('settings')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <FolderTree className="w-4 h-4" />
              <span>
                {isAr
                  ? 'انتقال إلى مراجعة وتصنيف المنتجات (Settings → Data Quality → Product Categories)'
                  : 'Go to Product Category Review (Settings → Data Quality → Product Categories)'}
              </span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

