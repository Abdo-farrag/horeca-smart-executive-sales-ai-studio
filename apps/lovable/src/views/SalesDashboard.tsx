import React from 'react';
import { Target, FileSpreadsheet } from 'lucide-react';
import { ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { useApp } from '../context/AppContext';

export const SalesDashboard: React.FC = () => {
  const { language, orders } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? 'لوحة تحليلات المبيعات والإيرادات' : 'Sales & Revenue Intelligence'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr ? 'متابعة حركة المبيعات، نمو الأهداف الشهرية، ومتوسط قيمة الطلبيات' : 'Monthly sales trends, revenue targets, and AOV analysis'}
          </p>
        </div>

        <button
          onClick={() => alert(isAr ? 'تم تصدير تقرير المبيعات بنجاح' : 'Sales report exported')}
          className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isAr ? 'تصدير تقرير Excel' : 'Export Sales Excel'}</span>
        </button>
      </div>

      {/* Target vs Actual Revenue Trend Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {isAr ? 'المبيعات الفعلية مقابل الهدف المستهدف (Target vs Actual)' : 'Actual Revenue vs Target Benchmark'}
            </h3>
            <p className="text-xs text-slate-500">{isAr ? 'مقارنة إنجاز الشهور السبعة الأولى لعام 2026' : 'First 7 months YTD target achievement'}</p>
          </div>
          <Target className="w-4 h-4 text-blue-600" />
        </div>

        <div className="h-72 w-full flex items-center justify-center">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isAr ? 'التفاصيل التشغيلية غير متاحة لهذا المؤشر حالياً' : 'Operational details currently unavailable for this metric'}
          </p>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
          {isAr ? 'سجل آخر طلبات التوريد المنجزة' : 'Recent Completed Fulfillment Orders'}
        </h3>

        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right rtl:text-right ltr:text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">{isAr ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="p-3">{isAr ? 'الشركة' : 'Company'}</th>
                  <th className="p-3">{isAr ? 'العميل' : 'Client'}</th>
                  <th className="p-3">{isAr ? 'المندوب' : 'Sales Rep'}</th>
                  <th className="p-3">{isAr ? 'المنطقة' : 'Territory'}</th>
                  <th className="p-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono text-blue-600 font-bold">{ord.orderNumber}</td>
                    <td className="p-3 font-semibold">{ord.company}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {isAr ? ord.customerNameAr : ord.customerNameEn}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {isAr ? ord.salesRepNameAr : ord.salesRepNameEn}
                    </td>
                    <td className="p-3 text-slate-500">{ord.area}</td>
                    <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                      {ord.amount.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            {isAr ? 'لا توجد بيانات تفصيلية متاحة حالياً' : 'No detailed transaction data currently available'}
          </div>
        )}
      </div>

    </div>
  );
};
