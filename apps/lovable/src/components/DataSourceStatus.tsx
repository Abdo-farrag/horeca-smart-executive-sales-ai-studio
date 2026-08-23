import React from 'react';
import { Database, AlertTriangle, CheckCircle2, RefreshCw, HelpCircle } from 'lucide-react';

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
  compact = false
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'live':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500 animate-pulse',
          icon: CheckCircle2,
          labelAr: 'مباشر — Supabase',
          labelEn: 'Live — Supabase'
        };
      case 'loading':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
          dot: 'bg-blue-500 animate-ping',
          icon: RefreshCw,
          spinIcon: true,
          labelAr: 'جاري تحميل Supabase...',
          labelEn: 'Loading Supabase...'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
          dot: 'bg-red-500',
          icon: AlertTriangle,
          labelAr: 'خطأ Supabase (وضع fallback)',
          labelEn: 'Supabase Error (Fallback)'
        };
      case 'mock_fallback':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
          icon: HelpCircle,
          labelAr: 'وضع البيانات التجريبية (Fallback)',
          labelEn: 'Mock Fallback Mode'
        };
      case 'not_configured':
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
          dot: 'bg-slate-400',
          icon: Database,
          labelAr: 'غير مهيأ (بيانات توضيحية)',
          labelEn: 'Not Configured (Demo Data)'
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
    <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${config.bg} ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
        <Icon className={`w-3.5 h-3.5 shrink-0 ${config.spinIcon ? 'animate-spin' : ''}`} />
        <span className="font-extrabold">{isAr ? config.labelAr : config.labelEn}</span>
        
        {lastUpdated && status === 'live' && (
          <span className="text-[10px] opacity-75 font-mono">
            ({isAr ? 'آخر تحديث:' : 'Updated:'} {lastUpdated})
          </span>
        )}
      </div>

      {status === 'error' && errorMessage && (
        <span className="text-[11px] text-red-600 dark:text-red-400 font-normal truncate max-w-xs">
          {errorMessage}
        </span>
      )}

      {onRetry && (status === 'error' || status === 'mock_fallback') && (
        <button
          onClick={onRetry}
          className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold transition-all flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
        </button>
      )}
    </div>
  );
};
