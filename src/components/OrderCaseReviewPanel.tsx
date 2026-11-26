import React,{useEffect,useRef,useState} from 'react';
import {callAnalyticsRpc,clearAnalyticsClientCache} from '../analytics/client';

type CaseRecord={
 caseKey:string;ruleCode:string;lineId:number|null;productId:number;
 returnMoveIds:number[];explanation:string|null;reviewStatus:string;reviewVersion:number;
 reviewerNote:string|null;reviewedAt:string|null;currentlyDetected:boolean;
};
type AuditEvent={id:number;from:string;to:string;actor:string;note:string;at:string};
const labels:Record<string,string>={
 EXCESS_RETURN_CANDIDATE:'كمية مرتجع أعلى من التسليم — وحدة القياس تحتاج تحقق',
 POSSIBLE_DUPLICATE_RETURN:'حركتا مرتجع متشابهتان — فحص التكرار',
 UNLINKED_RETURN:'ربط غير مؤكد — لا يتم نسبته للأوردر تلقائيًا',
 MISSING_DELIVERY_EVIDENCE:'حركة التسليم الأصلية غير متاحة في الـSnapshot',
};
const statuses:Record<string,string>={
 new:'جديد',investigating:'قيد الفحص',explained:'تم تفسير الحالة',
 confirmed_error:'خطأ مؤكد بعد التحقق',resolved:'تمت المعالجة',dismissed:'تم استبعاد التنبيه',
};
const parse=(r:Record<string,unknown>):CaseRecord=>({
 caseKey:String(r.case_key),ruleCode:String(r.rule_code),
 lineId:r.sale_order_line_id==null?null:Number(r.sale_order_line_id),productId:Number(r.product_id),
 returnMoveIds:Array.isArray(r.return_move_ids)?r.return_move_ids.map(Number):[],
 explanation:r.explanation==null?null:String(r.explanation),
 reviewStatus:String(r.review_status),reviewVersion:Number(r.review_version),
 reviewerNote:r.reviewer_note==null?null:String(r.reviewer_note),
 reviewedAt:r.reviewed_at==null?null:String(r.reviewed_at),
 currentlyDetected:r.currently_detected===true,
});
export const OrderCaseReviewPanel:React.FC<{companyId:number;orderId:number}>=({companyId,orderId})=>{
 const [cases,setCases]=useState<CaseRecord[]|null>(null);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [choices,setChoices]=useState<Record<string,string>>({});
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [expanded,setExpanded]=useState<string|null>(null);
 const [events,setEvents]=useState<AuditEvent[]|null>(null);
 const version=useRef(0);

 const reload=async()=>{
  const request=++version.current;
  setLoading(true);setError(null);setCases(null);setEvents(null);setExpanded(null);
  try{
   const result=await callAnalyticsRpc('analytics_returns_cohort_order_cases_v1',{
    p_company_id:companyId,p_order_id:orderId,
   },parse);
   if(request===version.current)setCases(result);
  }catch(e){if(request===version.current)setError(e instanceof Error?e.message:String(e));}
  finally{if(request===version.current)setLoading(false);}
 };
 useEffect(()=>{
  void reload();
  return ()=>{version.current+=1;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[companyId,orderId]);

 const save=async(r:CaseRecord)=>{
  const note=(notes[r.caseKey]??'').trim();
  const status=choices[r.caseKey]??'investigating';
  if(!r.currentlyDetected){setError('الحالة التاريخية لم تعد ظاهرة في بيانات المصدر. لا يمكن تغييرها من قائمة التنبيهات الحالية.');return;}
  if(note.length<5||note.length>2000){setError('اكتب سبب القرار أو دليل المراجعة بين 5 و2000 حرف.');return;}
  if(r.reviewStatus===status){setError('اختار حالة مختلفة عن الحالة الحالية.');return;}
  setSaving(r.caseKey);setError(null);
  try{
   await callAnalyticsRpc('review_returns_cohort_order_case_v1',{
    p_company_id:companyId,p_order_id:orderId,p_case_key:r.caseKey,
    p_expected_version:r.reviewVersion,p_status:status,p_note:note,
   },row=>({caseKey:String(row.case_key),version:Number(row.version)}));
   clearAnalyticsClientCache();
   setNotes(prev=>({...prev,[r.caseKey]:''}));
   await reload();
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setSaving(null);}
 };
 const showHistory=async(key:string)=>{
  if(expanded===key){setExpanded(null);setEvents(null);return;}
  setExpanded(key);setEvents(null);setError(null);
  try{
   const rows=await callAnalyticsRpc('analytics_return_audit_history_events_v1',{
    p_case_key:key,
   },r=>({id:Number(r.event_id),from:String(r.from_status),to:String(r.to_status),
    actor:String(r.actor_id),note:String(r.note),at:String(r.occurred_at)}));
   setEvents(rows);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 return <section aria-label="حالات مراجعة الأوردر" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-right dark:border-slate-800 dark:bg-slate-900">
  <h3 className="font-bold">مراجعة تنبيهات الأوردر وسجل القرارات</h3>
  <p className="text-xs text-slate-500">
   تسجيل القرار يتطلب مديرًا مخوّلًا؛ لا يعدّل Odoo. حفظ قرار المراجعة يربط التنبيه بالأوردر دائمًا،
   حتى لو اختفى بعد المزامنة. اختفاء التنبيه ليس إغلاقًا تلقائيًا.
  </p>
  <button type="button" onClick={()=>void reload()} disabled={loading||saving!==null}
   className="rounded border px-3 py-2 text-xs disabled:opacity-40">تحديث سجل الحالات</button>
  {loading?<p role="status">جارٍ تحميل التنبيهات والمراجعات…</p>:null}
  {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}
  {cases&&cases.length===0?<p className="text-xs text-slate-500">لا توجد حالات مرتبطة مباشرة بأصناف الأوردر في الـSnapshot. راجع اكتمال المصدر، فالحالات غير المرتبطة بأوردر تظهر في قائمة مستقلة.</p>:null}
  {cases?.map(r=><div className="space-y-2 rounded-lg border p-3 dark:border-slate-700" key={r.caseKey}>
   <div className="flex flex-wrap items-center gap-2 text-xs">
    <strong>{labels[r.ruleCode]??r.ruleCode}</strong>
    <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
     {r.currentlyDetected?'ظاهر الآن في الفحص':'غير ظاهر الآن — ليس بالضرورة محلولًا'}</span>
    <span>الحالة: {statuses[r.reviewStatus]??r.reviewStatus}</span>
   </div>
   <p className="text-xs text-slate-500">بند الأوردر #{r.lineId??'غير مثبت'} · المنتج #{r.productId} · حركات المرتجع: {r.returnMoveIds.length?r.returnMoveIds.join('، '):'لا توجد حركة حالية'}</p>
   {r.explanation?<p className="text-xs text-amber-800">{r.explanation}</p>:null}
   {r.reviewerNote?<p className="text-xs">آخر سبب مسجل: {r.reviewerNote}</p>:null}
   {r.reviewedAt?<p className="text-xs text-slate-500">آخر مراجعة: {new Date(r.reviewedAt).toLocaleString('ar-EG')}</p>:null}
   {r.currentlyDetected?<div className="flex flex-wrap items-end gap-2">
    <label className="text-xs">قرار المراجعة
     <select className="mt-1 block rounded border bg-transparent p-2"
      value={choices[r.caseKey]??'investigating'} onChange={e=>setChoices(p=>({...p,[r.caseKey]:e.target.value}))}>
      {Object.entries(statuses).filter(([k])=>k!=='new').map(([k,v])=><option key={k} value={k}>{v}</option>)}
     </select>
    </label>
    <label className="min-w-48 flex-1 text-xs">سبب القرار والمستند الداعم
     <textarea maxLength={2000} rows={2} className="mt-1 block w-full rounded border bg-transparent p-2"
      value={notes[r.caseKey]??''} onChange={e=>setNotes(p=>({...p,[r.caseKey]:e.target.value}))}
      placeholder="السبب، رقم مستند المرتجع، والإجراء المتخذ"/>
    </label>
    <button type="button" disabled={saving!==null||loading}
     onClick={()=>void save(r)} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
     {saving===r.caseKey?'جارٍ الحفظ…':'حفظ المراجعة'}
    </button>
   </div>:null}
   {r.reviewVersion>0?<div>
    <button type="button" className="text-xs font-bold underline" onClick={()=>void showHistory(r.caseKey)}>
     {expanded===r.caseKey?'إخفاء':'عرض'} سجل التغييرات (الإصدار {r.reviewVersion})
    </button>
    {expanded===r.caseKey?<div className="space-y-1 p-2 text-xs">
     {events===null?'جارٍ تحميل التاريخ…':events.map(e=><p key={e.id}>{new Date(e.at).toLocaleString('ar-EG')} · {statuses[e.from]??e.from} ← {statuses[e.to]??e.to} · {e.note} · منفذ: {e.actor}</p>)}
    </div>:null}
   </div>:null}
  </div>)}
 </section>;
};
