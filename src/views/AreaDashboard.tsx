import React from 'react';
import { MapPin, Users, TrendingUp, Package, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AreaDashboard: React.FC = () => {
  const { language, areas } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          {isAr ? 'لوحة أداء المناطق والتوزيع الجغرافي' : 'Territory & Regional Area Intelligence'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isAr ? 'تحليل الإيرادات الحجمية، كثافة الحسابات الفندقية والمطاعم، والمندوب المسؤول بكل منطقة' : 'Territorial revenue, client density, top category, and responsible rep'}
        </p>
      </div>

      {/* Areas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {areas.map(area => (
          <div
            key={area.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-bold text-xs text-blue-600 dark:text-blue-400">
                  <MapPin className="w-4 h-4" />
                  <span>{area.city}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  area.growthPercent >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                  {area.growthPercent >= 0 ? `+${area.growthPercent}%` : `${area.growthPercent}%`}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                {isAr ? area.nameAr : area.nameEn}
              </h3>

              <div className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                {area.revenue.toLocaleString('ar-EG')} ج.م
              </div>

              <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'الفئة الرائدة:' : 'Top Category:'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{area.topCategory}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'المندوب المسؤول:' : 'Responsible Rep:'}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {isAr ? area.responsibleRepNameAr : area.responsibleRepNameEn}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'معدل الاحتفاظ:' : 'Retention Rate:'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{area.retentionRate}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{area.customersCount} {isAr ? 'عميل بالمحافظة' : 'clients'}</span>
              <span>{area.ordersCount} {isAr ? 'طلب شحن' : 'dispatches'}</span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
