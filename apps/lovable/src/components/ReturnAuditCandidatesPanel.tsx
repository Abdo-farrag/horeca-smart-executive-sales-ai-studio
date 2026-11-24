import React, { useState } from 'react';
import { callAnalyticsRpc, clearAnalyticsClientCache } from '../analytics/client';

type Candidate = {
 caseKey:string; ruleCode:string; companyId:number; saleOrderLineId:number|null;
 productId:number; returnMoveIds:number[]; deliveredQty:number|null;
 returnedQty:number|null; confidence:string; explanation:string;
 reviewStatus:string; reviewVersion:number; reviewerNote:string|null; reviewedAt:string|null;
};
const rules:Record<string,string>={
 EXCESS_RETURN_CANDIDATE:'مرتجع أكبر من التسليم — فحص وحدة القياس',
 POSSIBLE_DUPLICATE_RETURN:'حركتان متشابهتان — مراجعة التكرار',
 UNLINKED_RETURN:'مرتجع غير مرتبط',
 MISSING_DELIVERY_EVIDENCE:'التسليم الأصلي غير ظاهر في البيانات',
};
const statuses:Record<string,string>={
 new:'جديد',investigating:'قيد المراجعة',explained:'مفسّر',
 confirmed_error:'خطأ مؤكد بعد المراجعة',resolved:'تمت المعالجة',dismissed:'استبعاد التنبيه',
};
const fmt=(v:number|null)=>v===null?'غير متاح':v.toLocaleString('en-US');
const normalize=(r:Record<string,unknown>):Candidate=>({
 caseKey:String(r.case_key),ruleCode:String(r.rule_code),
 companyId:Number(r.company_id),saleOrderLineId:r.sale_order_line_id==null?null:Number(r.sale_order_line_id),
 productId:Number(r.product_id),returnMoveIds:Array.isArray(r.return_move_ids)?r.return_move_ids.map(Number):[],
 deliveredQty:r.delivered_qty==null?null:Number(r.delivered_qty),
 returnedQty:r.returned_qty==null?null:Number(r.returned_qty),
 confidence:String(r.confidence),explanation:String(r.explanation),
 reviewStatus:String(r.review_status),reviewVersion:Number(r.review_version),
 reviewerNote:r.reviewer_note==null?null:String(r.reviewer_note),
 reviewedAt:r.reviewed_at==null?null:String(r.reviewed_at),
});

export const ReturnAuditCandidatesPanel:React.FC=()=>{
 const [rows,setRows]=useState<Candidate[]|null>(null);
 const [company,setCompany]=useState(''); const [rule,setRule]=useState('');
 const [offset,setOffset]=useState(0); const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [choices,setChoices]=useState<Record<string,string>>({});

 const load=async (nextOffset:number,nextCompany=company,nextRule=rule)=>{
  setLoading(true);setError(null);setRows(null);
  try{
   const result=await callAnalyticsRpc('analytics_return_audit_review_queue_v1',{
    p_company_id:nextCompany?Number(nextCompany):null,p_rule_code:nextRule||null,
    p_limit:50,p_offset:nextOffset,
   },normalize);
   setRows(result);setOffset(nextOffset);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setLoading(false);}
 };
 const save=async(row:Candidate)=>{
  const note=(notes[row.caseKey]??'').trim();
  const status=choices[row.caseKey]??'investigating';
  if(note.length<5){setError('اكتب سبب المراجعة في 5 حروف على الأقل.');return;}
  if(status===row.reviewStatus){setError('اختار حالة مختلفة عن الحالة الحالية.');return;}
  setSaving(row.caseKey);setError(null);
  try{
   await callAnalyticsRpc('review_return_audit_candidate_v1',{
    p_case_key:row.caseKey,p_expected_version:row.reviewVersion,
    p_status:status,p_note:note,
   },r=>({caseKey:String(r.case_key),version:Number(r.version)}));
   clearAnalyticsClientCache();
   setNotes(prev=>({...prev,[row.caseKey]:''}));
   await load(offset);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setSaving(null);}
 };
 return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <h2 className="text-base font-black">رقابة المرتجعات — سجل مراجعة المسؤولين</h2>
  <p className="mt-2 text-xs text-slate-500">
   للمديرين المصرح لهم فقط. النتائج تنبيهات للفحص وليست اتهامًا.
   المقارنة بين الكميات مبدئية لحين مراجعة وحدات القياس في Odoo.
   سجل المراجعة يحفظ المسؤول والوقت والسبب؛ لا يصحح أي حركة مخزنية تلقائيًا.
  </p>
  <div className="mt-3 flex flex-wrap items-center gap-2">
   <select aria-label="الشركة" value={company} onChange={e=>{setCompany(e.target.value);setRows(null);setOffset(0);}} className="rounded-lg border bg-transparent p-2 text-xs">
    <option value="">الشركات المصرح بها</option><option value="1">MAS</option><option value="2">Horeca Smart</option>
   </select>
   <select aria-label="القاعدة" value={rule} onChange={e=>{setRule(e.target.value);setRows(null);setOffset(0);}} className="rounded-lg border bg-transparent p-2 text-xs">
    <option value="">كل أنواع التنبيهات</option>{Object.entries(rules).map(([code,label])=><option value={code} key={code}>{label}</option>)}
   </select>
   <button type="button" onClick={()=>void load(0)} disabled={loading||saving!==null} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{loading?'جارٍ التحميل…':'تحميل التنبيهات'}</button>
  </div>
  {error&&<p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
  {rows!==null&&<div className="mt-4 overflow-x-auto">
   <table className="min-w-full text-right text-xs">
    <thead><tr className="border-b text-slate-500">
     <th className="p-2">قاعدة الكشف</th><th className="p-2">الشركة</th><th className="p-2">بند الطلب</th>
     <th className="p-2">المنتج</th><th className="p-2">حركات Odoo</th><th className="p-2">تسليم</th>
     <th className="p-2">مرتجع</th><th className="p-2">حالة المراجعة</th><th className="p-2">قرار وتوضيح</th>
    </tr></thead>
    <tbody>{rows.map(r=><tr key={r.caseKey} className="border-b align-top dark:border-slate-800">
     <td className="p-2" title={r.explanation}>{rules[r.ruleCode]??r.ruleCode}</td>
     <td className="p-2">{r.companyId===1?'MAS':'Horeca Smart'}</td>
     <td className="p-2">{r.saleOrderLineId??'غير مرتبط'}</td>
     <td className="p-2">{r.productId}</td>
     <td className="p-2">{r.returnMoveIds.join('، ')}</td>
     <td className="p-2">{fmt(r.deliveredQty)}</td><td className="p-2">{fmt(r.returnedQty)}</td>
     <td className="p-2"><strong>{statuses[r.reviewStatus]??r.reviewStatus}</strong>
      {r.reviewedAt&&<p className="mt-1 text-slate-500">{new Date(r.reviewedAt).toLocaleDateString('ar-EG')}</p>}
      {r.reviewerNote&&<p className="mt-1 max-w-xs text-slate-500">{r.reviewerNote}</p>}
     </td>
     <td className="min-w-64 p-2">
      <select aria-label="قرار المراجعة" value={choices[r.caseKey]??'investigating'} onChange={e=>setChoices(p=>({...p,[r.caseKey]:e.target.value}))} className="w-full rounded border bg-transparent p-2">
       {Object.entries(statuses).filter(([k])=>k!=='new').map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select>
      <textarea aria-label="سبب قرار المراجعة" value={notes[r.caseKey]??''} onChange={e=>setNotes(p=>({...p,[r.caseKey]:e.target.value}))} maxLength={2000} placeholder="سبب القرار والمستند الداعم" className="mt-2 w-full rounded border bg-transparent p-2" rows={2}/>
      <button type="button" disabled={saving!==null||loading} onClick={()=>void save(r)} className="mt-1 rounded border px-3 py-2 font-bold disabled:opacity-40">{saving===r.caseKey?'جارٍ الحفظ…':'حفظ المراجعة'}</button>
     </td>
    </tr>)}</tbody>
   </table>
   {rows.length===0&&<p className="py-5 text-center text-slate-500">لا توجد حالات في الصفحة الحالية. راجع اكتمال مزامنة بيانات Odoo قبل اعتبار النتيجة صفرًا.</p>}
   <div className="mt-3 flex gap-2">
    <button disabled={loading||saving!==null||offset===0} className="rounded border px-3 py-2 text-xs disabled:opacity-30" onClick={()=>void load(Math.max(offset-50,0))}>السابق</button>
    <button disabled={loading||saving!==null||rows.length<50} className="rounded border px-3 py-2 text-xs disabled:opacity-30" onClick={()=>void load(offset+50)}>التالي</button>
   </div>
  </div>}
 </section>;
};
