import React, { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAccess } from '../../context/AccessContext';

export const LoginView: React.FC = () => {
  const { signIn, error } = useAccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setLocalError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      await signIn(email, password);
    } catch {
      setLocalError('تعذر تسجيل الدخول. راجع البريد الإلكتروني وكلمة المرور أو حالة الحساب.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Horeca Smart Sales Intelligence</h1>
            <p className="text-xs text-slate-500 mt-1">دخول آمن حسب صلاحيات المستخدم</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-bold text-slate-700 mb-1.5">البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-bold text-slate-700 mb-1.5">كلمة المرور</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {(localError || error) && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700">
              {localError || 'تعذر التحقق من صلاحيات هذا الحساب.'}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 font-black text-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-slate-500 leading-relaxed">
          لا يوجد تسجيل حسابات ذاتي. إنشاء المستخدمين وتحديد الصلاحيات يتم بواسطة Admin / CEO فقط.
        </p>
      </div>
    </div>
  );
};
