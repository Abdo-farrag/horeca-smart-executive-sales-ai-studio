import React from 'react';
import { LayoutDashboard, TrendingUp, Users, UserCheck, Package, FolderTree, MapPin, UserMinus, Sparkles, Settings, HelpCircle, ShieldCheck, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAccess } from '../context/AccessContext';
import { canViewAppView, type AppViewId } from '../access/viewCapabilities';

export const Sidebar: React.FC = () => {
  const { language, currentView, setCurrentView, setAiPanelOpen } = useApp();
  const { profile } = useAccess();
  const isAr = language === 'ar';
  if (!profile) return null;

  const menuItems: Array<{ id: AppViewId; labelAr: string; labelEn: string; icon: React.ComponentType<{ className?: string }>; badgeAr?: string; badgeEn?: string; badgeColor?: string; isSpecial?: boolean }> = [
    { id: 'executive', labelAr: 'اللوحة التنفيذية', labelEn: 'Executive Overview', icon: LayoutDashboard, badgeAr: 'الرئيسية', badgeEn: 'Main' },
    { id: 'sales', labelAr: 'تحليلات المبيعات', labelEn: 'Sales Intelligence', icon: TrendingUp },
    { id: 'customers', labelAr: 'تحليلات العملاء', labelEn: 'Customer Analytics', icon: Users },
    { id: 'customer-action-center', labelAr: 'مركز إجراءات العملاء', labelEn: 'Customer Action Center', icon: Target, badgeAr: 'تشغيلي', badgeEn: 'Ops', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { id: 'sales-rep-daily-action-center', labelAr: 'مركز عمل المندوب اليومي', labelEn: 'Sales Rep Daily Action Center', icon: UserCheck, badgeAr: 'يومي', badgeEn: 'Daily', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    { id: 'sales-reps', labelAr: 'مندوبو المبيعات', labelEn: 'Sales Representatives', icon: UserCheck },
    { id: 'products', labelAr: 'المنتجات وتصنيف ABC', labelEn: 'Products & ABC/XYZ', icon: Package },
    { id: 'categories', labelAr: 'أداء الفئات والقطاعات', labelEn: 'Category Performance', icon: FolderTree },
    { id: 'areas', labelAr: 'المناطق والتوزيع الجغرافي', labelEn: 'Area Territories', icon: MapPin },
    { id: 'lost-customers', labelAr: 'العملاء المفقودون وخطة التعافي', labelEn: 'Lost Customer Churn', icon: UserMinus },
    { id: 'ai-assistant', labelAr: 'مساعد الذكاء الاصطناعي', labelEn: 'AI Assistant', icon: Sparkles, isSpecial: true },
  ];

  const visibleItems = menuItems.filter((item) => canViewAppView(profile.role, item.id));
  const canViewSettings = canViewAppView(profile.role, 'settings');

  return (
    <aside className="w-64 shrink-0 hidden lg:block bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r rtl:border-r-0 rtl:border-l border-slate-800 p-4 transition-all duration-200">
      <div className="mb-6 px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-slate-100 tracking-wide truncate">{profile.displayName}</div>
          <div className="text-[10px] text-emerald-400 font-mono uppercase">{profile.role}</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{isAr ? 'القائمة المسموحة' : 'Allowed Menu'}</div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button key={item.id} onClick={() => { if (item.id === 'ai-assistant') { setAiPanelOpen(true); return; } setCurrentView(item.id); }} className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-black' : item.isSpecial ? 'bg-gradient-to-r from-indigo-900/40 to-blue-900/40 text-blue-300 border border-blue-800/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isSpecial ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{isAr ? item.labelAr : item.labelEn}</span>
              </div>
              {item.badgeAr && <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>{isAr ? item.badgeAr : item.badgeEn}</span>}
            </button>
          );
        })}
      </div>

      {canViewSettings && (
        <div className="mt-8 pt-4 border-t border-slate-800/80 space-y-1">
          <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Settings className="w-4 h-4" />
            <span>{isAr ? 'إعدادات المنصة' : 'Platform Settings'}</span>
          </button>
        </div>
      )}

      <div className="mt-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-blue-400" /><span>{isAr ? 'نطاق البيانات' : 'Data Scope'}</span></div>
        <p className="leading-snug text-[10px]">{profile.role === 'sales_rep' ? (isAr ? 'بيانات المندوب الحالي فقط' : 'Current salesperson only') : profile.role === 'supervisor' ? (isAr ? 'بيانات الفريق والشركة المعينين فقط' : 'Assigned team and company only') : 'Horeca Smart + MAS'}</p>
      </div>
    </aside>
  );
};
