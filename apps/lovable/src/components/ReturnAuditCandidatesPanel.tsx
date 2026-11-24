import React, { useState } from 'react';
import { callAnalyticsRpc } from '../analytics/client';

type Candidate = {
  rule_code: string; company_id: number; sale_order_line_id: number | null;
  product_id: number; return_move_ids: number[]; delivered_qty: number | null;
  returned_qty: number | null; confidence: string; explanation: string;
};
const ruleLabels: Record<string,string> = {
  EXCESS_RETURN_CANDIDATE:'احتمال مرتجع أكبر من التسليم',
  POSSIBLE_DUPLICATE_RETURN:'حركات مرتجع متشابهة',
  UNLINKED_RETURN:'مرتجع غير مرتبط بأمر موثوق',
  MISSING_DELIVERY_EVIDENCE:'بيانات التسليم الأصلية غير مكتملة',
};
const asQty=(v:number|null)=>v==null?'غير متاح':Number(v).toLocaleString('en-US');

export const ReturnAuditCandidatesPanel:React.FC=()=>{
  const [rows,setRows]=useState<Candidate[]|null>(null);
  const [company,setCompany]=useState('');
  const [rule,setRule]=useState('');
  const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const load=async (nextOffset:number, nextCompany=company,nextRule=rule)=>{
    setLoading(true);setError(null);setRows(null);
    try{
      const result=await callAnalyticsRpc('analytics_return_audit_candidates_v1',{
        p_company_id:nextCompany?Number(nextCompany):null,
        p_rule_code:nextRule||null,p_limit:50,p_offset:nextOffset,
      },(r)=>({
        rule_code:String(r.rule_code),company_id:Number(r.company_id),
        sale_order_line_id:r.sale_order_line_id==null?null:Number(r.sale_order_line_id),
        product_id:Number(r.product_id),
        return_move_ids:Array.isArray(r.return_move_ids)?r.return_move_ids.map(Number):[],
        delivered_qty:r.delivered_qty==null?null:Number(r.delivered_qty),
        returned_qty:r.returned_qty==null?null:Number(r.returned_qty),
        confidence:String(r.confidence),explanation:String(r.explanation),
      }));
      setRows(result);setOffset(nextOffset);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  };
  return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base font-black">رقابة المرتجعات غير الطبيعية — نسخة تجريبية</h2>
    <p className="mt-2 text-xs text-slate-500">للمديرين المصرح لهم فقط. النتائج مرشحة للمراجعة وليست إثباتًا لخطأ أو تلاعب. فحص الكميات مبدئي حتى التحقق من وحدات القياس في Odoo؛ لا توجد تصحيحات تلقائية.</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select aria-label="الشركة" value={company} onChange={e=>{setCompany(e.target.value);setRows(null);setOffset(0);}} className="rounded-lg border bg-transparent p-2 text-xs">
        <option value="">الشركات المصرح بها</option><option value="1">MAS</option><option value="2">Horeca Smart</option>
      </select>
      <select aria-label="نوع التنبيه" value={rule} onChange={e=>{setRule(e.target.value);setRows(null);setOffset(0);}} className="rounded-lg border bg-transparent p-2 text-xs">
        <option value="">جميع أنواع التنبيهات</option>
        {Object.entries(ruleLabels).map(([code,label])=><option value={code} key={code}>{label}</option>)}
      </select>
      <button type="button" onClick={()=>void load(0)} disabled={loading} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{loading?'جارٍ الفحص…':'عرض نتائج الرقابة'}</button>
    </div>
    {error&&<p role="alert" className="mt-3 text-xs font-semibold text-rose-600">تعذّر عرض البيانات أو لا تملك صلاحية الرقابة: {error}</p>}
    {rows!==null&&<div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-right text-xs">
        <thead><tr className="border-b text-slate-500"><th className="p-2">نوع التنبيه</th><th className="p-2">الشركة</th><th className="p-2">بند الطلب</th><th className="p-2">المنتج</th><th className="p-2">حركات Odoo</th><th className="p-2">تم تسليم</th><th className="p-2">تم إرجاع</th><th className="p-2">مستوى التحقق</th></tr></thead>
        <tbody>{rows.map((r,i)=><tr key={r.rule_code+'-'+r.company_id+'-'+r.return_move_ids.join('-')+'-'+i} className="border-b dark:border-slate-800">
          <td className="p-2">{ruleLabels[r.rule_code]||r.rule_code}</td><td className="p-2">{r.company_id===1?'MAS':'Horeca Smart'}</td>
          <td className="p-2">{r.sale_order_line_id??'غير مرتبط'}</td><td className="p-2">{r.product_id}</td>
          <td className="p-2">{r.return_move_ids.join('، ')}</td><td className="p-2">{asQty(r.delivered_qty)}</td>
          <td className="p-2">{asQty(r.returned_qty)}</td><td className="p-2" title={r.explanation}>{r.confidence}</td>
        </tr>)}</tbody>
      </table>
      {rows.length===0&&<p className="py-6 text-center text-xs text-slate-500">لا توجد حالات في هذه الصفحة وفقًا للبيانات المتاحة؛ لا يعني ذلك اكتمال المزامنة.</p>}
      <div className="mt-3 flex gap-2">
        <button disabled={loading||offset===0} className="rounded border px-3 py-2 text-xs disabled:opacity-30" onClick={()=>void load(Math.max(offset-50,0))}>السابق</button>
        <button disabled={loading||rows.length<50} className="rounded border px-3 py-2 text-xs disabled:opacity-30" onClick={()=>void load(offset+50)}>التالي</button>
      </div>
    </div>}
  </section>;
};
