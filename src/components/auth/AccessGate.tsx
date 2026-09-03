import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAccess } from '../../context/AccessContext';
import { LoginView } from './LoginView';

export const AccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, profile, signOut } = useAccess();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center" dir="rtl">
        <div className="text-sm font-bold">جارٍ التحقق من الهوية والصلاحيات...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') return <LoginView />;

  if (status === 'not_configured') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <ShieldAlert className="w-6 h-6 text-amber-300 mb-3" />
          <h1 className="font-black mb-2">نظام الدخول غير مُهيأ</h1>
          <p className="text-sm text-slate-300">لن يتم عرض أي بيانات تجارية حتى يتم تهيئة اتصال Supabase Auth.</p>
        </div>
      </div>
    );
  }

  if (status === 'inactive' || status === 'unauthorized' || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <ShieldAlert className="w-6 h-6 text-red-300 mb-3" />
          <h1 className="font-black mb-2">غير مصرح بالدخول إلى البيانات التجارية</h1>
          <p className="text-sm text-slate-300 mb-4">الحساب غير نشط أو لا يحتوي على صلاحيات معتمدة. لم يتم تحميل أي بيانات مبيعات.</p>
          <button onClick={() => void signOut()} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20">
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
