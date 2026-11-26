import React,{useState} from 'react';
import {callAnalyticsRpc} from '../analytics/client';

type History={caseKey:string;companyId:number;ruleCode:string;status:string;
version:number;note:string|null;reviewedAt:string|null;reviewedBy:string|null;
currentlyDetected:boolean;transitionCount:number;};
type Event={eventId:number;fromStatus:string;toStatus:string;actorId:string;note:string;occurredAt:string};
const statuses:Record<string,string>={new:'جديد',investigating:'قيد المراجعة',
 explained:'مفسّر',confirmed_error:'خطأ مؤكد',resolved:'تمت المعالجة',dismissed:'مستبعد'};
export const ReturnAuditHistoryPanel:React.FC=()=>{
 const [rows,setRows]=useState<History[]|null>(null);
 const [events,setEvents]=useState<Event[]|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [company,setCompany]=useState(''),[status,setStatus]=useState('');
 const [offset,setOffset]=useState(0);
 const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
 const load=async(page:number)=>{
  setLoading(true);setError(null);setRows(null);setEvents(null);setSelected(null);
  try{
   const list=await callAnalyticsRpc('analytics_return_audit_history_v1',{
    p_company_id:company?Number(company):null,p_status:status||null,p_limit:50,p_offset:page,
   },r=>({
    caseKey:String(r.case_key),companyId:Number(r.company_id),ruleCode:String(r.rule_code),
    status:String(r.review_status),version:Number(r.review_version),
    note:r.reviewer_note==null?null:String(r.reviewer_note),
    reviewedAt:r.reviewed_at==null?null:String(r.reviewed_at),
    reviewedBy:r.reviewed_by==null?null:String(r.reviewed_by),
    currentlyDetected:r.currently_detected===true,transitionCount:Number(r.transition_count),
   }));
   setRows(list);setOffset(page);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setLoading(false);}
 };
 const expand=async(key:string)=>{
  if(selected===key){setSelected(null);setEvents(null);return;}
  setSelected(key);setEvents(null);setError(null);
  try{
   const list=await callAnalyticsRpc('analytics_return_audit_history_events_v1',{
    p_case_key:key,
   },r=>({eventId:Number(r.event_id),fromStatus:String(r.from_status),
    toStatus:String(r.to_status),actorId:String(r.actor_id),note:String(r.note),
    occurredAt:String(r.occurred_at)}));
   setEvents(list);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <h2 className="text-base font-black">سجل مراجعات المرتجعات التاريخي</h2>
  <p className="mt-1 text-xs text-slate-500">بيحتفظ بالقرارات حتى لو التنبيه اختفى بعد تحديث بيانات المصدر. اختفاء التنبيه مش معناه إنه اتحل.</p>
  <div className="mt-3 flex flex-wrap gap-2">
   <select aria-label="فلتر شركة السجل" value={company} onChange={e=>{setCompany(e.target.value);setRows(null);}} className="rounded-lg border bg-transparent p-2 text-xs">
    <option value="">الشركات المسموح بها</option><option value="1">MAS</option><option value="2">Horeca Smart</option>
   </select>
   <select aria-label="فلتر حالة المراجعة" value={status} onChange={e=>{setStatus(e.target.value);setRows(null);}} className="rounded-lg border bg-transparent p-2 text-xs">
    <option value="">كل الحالات</option>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}
   </select>
   <button type="button" disabled={loading} onClick={()=>void load(0)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40">عرض السجل</button>
  </div>
  {error&&<p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
  {rows!==null&&<div className="mt-3 overflow-x-auto"><table className="min-w-full text-right text-xs">
   <thead><tr className="border-b text-slate-500"><th className="p-2">الشركة</th><th className="p-2">نوع التنبيه</th><th className="p-2">آخر قرار</th><th className="p-2">آخر مراجعة</th><th className="p-2">ظهور التنبيه حاليًا</th><th className="p-2">التاريخ</th></tr></thead>
   <tbody>{rows.map(r=><React.Fragment key={r.caseKey}>
    <tr className="border-b dark:border-slate-800">
     <td className="p-2">{r.companyId===1?'MAS':'Horeca Smart'}</td>
     <td className="p-2">{r.ruleCode}</td><td className="p-2">{statuses[r.status]??r.status}</td>
     <td className="p-2">{r.reviewedAt?new Date(r.reviewedAt).toLocaleString('ar-EG'):'—'}</td>
     <td className="p-2">{r.currentlyDetected?'ما زال موجودًا':'غير ظاهر حاليًا — يحتاج تحقق'}</td>
     <td className="p-2"><button type="button" className="underline" onClick={()=>void expand(r.caseKey)}>عرض {r.transitionCount} تغييرات</button></td>
    </tr>
    {selected===r.caseKey&&<tr><td colSpan={6} className="bg-slate-50 p-3 dark:bg-slate-800">
     {events===null?'جاري قراءة سجل التغييرات…':events.map(e=><p key={e.eventId} className="py-1">
      {new Date(e.occurredAt).toLocaleString('ar-EG')} — {statuses[e.fromStatus]??e.fromStatus}
      {' ← '}{statuses[e.toStatus]??e.toStatus} — {e.note} (مسؤول: {e.actorId})
     </p>)}
    </td></tr>}
   </React.Fragment>)}</tbody>
  </table>
  {rows.length===0&&<p className="py-4 text-center text-slate-500">لا توجد مراجعات محفوظة لهذا النطاق.</p>}
  <div className="mt-3 flex gap-2">
   <button type="button" disabled={loading||offset===0} onClick={()=>void load(Math.max(0,offset-50))} className="rounded border px-3 py-2 text-xs disabled:opacity-30">السابق</button>
   <button type="button" disabled={loading||rows.length<50} onClick={()=>void load(offset+50)} className="rounded border px-3 py-2 text-xs disabled:opacity-30">التالي</button>
  </div></div>}
 </section>;
};
