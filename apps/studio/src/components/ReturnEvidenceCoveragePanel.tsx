import React,{useState} from 'react';
import {callAnalyticsRpc} from '../analytics/client';

type Coverage={companyId:number;status:string;count:number;lastSync:string|null};
const explanations:Record<string,string>={
 EVIDENCE_READY:'دليل الوحدة والربط مكتمل',
 UNVERIFIED_ORDER_LINK:'ربط أمر البيع غير مؤكد',
 ORIGINAL_DELIVERY_NOT_IN_SNAPSHOT:'التسليم الأصلي غير موجود في البيانات',
 MISSING_UOM_EVIDENCE:'دليل وحدة القياس ناقص',
 UOM_EVIDENCE_NOT_VERIFIED:'تحويل الوحدة لم يُعتمد',
 STALE_OR_MISMATCHED_EVIDENCE:'المصدر تغير أو لا يطابق الدليل',
 INCOMPATIBLE_UOM:'اختلاف فئة الوحدة أو وحدتها الأساسية',
};
export const ReturnEvidenceCoveragePanel:React.FC=()=>{
 const [rows,setRows]=useState<Coverage[]|null>(null);
 const [company,setCompany]=useState('');
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const load=async()=>{
  setLoading(true);setRows(null);setError(null);
  try{
   const data=await callAnalyticsRpc('analytics_otc_return_evidence_coverage_v1',
    {p_company_id:company?Number(company):null},r=>({
     companyId:Number(r.company_id),status:String(r.diagnostic_status),
     count:Number(r.movement_count),lastSync:r.latest_source_sync==null?null:String(r.latest_source_sync),
    }));
   setRows(data);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setLoading(false);}
 };
 const total=rows?.reduce((sum,r)=>sum+r.count,0)??0;
 const ready=rows?.filter(r=>r.status==='EVIDENCE_READY').reduce((sum,r)=>sum+r.count,0)??0;
 return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <h2 className="text-base font-black">جودة أدلة المرتجعات ووحدات القياس</h2>
  <p className="mt-1 text-xs text-slate-500">التقرير من Snapshot المخزون المتاح حاليًا. حتى لو ظهرت جاهزية 100%، ده لا يثبت اكتمال مزامنة Odoo أو صحة معامل التحويل بدون مراجعة المصدر.</p>
  <div className="mt-3 flex flex-wrap gap-2">
   <select aria-label="شركة تقرير جودة البيانات" value={company} onChange={e=>{setCompany(e.target.value);setRows(null);}} className="rounded-lg border bg-transparent p-2 text-xs">
    <option value="">الشركات المصرح بها</option><option value="1">MAS</option><option value="2">Horeca Smart</option>
   </select>
   <button type="button" onClick={()=>void load()} disabled={loading} className="rounded-lg border px-4 py-2 text-xs font-bold disabled:opacity-40">{loading?'جاري الفحص…':'عرض تغطية الأدلة'}</button>
  </div>
  {error&&<p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
  {rows!==null&&<div className="mt-4">
   <p className="text-sm font-black">جاهزية الأدلة: {total>0?(100*ready/total).toFixed(1)+'%':'غير قابلة للحساب'}</p>
   <p className="mt-1 text-xs text-slate-500">{ready.toLocaleString()} حركة جاهزة من {total.toLocaleString()} حركة مرتجع موجودة في الـSnapshot</p>
   <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="نسبة تغطية أدلة المرتجعات" aria-valuemin={0} aria-valuemax={100} aria-valuenow={total>0?100*ready/total:0}>
    <div className="h-full bg-blue-600" style={{width:total>0?`${100*ready/total}%`:'0%'}}/>
   </div>
   <div className="mt-3 overflow-x-auto"><table className="min-w-full text-right text-xs">
    <thead><tr className="border-b text-slate-500"><th className="p-2">الشركة</th><th className="p-2">حالة الدليل</th><th className="p-2">عدد الحركات</th><th className="p-2">آخر مزامنة ظاهرة</th></tr></thead>
    <tbody>{rows.map(r=><tr key={r.companyId+'-'+r.status} className="border-b dark:border-slate-800">
     <td className="p-2">{r.companyId===1?'MAS':'Horeca Smart'}</td><td className="p-2">{explanations[r.status]??r.status}</td>
     <td className="p-2">{r.count.toLocaleString()}</td>
     <td className="p-2">{r.lastSync?new Date(r.lastSync).toLocaleString('ar-EG'):'غير متاح'}</td>
    </tr>)}</tbody>
   </table></div>
   {rows.length===0&&<p className="py-4 text-xs text-amber-700">لا توجد حركات في الـSnapshot لهذا النطاق، وليس بالضرورة أنه لا توجد مرتجعات في Odoo.</p>}
  </div>}
 </section>;
};
