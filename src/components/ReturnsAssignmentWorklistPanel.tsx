import React,{useEffect,useState} from 'react';
import {callAnalyticsRpc} from '../analytics/client';
type WorkItem={caseKey:string;companyId:number;orderId:number;assigneeId:string;priority:string;dueDate:string;version:number;status:string;overdue:boolean;detected:boolean};
const labels:Record<string,string>={low:'منخفضة',medium:'متوسطة',high:'مرتفعة',critical:'حرجة'};
const statuses:Record<string,string>={investigating:'قيد التحقيق',confirmed_error:'خطأ مؤكد',new:'جديد',explained:'مفسر',resolved:'تمت المعالجة',dismissed:'مستبعد'};
export const ReturnsAssignmentWorklistPanel:React.FC<{companyId:number|null}>=({companyId})=>{
 const [rows,setRows]=useState<WorkItem[]|null>(null);
 const [includeClosed,setIncludeClosed]=useState(false);
 const [page,setPage]=useState(0);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let alive=true;
  setLoading(true);setError(null);setRows(null);
  callAnalyticsRpc('analytics_returns_case_worklist_v1',{
   p_company_id:companyId,p_include_closed:includeClosed,p_limit:100,p_offset:page*100,
  },r=>({
   caseKey:String(r.case_key),companyId:Number(r.company_id),orderId:Number(r.order_id),
   assigneeId:String(r.assignee_id),priority:String(r.priority),dueDate:String(r.due_date).slice(0,10),
   version:Number(r.assignment_version),status:String(r.review_status),
   overdue:r.is_overdue===true,detected:r.currently_detected===true,
  })).then(data=>{if(alive)setRows(data);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:String(e));})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[companyId,includeClosed,page,refresh]);
 const overdue=rows?.filter(r=>r.overdue).length??0;
 return <section aria-label="قائمة تكليفات المرتجعات" className="space-y-3 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h2 className="font-bold">متابعة حالات المرتجعات المكلفة</h2>
   <div className="flex items-center gap-2 text-xs">
    <label><input type="checkbox" checked={includeClosed} onChange={e=>{setIncludeClosed(e.target.checked);setPage(0);}}/> إظهار المغلقة</label>
    <button type="button" disabled={loading} onClick={()=>setRefresh(n=>n+1)} className="rounded border px-3 py-2 disabled:opacity-40">تحديث</button>
   </div>
  </div>
  <p className="text-xs text-slate-500">تُعرض هنا الحالات التي سبق تكليفها فقط، سواء استمر ظهور التنبيه أو اختفى. الحالات غير المكلفة تُدار من تفاصيل الأوردر، والحالات غير المرتبطة بأوردر لا تُنسب تلقائيًا.</p>
  {rows?<p className="text-xs">المتأخرة في الصفحة الحالية: <strong className={overdue?'text-red-700':''}>{overdue}</strong> من {rows.length} حالة. الرقم يخص الصفحة وليس إجمالي النظام.</p>:null}
  {loading?<p role="status" className="text-xs">جارٍ تحميل قائمة المتابعة…</p>:null}
  {error?<p role="alert" className="text-xs text-red-700">{error}</p>:null}
  {rows?<div className="overflow-x-auto"><table className="min-w-full text-right text-xs">
   <thead className="border-b bg-slate-50 dark:bg-slate-800"><tr><th className="p-2">الشركة / الأوردر</th><th className="p-2">الأولوية</th><th className="p-2">المسؤول</th><th className="p-2">تاريخ المتابعة</th><th className="p-2">الحالة</th><th className="p-2">المتابعة</th></tr></thead>
   <tbody>{rows.map(item=><tr key={item.caseKey} className="border-b dark:border-slate-800">
    <td className="p-2">{item.companyId===1?'MAS':'Horeca Smart'} · #{item.orderId}<p className="text-slate-500">تنبيه {item.caseKey.slice(0,8)}</p></td>
    <td className="p-2">{labels[item.priority]??item.priority}</td>
    <td className="p-2">{item.assigneeId.slice(0,8)}…</td>
    <td className="p-2">{item.dueDate}{item.overdue?<strong className="block text-red-700">متأخرة</strong>:null}</td>
    <td className="p-2">{statuses[item.status]??item.status}</td>
    <td className="p-2">{item.detected?'التنبيه ما زال ظاهرًا':'التنبيه اختفى — المراجعة محفوظة'}</td>
   </tr>)}</tbody></table>
   {rows.length===0?<p className="py-3 text-xs text-slate-500">لا توجد تكليفات مطابقة. هذا لا يعني عدم وجود تنبيهات أو مرتجعات.</p>:null}
   <div className="mt-3 flex items-center justify-between">
    <button type="button" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)} className="rounded border px-3 py-1 disabled:opacity-40">السابق</button>
    <span>صفحة {page+1}</span>
    <button type="button" disabled={rows.length<100||loading||page>=100} onClick={()=>setPage(p=>p+1)} className="rounded border px-3 py-1 disabled:opacity-40">التالي</button>
   </div>
  </div>:null}
 </section>;
};
