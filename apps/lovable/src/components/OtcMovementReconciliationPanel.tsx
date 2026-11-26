import React,{useState} from 'react';
import {supabase} from '../lib/supabase';
type Difference={
 odoo_count:number;snapshot_count:number;
 missing_in_snapshot_count:number;extra_in_snapshot_count:number;
 missing_move_ids_sample:number[];extra_move_ids_sample:number[];ids_match:boolean;
};
type Result={
 success:boolean;status:string;reason?:string;error?:string;
 deliveries?:Difference;returns?:Difference;
 start_date?:string;end_date?:string;writes_performed?:number;caveat?:string;
};
const metric=(title:string,d?:Difference)=>d?<div className="rounded-lg border p-3 text-xs">
 <h4 className="font-bold">{title}</h4>
 <p className="mt-2">Odoo: {d.odoo_count.toLocaleString()} — Supabase: {d.snapshot_count.toLocaleString()}</p>
 <p>ناقص في Supabase: {d.missing_in_snapshot_count.toLocaleString()}</p>
 <p>موجود في Supabase وغير ظاهر في Odoo للفترة: {d.extra_in_snapshot_count.toLocaleString()}</p>
 <p className="mt-1 text-slate-500">أمثلة الحركات الناقصة: {d.missing_move_ids_sample.join('، ')||'—'}</p>
 <p className="text-slate-500">أمثلة الحركات الإضافية: {d.extra_move_ids_sample.join('، ')||'—'}</p>
 </div>:null;
export const OtcMovementReconciliationPanel:React.FC=()=>{
 const [company,setCompany]=useState('1');
 const [start,setStart]=useState('');
 const [end,setEnd]=useState('');
 const [loading,setLoading]=useState(false);
 const [data,setData]=useState<Result|null>(null);
 const [error,setError]=useState<string|null>(null);
 const run=async()=>{
  setError(null);setData(null);
  if(!start||!end){setError('اختار تاريخ البداية والنهاية.');return;}
  const elapsed=(Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000;
  if(!Number.isFinite(elapsed)||elapsed<0||elapsed>6){
   setError('اختار فترة من يوم لسبعة أيام بحد أقصى.');return;
  }
  if(!supabase){setError('اتصال Supabase غير متاح.');return;}
  setLoading(true);
  try{
   const {data:response,error:requestError}=await supabase.functions.invoke(
    'probe-odoo18-movement-reconciliation',{body:{
     company_id:Number(company),start_date:start,end_date:end,
    }},
   );
   if(requestError)throw requestError;
   if(!response||typeof response!=='object')throw Error('استجابة غير صالحة من أداة المقارنة.');
   setData(response as Result);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setLoading(false);}
 };
 return <section dir="rtl" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
  <h2 className="text-base font-black">مطابقة حركات Odoo مع Supabase — قراءة فقط</h2>
  <p className="mt-1 text-xs text-slate-500">اختيار فترة لا تتجاوز 7 أيام. الفحص بيقارن أرقام حركات stock.move المكتملة، مش قيم الفواتير أو تحويلات الوحدات. التشغيل يدوي بعد نشر Endpoint واعتماد الصلاحيات؛ لا يغير أي بيانات.</p>
  <div className="mt-3 flex flex-wrap items-center gap-2">
   <select aria-label="شركة المطابقة" value={company} onChange={e=>{setCompany(e.target.value);setData(null);}} className="rounded border bg-transparent p-2 text-xs">
    <option value="1">MAS</option><option value="2">Horeca Smart</option>
   </select>
   <label className="text-xs">من <input aria-label="بداية المطابقة" type="date" value={start} onChange={e=>{setStart(e.target.value);setData(null);}} className="rounded border p-2"/></label>
   <label className="text-xs">إلى <input aria-label="نهاية المطابقة" type="date" value={end} onChange={e=>{setEnd(e.target.value);setData(null);}} className="rounded border p-2"/></label>
   <button type="button" disabled={loading} onClick={()=>void run()} className="rounded bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{loading?'جارٍ الفحص…':'ابدأ المطابقة'}</button>
  </div>
  {error&&<p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
  {data&&<div className="mt-4">
   <p className="text-sm font-bold">{data.status==='IDS_MATCH_IN_WINDOW'?'أرقام الحركات متطابقة في نطاق الفحص':data.status==='ID_MISMATCH'?'توجد فروق بين المصدرين':data.status==='INCOMPLETE_WINDOW'?'الفحص غير مكتمل؛ لا يمكن الاعتماد على المطابقة':'تعذرت المطابقة'}</p>
   {data.reason&&<p className="mt-1 text-xs text-amber-700">سبب عدم الاكتمال: {data.reason}</p>}
   {data.error&&<p className="mt-1 text-xs text-rose-600">{data.error}</p>}
   {data.success&&<div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
    {metric('التسليم',data.deliveries)}{metric('المرتجعات',data.returns)}
   </div>}
   <p className="mt-3 text-xs text-slate-500">{data.caveat??'عدم ظهور فروق في العينة لا يعني اكتمال مزامنة Odoo أو صحة الكميات.'}</p>
  </div>}
 </section>;
};
