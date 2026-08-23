import React, { useState } from 'react';
import { UserMinus, AlertTriangle, Sparkles, RefreshCw, PhoneCall, CheckCircle2, ShieldAlert, ArrowRight, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LostCustomerDashboard: React.FC = () => {
  const { language, lostCustomers } = useApp();
  const isAr = language === 'ar';

  const [activePlanCustId, setActivePlanCustId] = useState<string | null>(null);

  const totalLostRev = lostCustomers.reduce((acc, curr) => acc + curr.lostRevenueYtd, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-red-900/50 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>{isAr ? 'مركز التعافي من المغادرة • Churn Control' : 'Churn Prevention & Recovery Node'}</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">
            {isAr ? 'العملاء المفقودون وخطة الاستعادة التوجيهية' : 'Lost Account Churn & Recovery Plan'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {isAr
              ? 'تتبع الحسابات المغادرة، تحليل الأسباب الجذرية (السعر، تأخير التوصيل، جودة المنتج)، وتوليد خطط استعادة فورية بذكاء الاصطناعي.'
              : 'Track churned clients, identify root causes (pricing, delay, quality), and deploy AI recovery plans.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-red-900/40 border border-red-700/60 text-right rtl:text-right ltr:text-left shrink-0">
          <div className="text-[10px] text-red-200 uppercase tracking-wider">{isAr ? 'إجمالي الإيرادات المعرضة للفقدان' : 'Total Churned Revenue'}</div>
          <div className="text-2xl font-black text-white">{totalLostRev.toLocaleString('ar-EG')} ج.م</div>
        </div>
      </div>

      {/* Churned Clients Table & Recovery Recommendations */}
      <div className="space-y-4">
        {lostCustomers.map((lc) => (
          <div
            key={lc.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-red-500/40 transition-all space-y-4"
          >
            {/* Main Row Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold flex items-center justify-center shrink-0">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {isAr ? lc.customerNameAr : lc.customerNameEn}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {lc.sector} • {lc.company}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {lc.area} • {isAr ? `المندوب المسؤول: ${lc.salesRepNameAr}` : `Sales Rep: ${lc.salesRepNameEn}`}
                  </div>
                </div>
              </div>

              {/* Priority & Status */}
              <div className="flex items-center gap-3">
                <div className="text-right rtl:text-right ltr:text-left">
                  <div className="text-[10px] text-slate-400">{isAr ? 'الإيراد المفقود' : 'Lost Revenue'}</div>
                  <div className="font-extrabold text-sm text-red-600 dark:text-red-400">
                    {lc.lostRevenueYtd.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold ${
                    lc.priority === 'high'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-300'
                      : lc.priority === 'medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isAr ? `أولوية ${lc.priority}` : `${lc.priority} Priority`}
                </span>
              </div>
            </div>

            {/* Churn Cause & Recovery Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Root Cause Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>{isAr ? 'السبب الجذر للمغادرة (Churn Root Cause):' : 'Churn Root Cause:'}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isAr ? lc.churnReasonAr : lc.churnReasonEn}
                </p>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  {isAr ? `تاريخ آخر طلب: ${lc.lastOrderDate} (انقطاع منذ ${lc.daysSilent} يوماً)` : `Last order: ${lc.lastOrderDate} (${lc.daysSilent} days silent)`}
                </div>
              </div>

              {/* AI Recovery Recommendation Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80">
                <div className="font-bold text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isAr ? 'توصية خطة الاستعادة (Recovery Action):' : 'Recovery Action:'}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isAr ? lc.recoveryRecommendationAr : lc.recoveryRecommendationEn}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                    {isAr ? `حالة الاستعادة: ${lc.recoveryStatus}` : `Status: ${lc.recoveryStatus}`}
                  </span>
                  <button
                    onClick={() => setActivePlanCustId(activePlanCustId === lc.id ? null : lc.id)}
                    className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    <span>{isAr ? 'توليد مسودة عقد الاستعادة' : 'Generate Recovery Contract'}</span>
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                  </button>
                </div>
              </div>

            </div>

            {/* Generated Recovery Draft Drawer */}
            {activePlanCustId === lc.id && (
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2 border border-slate-700 animate-in fade-in">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? 'مسودة خطة الاستعادة المعتمدة مسبقاً:' : 'Generated Strategic Recovery Draft:'}</span>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-300">
{isAr ? `[خطة استعادة حساب] - ${lc.customerNameAr}
الموجه إلى: مدير مشتريات ${lc.customerNameAr}
الموضوع: تقديم عرض توريد استثنائي معدل وتحديث جدول التوصيل

سعادة مدير المشتريات المحترم،
نحييكم من مجموعة هوريكا سمارت وماس، وبناءً على مراجعة الإدارة العليا للتوريد:
1. يسرنا اعتماد حسم حجمي خاص بنسبة 5% على طلبيات الأجبان والزيوت.
2. جدولة شاحنة تبريد خاصة للتوصيل اليومي المباشر قبل الساعة 09:00 صباحاً.
3. تمديد فترة الذمم إلى 60 يوماً مع تسهيلات السداد.

نأمل تأكيد رغبتكم لتفعيل العقد فوراً.
المدير التجاري - هوريكا سمارت` : `[ACCOUNT RECOVERY PLAN] - ${lc.customerNameEn}
Attention: Procurement Director
Subject: Revised Contract Offer & Dedicated Supply Schedule

Dear Procurement Director,
Following executive review at Horeca Smart & MAS:
1. Approved 5% volume rebate on bulk cheese & oils.
2. Dedicated refrigerated dispatch before 09:00 AM daily.
3. Extended payment terms to 60 days.

Commercial Director - Horeca Smart`}
                </pre>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};
