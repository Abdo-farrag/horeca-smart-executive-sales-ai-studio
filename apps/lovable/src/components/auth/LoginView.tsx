import React, { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAccess } from '../../context/AccessContext';

export const LoginView: React.FC = () => {
  const { signIn, error } = useAccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!email.trim() || !password) { setLocalError('أدخل البريد الإلكتروني وكلمة المرور.'); return; } setSubmitting(true); setLocalError(null); try { await signIn(email, password); } catch { setLocalError('تعذر تسجيل الدخول أو التحقق من صلاحيات الحساب.'); } finally { setSubmitting(false); } };
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6" dir="rtl"><div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"><div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-emerald-400" /></div><div><h1 className="text-xl font-black text-slate-900">Horeca Smart Sales Intelligence</h1><p className="text-xs text-slate-500 mt-1">دخول آمن حسب صلاحيات المستخدم</p></div></div><form onSubmit={submit} className="space-y-4"><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" /><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />{(localError || error) && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">{localError || 'تعذر التحقق من الصلاحيات.'}</div>}<button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 text-white py-3 font-black text-sm flex items-center justify-center gap-2"><LogIn className="w-4 h-4" />{submitting ? 'جارٍ التحقق...' : 'تسجيل الدخول'}</button></form><p className="mt-6 text-[11px] text-slate-500">إنشاء الحسابات بواسطة Admin / CEO فقط.</p></div></div>;
};
