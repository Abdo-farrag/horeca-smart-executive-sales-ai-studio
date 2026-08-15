import React from 'react';
import { TrendingUp, TrendingDown, Info, ExternalLink } from 'lucide-react';
import { KpiMetric } from '../types';
import { useApp } from '../context/AppContext';

interface KpiCardProps {
  kpi: KpiMetric;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
  const { language, openDrillDown } = useApp();
  const isAr = language === 'ar';

  const isPositive = kpi.growthPercent >= 0;
  const isGood = kpi.isPositiveGrowthGood ? isPositive : !isPositive;

  const formatVal = (val: number, unit: string) => {
    if (unit === 'currency') {
      return (
        <span>
          {val.toLocaleString('ar-EG', { maximumFractionDigits: 0 })}{' '}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            {isAr ? 'ج.م' : 'EGP'}
          </span>
        </span>
      );
    } else if (unit === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString('ar-EG');
  };

  // Generate SVG Sparkline polyline points
  const sparklineMin = Math.min(...kpi.sparkline);
  const sparklineMax = Math.max(...kpi.sparkline);
  const range = sparklineMax - sparklineMin || 1;
  
  const points = kpi.sparkline
    .map((val, idx) => {
      const x = (idx / (kpi.sparkline.length - 1)) * 100;
      const y = 30 - ((val - sparklineMin) / range) * 24; // 30px height container
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      onClick={() =>
        openDrillDown({
          type: 'kpi',
          title: isAr ? kpi.titleAr : kpi.titleEn,
          data: kpi
        })
      }
      className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between"
    >
      
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span>{isAr ? kpi.titleAr : kpi.titleEn}</span>
          <Info className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Growth Tag */}
        <div
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold tracking-tight ${
            isGood
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span dir="ltr">{Math.abs(kpi.growthPercent).toFixed(1)}%</span>
        </div>
      </div>

      {/* Main KPI Value */}
      <div className="my-1.5 flex items-baseline justify-between gap-2">
        <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatVal(kpi.currentValue, kpi.unit)}
        </div>

        {/* Drill Down Indicator Icon */}
        <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
      </div>

      {/* Bottom Section: Previous Period & Sparkline */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div>
          <span>{isAr ? 'الفترة السابقة: ' : 'Prev Period: '}</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {formatVal(kpi.previousValue, kpi.unit)}
          </span>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="w-20 h-7 shrink-0">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
            <polyline
              fill="none"
              stroke={isGood ? '#10b981' : '#ef4444'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>

    </div>
  );
};
