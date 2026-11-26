import React, {useEffect, useRef, useState} from 'react';
import {AlertTriangle, ChevronDown, ChevronUp, RefreshCw, RotateCcw, Search, ShieldCheck} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {callAnalyticsRpc} from '../analytics/client';
import {OrderCaseReviewPanel} from '../components/OrderCaseReviewPanel';

type ReviewFlag = 'MISSING_ORIGINAL_DELIVERY' | 'UNVERIFIED_LINK' | 'POSSIBLE_DUPLICATE_RETURN' |
 'EXCESS_RETURN_UOM_UNVERIFIED' | 'CREDIT_NOTE_PENDING' | 'DATA_NOT_READY';
type OrderRow = {
 orderId:number;orderName:string;companyId:number;customerId:number|null;customerName:string;
 salesperson:string|null;orderDate:string;orderedValue:number;deliveredValue:number;
 returnedValue:number;creditedValue:number;returnEvents:number;lastReturnAt:string|null;
 lineCount:number;reviewFlags:ReviewFlag[];reviewStatus:string;
};
type Summary = {orderCount:number;ordersWithReturns:number;orderedValue:number;deliveredValue:number;netDeliveredValue:number;creditedValue:number;returnedValue:number;
 returnOrderRatePct:number|null;returnValueRatePct:number|null;flaggedOrders:number;unlinkedReturnMoves:number|null;
 snapshotThrough:string|null};
type DetailLine = {saleOrderLineId:number;productName:string;orderedQty:number|null;deliveredQty:number|null;
 returnedQty:number|null;orderedValue:number;deliveredValue:number;returnedValue:number;
 invoiceValue:number;creditNoteValue:number;linkEvidence:string|null;uomStatus:string|null};
type ReturnEvent = {moveId:number;originalMoveId:number|null;receiptDate:string;quantity:number;
 reason:string|null;linkConfidence:string;sourceStatus:string};
type Detail = {companyId:number;orderId:number;orderName:string;lines:DetailLine[];
 returns:ReturnEvent[];notes:string[]};

const flagLabel:Record<ReviewFlag,string> = {
 MISSING_ORIGINAL_DELIVERY:'التسليم الأصلي مش ظاهر',
 UNVERIFIED_LINK:'ربط المرتجع غير مؤكد',
 POSSIBLE_DUPLICATE_RETURN:'تكرار محتمل',
 EXCESS_RETURN_UOM_UNVERIFIED:'كمية مرتجع أعلى من التسليم (الوحدة غير مؤكدة)',
 CREDIT_NOTE_PENDING:'فجوة إشعار دائن محتملة',
 DATA_NOT_READY:'بيانات ناقصة للتحقق',
};
const amount=(n:number)=>n.toLocaleString('en-EG',{maximumFractionDigits:0})+' ج.م';
const number=(n:number)=>n.toLocaleString('en-EG');
const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T00:00:00Z'));
const plain=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const num=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
const parseOrder=(r:unknown):OrderRow=>{
 const x=plain(r);return {
  orderId:num(x.order_id),orderName:String(x.order_name??''),companyId:num(x.company_id),
  customerId:x.customer_id==null?null:num(x.customer_id),customerName:String(x.customer_name??''),
  salesperson:x.salesperson_name==null?null:String(x.salesperson_name),orderDate:String(x.order_date??''),
  orderedValue:num(x.ordered_value),deliveredValue:num(x.delivered_value),
  returnedValue:num(x.returned_value),creditedValue:num(x.credited_value),
  returnEvents:num(x.return_events),lastReturnAt:x.last_return_at==null?null:String(x.last_return_at),
  lineCount:num(x.line_count),reviewFlags:Array.isArray(x.review_flags)?
   x.review_flags.filter((v):v is ReviewFlag=>typeof v==='string'&&v in flagLabel):[],
  reviewStatus:String(x.review_status??'not_available'),
 };
};
const parseSummary=(s:unknown):Summary=>{
 const x=plain(s);return {orderCount:num(x.order_count),ordersWithReturns:num(x.orders_with_returns),
  orderedValue:num(x.ordered_value),deliveredValue:num(x.delivered_value),netDeliveredValue:num(x.net_delivered_value),creditedValue:num(x.credited_value),returnedValue:num(x.returned_value),
  returnOrderRatePct:x.return_order_rate_pct==null?null:num(x.return_order_rate_pct),
  returnValueRatePct:x.return_value_rate_pct==null?null:num(x.return_value_rate_pct),
  flaggedOrders:num(x.flagged_orders),unlinkedReturnMoves:x.unlinked_return_moves==null?null:num(x.unlinked_return_moves),
  snapshotThrough:x.snapshot_through==null?null:String(x.snapshot_through)};
};
const parseDetail=(v:unknown):Detail=>{
 const x=plain(v);
 return {companyId:num(x.company_id),orderId:num(x.order_id),orderName:String(x.order_name??''),
  lines:Array.isArray(x.lines)?x.lines.map((item):DetailLine=>{
   const i=plain(item);return {saleOrderLineId:num(i.sale_order_line_id),productName:String(i.product_name??''),
    orderedQty:i.ordered_qty==null?null:num(i.ordered_qty),deliveredQty:i.delivered_qty==null?null:num(i.delivered_qty),
    returnedQty:i.returned_qty==null?null:num(i.returned_qty),orderedValue:num(i.ordered_value),
    deliveredValue:num(i.delivered_value),returnedValue:num(i.returned_value),
    invoiceValue:num(i.invoice_value),creditNoteValue:num(i.credit_note_value),
    linkEvidence:i.link_evidence==null?null:String(i.link_evidence),
    uomStatus:i.uom_status==null?null:String(i.uom_status)};
  }):[],
  returns:Array.isArray(x.returns)?x.returns.map((item):ReturnEvent=>{
   const i=plain(item);return {moveId:num(i.move_id),originalMoveId:i.original_move_id==null?null:num(i.original_move_id),
    receiptDate:String(i.receipt_date??''),quantity:num(i.quantity),reason:i.reason==null?null:String(i.reason),
    linkConfidence:String(i.link_confidence??''),sourceStatus:String(i.source_status??'')};
  }):[],notes:Array.isArray(x.notes)?x.notes.map(String):[]};
};

const SummaryCard:React.FC<{label:string;value:string;caption?:string}>=({label,value,caption})=>
 <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
  <p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p>
  {caption?<p className="mt-1 text-xs text-slate-500">{caption}</p>:null}
 </div>;

/** Navigation and UI are release-gated; the manager RPCs must be deployed after RLS/JWT acceptance. */
export const ReturnsIntelligenceCenter:React.FC=()=>{
 const {filters}=useApp();
 const [start,setStart]=useState(filters.effectiveStartDate);
 const [end,setEnd]=useState(filters.effectiveEndDate);
 const [company,setCompany]=useState(filters.companyId?String(filters.companyId):'');
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState<'all'|'returned'|'flagged'>('all');
 const [page,setPage]=useState(0);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [orders,setOrders]=useState<OrderRow[]|null>(null);
 const [total,setTotal]=useState(0);
 const [selected,setSelected]=useState<string|null>(null);
 const detailRequestVersion=useRef(0);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [detailError,setDetailError]=useState<string|null>(null);
 const [detailLoading,setDetailLoading]=useState(false);
 const [reload,setReload]=useState(0);
 const limit=40;

 useEffect(()=>{
  setStart(filters.effectiveStartDate);setEnd(filters.effectiveEndDate);
 },[filters.effectiveStartDate,filters.effectiveEndDate]);
 useEffect(()=>{setCompany(filters.companyId?String(filters.companyId):'');},[filters.companyId]);

 useEffect(()=>{
  detailRequestVersion.current+=1;setSelected(null);setDetail(null);setOrders(null);setSummary(null);setError(null);
  if(!validDate(start)||!validDate(end)||start>end){setError('راجع فترة البداية والنهاية.');return;}
  let active=true;setLoading(true);
  callAnalyticsRpc('analytics_returns_cohort_dashboard_v1',{
    p_start_date:start,p_end_date:end,p_company_id:company?Number(company):null,
    p_search:query.trim()||null,p_status:status,p_limit:limit,p_offset:page*limit
  },r=>r).then(rows=>{
   if(!active)return;
   const payload=plain(rows[0]?.payload);
   if(!rows.length||!payload.summary||!Array.isArray(payload.orders))
    throw Error('الـBackend الخاص بمركز المرتجعات غير جاهز أو رجّع استجابة ناقصة.');
   setSummary(parseSummary(payload.summary));setOrders(payload.orders.map(parseOrder));
   setTotal(num(payload.total_rows));
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:String(e));})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[start,end,company,query,status,page,reload]);

 const selectOrder=async (row:OrderRow)=>{
  // Odoo order IDs may overlap between MAS and Horeca Smart.
  const selectionKey=row.companyId+':'+row.orderId;
  const requestId=++detailRequestVersion.current;
  if(selected===selectionKey){setSelected(null);setDetail(null);setDetailError(null);setDetailLoading(false);return;}
  setSelected(selectionKey);setDetail(null);setDetailError(null);setDetailLoading(true);
  try{
   const rows=await callAnalyticsRpc('analytics_returns_cohort_order_detail_v1',{
    p_company_id:row.companyId,p_order_id:row.orderId,
   },r=>r);
   if(detailRequestVersion.current!==requestId)return;
   const payload=rows[0]?.payload;
   if(!payload)throw Error('لا توجد تفاصيل معتمدة لهذا الطلب.');
   const parsed=parseDetail(payload);
   if(parsed.companyId!==row.companyId||parsed.orderId!==row.orderId)
    throw Error('هوية الأوردر المسترجع لا تطابق الشركة والأوردر المطلوبين.');
   setDetail(parsed);
  }catch(e){if(detailRequestVersion.current===requestId)setDetailError(e instanceof Error?e.message:String(e));}
  finally{if(detailRequestVersion.current===requestId)setDetailLoading(false);}
 };
 const pct=(v:number|null)=>v===null?'غير قابل للحساب':v.toFixed(1)+'%';

 return <div dir="rtl" className="space-y-5 pb-12">
  <header className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
   <div className="flex flex-wrap items-center gap-2">
    <RotateCcw className="h-5 w-5 text-violet-600"/>
    <h1 className="text-xl font-black">مركز تحليل ومراجعة المرتجعات</h1>
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Order Cohort</span>
   </div>
   <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
    الفترة حسب <strong>تاريخ إنشاء الأوردر</strong>. كل المرتجعات والتسليمات اللاحقة لنفس الأوردر
    تُربط به بصرف النظر عن شهر حدوثها، مع حفظ تاريخ كل حركة مستقلًا.
   </p>
   <p className="mt-1 text-xs text-amber-700">
    التنبيهات مؤشرات للمراجعة وليست إثباتًا لخطأ. يلزم التأكد من اكتمال Snapshot ووحدات القياس والمستندات الأصلية.
   </p>
  </header>

  <section aria-label="فلاتر المراجعة" className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
   <label className="text-xs">من <input type="date" aria-label="بداية فترة الأوردرات" value={start} onChange={e=>{setStart(e.target.value);setPage(0);}} className="mt-1 block rounded border p-2 dark:bg-slate-950"/></label>
   <label className="text-xs">إلى <input type="date" aria-label="نهاية فترة الأوردرات" value={end} onChange={e=>{setEnd(e.target.value);setPage(0);}} className="mt-1 block rounded border p-2 dark:bg-slate-950"/></label>
   <label className="text-xs">الشركة <select value={company} onChange={e=>{setCompany(e.target.value);setPage(0);}} className="mt-1 block rounded border p-2 dark:bg-slate-950">
    <option value="">الشركات المصرح بها</option><option value="1">MAS</option><option value="2">Horeca Smart</option>
   </select></label>
   <label className="text-xs">حالة الطلب <select value={status} onChange={e=>{setStatus(e.target.value as typeof status);setPage(0);}} className="mt-1 block rounded border p-2 dark:bg-slate-950">
    <option value="all">كل الأوردرات</option><option value="returned">بها مرتجعات</option><option value="flagged">تحتاج مراجعة</option>
   </select></label>
   <label className="text-xs">بحث <span className="mt-1 flex items-center gap-2 rounded border px-2"><Search className="h-4 w-4"/><input aria-label="ابحث برقم الأوردر أو العميل" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="رقم الأوردر أو اسم العميل" className="w-48 bg-transparent p-2 outline-none"/></span></label>
   <button type="button" onClick={()=>setReload(n=>n+1)} disabled={loading} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className="h-4 w-4"/> تحديث</button>
  </section>

  {error?<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error} — لا نعرض أرقامًا صفرية بديلة عن بيانات غير متاحة.</p>:null}
  {loading?<p role="status" className="text-sm text-slate-500">جاري تحميل الأوردرات والمرتجعات…</p>:null}
  {summary?<><section className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="ملخص فترة الأوردرات">
   <SummaryCard label="عدد أوردرات الفترة" value={number(summary.orderCount)}/>
   <SummaryCard label="أوردرات عليها مرتجعات" value={number(summary.ordersWithReturns)} caption={pct(summary.returnOrderRatePct)+' من أوردرات الفترة'}/>
   <SummaryCard label="إجمالي التسليم" value={amount(summary.deliveredValue)}/>
   <SummaryCard label="قيمة المرتجعات" value={amount(summary.returnedValue)} caption={pct(summary.returnValueRatePct)+' من إجمالي التسليم — عند توافق أساس التقييم'}/>
   <SummaryCard label="صافي التسليم بعد المرتجعات" value={amount(summary.netDeliveredValue)}/>
   <SummaryCard label="إشعارات دائنة مرتبطة بالأوردرات" value={amount(summary.creditedValue)} caption="تسويات محاسبية وليست خصمًا ثانيًا من التسليم"/>
   <SummaryCard label="أوردرات بها مؤشرات للمراجعة" value={number(summary.flaggedOrders)} caption="لا تعني أخطاء مؤكدة"/>
  </section>
  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
   <span>قيمة طلبات الفترة: {amount(summary.orderedValue)}</span>
   <span>مرتجعات غير قابلة للربط بأوردر محدد: {summary.unlinkedReturnMoves===null?'غير قابل للحساب للدفعة':number(summary.unlinkedReturnMoves)} — تظهر في قائمة مستقلة عند تفعيل مصدرها</span>
   <span>آخر Snapshot: {summary.snapshotThrough||'غير متاح'}</span>
  </div></>:null}

  {orders?<section className="overflow-hidden rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
   <div className="flex flex-wrap justify-between gap-3 p-4"><h2 className="font-black">الأوردرات المرتبطة بالفترة</h2><span className="text-xs text-slate-500">{number(total)} أوردر مطابق للفلاتر</span></div>
   <div className="overflow-x-auto"><table className="min-w-full text-right text-xs">
    <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="p-3">الأوردر</th><th className="p-3">العميل / المندوب</th><th className="p-3">تاريخ الأوردر</th><th className="p-3">قيمة الطلب</th><th className="p-3">التسليم</th><th className="p-3">المرتجع</th><th className="p-3">حالة الأوردر</th><th className="p-3">مؤشرات المراجعة</th><th className="p-3">تفاصيل</th></tr></thead>
    <tbody>{orders.map(row=><React.Fragment key={row.companyId+'-'+row.orderId}>
     <tr className="border-t dark:border-slate-800">
      <td className="p-3 font-bold">{row.orderName}<span className="block text-slate-500">{row.companyId===1?'MAS':'Horeca Smart'}</span></td>
      <td className="p-3">{row.customerName}<span className="block text-slate-500">{row.salesperson??'غير محدد'}</span></td>
      <td className="p-3">{row.orderDate.slice(0,10)}</td><td className="p-3">{amount(row.orderedValue)}</td><td className="p-3">{amount(row.deliveredValue)}</td>
      <td className="p-3">{amount(row.returnedValue)}<span className="block text-slate-500">{number(row.returnEvents)} حركة</span></td>
      <td className="p-3">
       {row.returnEvents>0?'مرتجع مسجل':row.deliveredValue>0?'تسليم ظاهر':'التسليم غير مثبت في الـSnapshot'}
       <span className="block text-slate-500">{row.reviewStatus==='not_available'?'سجل المراجعة غير متاح':'مراجعة: '+row.reviewStatus}</span>
      </td>
      <td className="p-3">{row.reviewFlags.length?<span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-4 w-4"/>{row.reviewFlags.length} تنبيه</span>:<span className="text-slate-500">لا تنبيهات مكتشفة</span>}</td>
      <td className="p-3"><button type="button" onClick={()=>void selectOrder(row)} className="inline-flex items-center gap-1 rounded border px-2 py-1" aria-expanded={selected===row.companyId+':'+row.orderId} aria-label={'تفاصيل '+row.orderName}>{selected===row.companyId+':'+row.orderId?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>} فتح</button></td>
     </tr>
     {selected===row.companyId+':'+row.orderId?<tr className="bg-slate-50/70 dark:bg-slate-950/50"><td colSpan={9} className="p-4">
      <div className="mb-3 flex flex-wrap gap-2">{row.reviewFlags.map(flag=><span key={flag} className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">{flagLabel[flag]}</span>)}</div>
      {detailLoading?<p>جارٍ تحميل تفاصيل الأوردر…</p>:detailError?<p role="alert" className="text-red-600">{detailError}</p>:detail?
      <div className="space-y-4">
       <h3 className="font-bold">تفاصيل الأصناف — الطلب، التسليم، المرتجع، الفاتورة والإشعار الدائن</h3>
       <div className="overflow-x-auto"><table className="min-w-full text-right"><thead><tr className="border-b"><th className="p-2">المنتج</th><th className="p-2">الكمية المطلوبة</th><th className="p-2">المسلّمة</th><th className="p-2">المرتجعة</th><th className="p-2">قيمة المرتجع</th><th className="p-2">إشعار دائن</th><th className="p-2">دليل الربط والوحدة</th></tr></thead>
        <tbody>{detail.lines.map(l=><tr className="border-b" key={l.saleOrderLineId}><td className="p-2">{l.productName}</td><td className="p-2">{l.orderedQty??'—'}</td><td className="p-2">{l.deliveredQty??'—'}</td><td className="p-2">{l.returnedQty??'—'}</td><td className="p-2">{amount(l.returnedValue)}</td><td className="p-2">{amount(l.creditNoteValue)}</td><td className="p-2">{l.linkEvidence??'غير متاح'} / {l.uomStatus??'غير متحقق'}</td></tr>)}</tbody>
       </table></div>
       <h3 className="font-bold">حركات المرتجعات المرتبطة بالأوردر</h3>
       {detail.returns.length?<div className="space-y-2">{detail.returns.map(ev=><p className="rounded border p-2 text-xs" key={ev.moveId}>حركة #{ev.moveId} — تاريخ الاستلام {ev.receiptDate.slice(0,10)} — كمية {ev.quantity} — التسليم الأصلي #{ev.originalMoveId??'غير معروف'} — السبب: {ev.reason||'غير مسجل'} — الربط: {ev.linkConfidence}</p>)}</div>:<p className="text-slate-500">لا توجد حركات مرتجع ظاهرة لهذا الأوردر في المصدر.</p>}
       {detail.notes.map((n,i)=><p key={i} className="text-amber-700">{n}</p>)}
       <OrderCaseReviewPanel companyId={row.companyId} orderId={row.orderId}/>
      </div>:null}
     </td></tr>:null}
    </React.Fragment>)}</tbody>
   </table></div>
   {orders.length===0?<p className="p-5 text-sm text-slate-500">لا توجد أوردرات مطابقة للفلاتر داخل الفترة. ده لا يثبت عدم وجود حركات غير مرتبطة.</p>:null}
   <div className="flex items-center justify-between border-t p-3 dark:border-slate-800"><button type="button" disabled={!page||loading} onClick={()=>setPage(p=>Math.max(p-1,0))} className="rounded border px-3 py-2 text-xs disabled:opacity-40">السابق</button><span className="text-xs">صفحة {page+1}</span><button type="button" disabled={(page+1)*limit>=total||loading} onClick={()=>setPage(p=>p+1)} className="rounded border px-3 py-2 text-xs disabled:opacity-40">التالي</button></div>
  </section>:null}

  <div className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
   <ShieldCheck className="h-4 w-4 shrink-0"/> هذه الشاشة مخصصة للمديرين المخولين فقط. تفعيلها يتطلب RPCs مؤمنة بصلاحيات الشركة،
   واختبار JWT حقيقي ومطابقة Odoo. الـFeature Flag لا يُعد وسيلة لحماية البيانات.
  </div>
 </div>;
};
