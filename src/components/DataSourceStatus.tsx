import React from 'react';
import { AlertTriangle, CheckCircle2, Database, HelpCircle, RefreshCw } from 'lucide-react';

export type DataSourceState = 'live' | 'loading' | 'error' | 'mock_fallback' | 'not_configured';

interface DataSourceStatusProps {
  status: DataSourceState;
  isAr?: boolean;
  lastUpdated?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export const DataSourceStatus: React.FC<DataSourceStatusProps> = ({
  status,
  isAr = true,
  lastUpdated,
  errorMessage,
  onRetry,
  className = '',
  compact = false,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'live':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500 animate-pulse',
          icon: CheckCircle2,
          labelAr: 'مباشر — Supabase',
          labelEn: 'Live — Supabase',
        };
      case 'loading':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
          dot: 'bg-blue-500 animate-ping',
          icon: RefreshCw,
          spinIcon: true,
          labelAr: 'جاري تحميل البيانات الموثقة...',
          labelEn: 'Loading verified data...',
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
          dot: 'bg-red-500',
          icon: AlertTriangle,
          labelAr: 'المصدر غير متاح — لا توجد بيانات بديلة',
          labelEn: 'Source unavailable — no substitute data',
        };
      case 'mock_fallback':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
          icon: HelpCircle,
          labelAr: 'مصدر غير موثّق — غير مستخدم للمؤشرات التجارية',
          labelEn: 'Unverified source — excluded from commercial KPIs',
        };
      case 'not_configured':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
          dot: 'bg-slate-400',
          icon: Database,
          labelAr: 'Supabase غير مهيأ — البيانات التجارية محجوبة',
          labelEn: 'Supabase not configured — commercial data withheld',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-extrabold ${config.bg} ${className}`}>
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{isAr ? config.labelAr : config.labelEn}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 ${config.bg} ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${'spinIcon' in config && config.spinIcon ? 'animate-spin' : ''}`} />
          <div className="min-w-0">
            <div className="text-xs font-black">{isAr ? config.labelAr : config.labelEn}</div>
            {lastUpdated && (
              <div className="text-[10px] opacity-70 mt-0.5 truncate">
                {isAr ? 'آخر تحديث:' : 'Last update:'} {lastUpdated}
              </div>
            )}
            {errorMessage && status === 'error' && (
              <div className="text-[10px] opacity-80 mt-1 truncate max-w-2xl">{errorMessage}</div>
            )}
          </div>
        </div>
        {onRetry && (status === 'error' || status === 'not_configured') && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-current/20 text-xs font-black hover:bg-white/30 dark:hover:bg-black/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
