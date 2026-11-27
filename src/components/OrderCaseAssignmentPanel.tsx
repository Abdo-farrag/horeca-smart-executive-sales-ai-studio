import React,{useEffect,useMemo,useRef,useState} from 'react';
import {callAnalyticsRpc,clearAnalyticsClientCache} from '../analytics/client';

type Staff={id:string;name:string;role:string};
type Assignment={caseKey:string;assigneeId:string;priority:string;dueDate:string;version:number;overdue:boolean;reviewStatus:string};
type FormState={assigneeId:string;priority:string;dueDate:string;reason:string};
const priorityAr:Record<string,string>={low:'منخفضة',medium:'متوسطة',high:'مرتفعة',critical:'حرجة'};
const normalizeAssignment=(r:Record<string,unknown>):Assignment=>({
 caseKey:String(r.case_key),assigneeId:String(r.assignee_id),priority:String(r.priority),
 dueDate:String(r.due_date).slice(0,10),version:Number(r.assignment_version),
 overdue:r.is_overdue===true,reviewStatus:String(r.review_status),
});
export const OrderCaseAssignmentPanel:React.FC<{
 companyId:number;orderId:number;caseKeys:string[];
}>=({companyId,orderId,caseKeys})=>{
 const [staff,setStaff]=useState<Staff[]|null>(null);
 const [assigned,setAssigned]=useState<Assignment[]|null>(null);
 const [forms,setForms]=useState<Record<string,FormState>>({});
 const [error,setError]=useState<string|null>(null);
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState<string|null>(null);
 const latestRequest=useRef(0);
 const keys=useMemo(()=>Array.from(new Set(caseKeys)).sort(),[caseKeys.join('|')]);
 const load=async()=>{
  const request=++latestRequest.current;
  setLoading(true);setError(null);
  setStaff(null);setAssigned(null);
  try{
   const [people,allocations]=await Promise.all([
    callAnalyticsRpc('analytics_returns_case_assignees_v1',{p_company_id:companyId},r=>({
     id:String(r.user_id),name:String(r.display_name??'مستخدم '+String(r.user_id).slice(0,8)),
     role:String(r.role),
    })),
    callAnalyticsRpc('analytics_returns_order_assignments_v1',{
     p_company_id:companyId,p_order_id:orderId,
    },normalizeAssignment),
   ]);
   if(request===latestRequest.current){setStaff(people);setAssigned(allocations);}
  }catch(e){if(request===latestRequest.current)setError(e instanceof Error?e.message:String(e));}
  finally{if(request===latestRequest.current)setLoading(false);}
 };
 useEffect(()=>{void load();setForms({});return ()=>{latestRequest.current+=1;};},[companyId,orderId]);
 const save=async(key:string)=>{
  const current=assigned?.find(a=>a.caseKey===key);
  const f=forms[key];
  if(!f||!f.assigneeId||!f.dueDate||f.reason.trim().length<5){
   setError('اختار المسؤول والتاريخ واكتب سبب التكليف (5 حروف على الأقل).');return;
  }
  setError(null);setSaving(key);
  try{
   await callAnalyticsRpc('assign_returns_order_case_v1',{
    p_company_id:companyId,p_order_id:orderId,p_case_key:key,
    p_assignee_id:f.assigneeId,p_priority:f.priority,
    p_due_date:f.dueDate,p_expected_version:current?.version??0,p_reason:f.reason.trim(),
   },r=>({caseKey:String(r.case_key),version:Number(r.assignment_version)}));
   clearAnalyticsClientCache();setForms(prev=>{const next={...prev};delete next[key];return next;});
   await load();
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setSaving(null);}
 };
 return <section className="space-y-3 rounded-lg border bg-slate-50 p-3 text-right dark:border-slate-700 dark:bg-slate-950/50">
  <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-sm">تكليف الحالات ومواعيد المتابعة</h4>
   <button type="button" onClick={()=>void load()} disabled={loading||saving!==null} className="rounded border px-2 py-1 text-xs disabled:opacity-40">تحديث التكليفات</button></div>
  <p className="text-xs text-slate-500">يمكن تكليف الحالات التي لها قرار مراجعة محفوظ فقط؛ تنبيهات غير مرتبطة بأوردر لا تُنسب له تلقائيًا. آخر تاريخ مستهدف 90 يومًا من اليوم.</p>
  {error?<p role="alert" className="text-xs text-red-700">{error}</p>:null}
  {loading?<p role="status" className="text-xs">جارٍ تحميل التكليفات…</p>:null}
  {assigned&&staff&&keys.length===0?<p className="text-xs text-slate-500">لا توجد حالة مؤهلة للتكليف بعد؛ سجل قرار مراجعة أولًا.</p>:null}
  {assigned&&staff&&keys.map(key=>{
   const current=assigned.find(a=>a.caseKey===key);
   const f=forms[key]??{assigneeId:current?.assigneeId??'',priority:current?.priority??'medium',dueDate:current?.dueDate??'',reason:''};
   const change=(v:Partial<FormState>)=>setForms(p=>({...p,[key]:{...f,...v}}));
   const closed=current&&['explained','resolved','dismissed'].includes(current.reviewStatus);
   return <div key={key} className="space-y-2 rounded border bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
    <div className="flex flex-wrap gap-2"><span>حالة #{key.slice(0,10)}</span>
     {current?<span>الإصدار {current.version}</span>:<span>غير مكلفة</span>}
     {current?.overdue?<strong className="text-red-700">متأخرة عن الموعد</strong>:null}
     {closed?<span>القرار النهائي مسجل — لا توجد متابعة متأخرة</span>:null}
    </div>
    <div className="grid gap-2 md:grid-cols-3">
     <label>المسؤول
      <select value={f.assigneeId} onChange={e=>change({assigneeId:e.target.value})} className="mt-1 block w-full rounded border p-2 dark:bg-slate-950">
       <option value="">اختار مسؤولًا</option>
       {staff.map(person=><option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}
      </select>
     </label>
     <label>الأولوية
      <select value={f.priority} onChange={e=>change({priority:e.target.value})} className="mt-1 block w-full rounded border p-2 dark:bg-slate-950">
       {Object.entries(priorityAr).map(([key,name])=><option key={key} value={key}>{name}</option>)}
      </select>
     </label>
     <label>موعد المتابعة
      <input aria-label="موعد متابعة الحالة" type="date" value={f.dueDate} onChange={e=>change({dueDate:e.target.value})} className="mt-1 block w-full rounded border p-2 dark:bg-slate-950"/>
     </label>
    </div>
    <label className="block">سبب التكليف أو تعديل المسؤول
     <textarea rows={2} maxLength={2000} value={f.reason} onChange={e=>change({reason:e.target.value})}
      placeholder="اذكر سبب التكليف، الأولوية، ورقم المستند عند توفره" className="mt-1 block w-full rounded border p-2 dark:bg-slate-950"/>
    </label>
    <button type="button" disabled={saving!==null||loading} onClick={()=>void save(key)}
     className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">
     {saving===key?'جارٍ الحفظ…':'حفظ التكليف'}
    </button>
   </div>;
  })}
 </section>;
};
