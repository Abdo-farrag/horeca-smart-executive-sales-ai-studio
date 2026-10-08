import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type Many2One = [number, string] | false | null;
type StockPicking = { id:number; name?:string; picking_type_code?:string; origin?:string; partner_id?:Many2One; company_id?:Many2One; state?:string; date_done?:string; return_id?:Many2One };
type StockMove = { id:number; picking_id?:Many2One; product_id?:Many2One; product_uom_qty?:number|string; quantity?:number|string; origin_returned_move_id?:Many2One; sale_line_id?:Many2One; state?:string; write_date?:string };
type AccountMove = { id:number; name?:string; move_type?:string; state?:string; date?:string; invoice_date?:string; invoice_origin?:string; company_id?:Many2One; partner_id?:Many2One; invoice_user_id?:Many2One; reversed_entry_id?:Many2One; currency_id?:Many2One; write_date?:string };
type AccountMoveLine = { id:number; move_id?:Many2One; product_id?:Many2One; quantity?:number|string; price_subtotal?:number|string; price_total?:number|string; sale_line_ids?:number[]; display_type?:string|false|null; write_date?:string };
type SaleLineSnapshot = { odoo_line_id:number; order_id:number|null; order_name:string|null; customer_id:number|null; customer_name:string|null; product_id:number|null; product_name:string|null; company_id:number|null; company_name:string|null; qty_sold:number|string|null; subtotal:number|string|null };
type SecureOrder = { order_id:number; salesperson_id:number|null };
type OdooSaleOrder = { id:number; company_id?:Many2One; partner_id?:Many2One; partner_shipping_id?:Many2One; write_date?:string };
type Partner = { id:number; name?:string; parent_id?:Many2One; street?:string; street2?:string; city?:string; state_id?:Many2One; company_id?:Many2One; write_date?:string };

const DEFAULT_CUTOFF = "2026-06-01";
const ALLOWED_COMPANIES = [1, 2];
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function requiredEnv(name:string):string { const value=Deno.env.get(name)?.trim(); if(!value) throw new Error(`Missing required secret: ${name}`); return value; }
function m2oId(value:Many2One|undefined):number|null { return Array.isArray(value) ? Number(value[0]) : null; }
function m2oName(value:Many2One|undefined):string|null { return Array.isArray(value) ? String(value[1]) : null; }
function num(value:unknown):number { const parsed=typeof value === "number" ? value : Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function pct(n:number,d:number):number { return d > 0 ? Number(((n/d)*100).toFixed(2)) : 0; }
function toIso(value:string|undefined):string|null { if(!value) return null; if(value.includes("T")) return value.endsWith("Z") ? value : `${value}Z`; return `${value.replace(" ","T")}Z`; }
function chunks<T>(items:T[],size:number):T[][] { const out:T[][]=[]; for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size)); return out; }
function uniqueNumbers(values:Array<number|null|undefined>):number[] { return [...new Set(values.filter((v):v is number=>Number.isFinite(v as number)).map(Number))]; }

async function rpc<T>(url:string,service:string,method:string,args:unknown[]):Promise<T> {
  const response=await fetch(`${url.replace(/\/$/,"")}/jsonrpc`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"call",params:{service,method,args},id:crypto.randomUUID()})});
  if(!response.ok) throw new Error(`Odoo HTTP ${response.status}: ${await response.text()}`);
  const payload=await response.json();
  if(payload.error) throw new Error(String(payload.error?.data?.message ?? payload.error?.message ?? "Odoo RPC error"));
  return payload.result as T;
}
async function executeKw<T>(url:string,db:string,uid:number,apiKey:string,model:string,method:string,positionalArgs:unknown[]=[],keywordArgs:JsonRecord={}):Promise<T> {
  return rpc<T>(url,"object","execute_kw",[db,uid,apiKey,model,method,positionalArgs,keywordArgs]);
}
async function readAll<T>(url:string,db:string,uid:number,apiKey:string,model:string,domain:unknown[],fields:string[],companyIds:number[],limitPerPage=500):Promise<T[]> {
  const rows:T[]=[]; let offset=0;
  while(true){
    const page=await executeKw<T[]>(url,db,uid,apiKey,model,"search_read",[domain],{fields,limit:limitPerPage,offset,order:"id asc",context:{allowed_company_ids:companyIds}});
    rows.push(...page); if(page.length<limitPerPage) break; offset+=page.length;
  }
  return rows;
}

async function assertPrivilegedCaller(req:Request,supabase:ReturnType<typeof createClient>,serviceRoleKey:string):Promise<string> {
  const header=req.headers.get("authorization") ?? "";
  const token=header.replace(/^Bearer\s+/i,"").trim();
  if(!token) throw new Error("AUTH_REQUIRED");
  if(token === serviceRoleKey) return "service_role";
  const { data:{ user }, error:userError }=await supabase.auth.getUser(token);
  if(userError || !user) throw new Error("AUTH_REQUIRED");
  const { data:profile, error:profileError }=await supabase
    .from("app_user_roles")
    .select("role,is_active")
    .eq("user_id",user.id)
    .maybeSingle();
  if(profileError || !profile?.is_active || !["admin","manager"].includes(String(profile.role))) {
    throw new Error("SYNC_FORBIDDEN");
  }
  return String(profile.role);
}

Deno.serve(async(req:Request)=>{
  if(req.method === "OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method !== "POST") return json({error:"Use POST"},405);
  const startedAt=new Date().toISOString();
  let supabase:ReturnType<typeof createClient>|null=null;
  let mode:"sync"|"dry_run"="dry_run";
  try{
    const body=await req.json().catch(()=>({})) as JsonRecord;
    mode=body.mode === "sync" ? "sync" : "dry_run";
    const startDate=typeof body.start_date === "string" && body.start_date ? body.start_date : DEFAULT_CUTOFF;
    const endDate=typeof body.end_date === "string" && body.end_date ? body.end_date : null;
    const requestedCompanies=Array.isArray(body.company_ids) ? body.company_ids.map(Number) : ALLOWED_COMPANIES;
    const companyIds=requestedCompanies.filter((id)=>ALLOWED_COMPANIES.includes(id));
    if(!companyIds.length) throw new Error("No authorized OTC company ids requested");

    const odooUrl=requiredEnv("ODOO_URL");
    const odooDb=Deno.env.get("ODOO_DB")?.trim() || "DB-LIVE";
    const username=requiredEnv("ODOO_USERNAME");
    const apiKey=requiredEnv("ODOO_API_KEY");
    const supabaseUrl=requiredEnv("SUPABASE_URL");
    const serviceRoleKey=requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    supabase=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const callerRole=await assertPrivilegedCaller(req,supabase,serviceRoleKey);

    const uid=await rpc<number|false>(odooUrl,"common","authenticate",[odooDb,username,apiKey,{}]);
    if(!uid) throw new Error("Odoo authentication failed");

    const stockMoveMeta=await executeKw<Record<string,unknown>>(odooUrl,odooDb,uid,apiKey,"stock.move","fields_get",[],{attributes:["type"]});
    const pickingMeta=await executeKw<Record<string,unknown>>(odooUrl,odooDb,uid,apiKey,"stock.picking","fields_get",[],{attributes:["type"]});
    const accountMoveMeta=await executeKw<Record<string,unknown>>(odooUrl,odooDb,uid,apiKey,"account.move","fields_get",[],{attributes:["type"]});
    const accountLineMeta=await executeKw<Record<string,unknown>>(odooUrl,odooDb,uid,apiKey,"account.move.line","fields_get",[],{attributes:["type"]});
    const partnerMeta=await executeKw<Record<string,unknown>>(odooUrl,odooDb,uid,apiKey,"res.partner","fields_get",[],{attributes:["type"]});
    const saleOrderMeta=await executeKw<Record<string,unknown>>(odooUrl,odooDb,uid,apiKey,"sale.order","fields_get",[],{attributes:["type"]});
    if(!saleOrderMeta.partner_shipping_id) throw new Error("Missing required Odoo sale.order.partner_shipping_id");
    const hasSaleLineId=Boolean(stockMoveMeta.sale_line_id);
    const required={
      "stock.picking":["id","name","picking_type_code","origin","partner_id","company_id","state","date_done","return_id"],
      "stock.move":["id","picking_id","product_id","product_uom_qty","quantity","origin_returned_move_id","state"],
      "account.move":["id","name","move_type","state","date","invoice_date","invoice_origin","company_id","partner_id","invoice_user_id","reversed_entry_id","currency_id"],
      "account.move.line":["id","move_id","product_id","quantity","price_subtotal","price_total","sale_line_ids","display_type"],
    } as const;
    const metas:Record<string,Record<string,unknown>>={"stock.picking":pickingMeta,"stock.move":stockMoveMeta,"account.move":accountMoveMeta,"account.move.line":accountLineMeta};
    const missingFields:Record<string,string[]>={};
    for(const [model,fields] of Object.entries(required)) missingFields[model]=fields.filter((field)=>!metas[model]?.[field]);
    if(Object.values(missingFields).some((items)=>items.length)) throw new Error(`Missing required OTC Odoo fields: ${JSON.stringify(missingFields)}`);

    const dateDoneDomain:unknown[]=[["state","=","done"],["company_id","in",companyIds],["date_done",">=",`${startDate} 00:00:00`]];
    if(endDate) dateDoneDomain.push(["date_done","<",`${endDate} 23:59:59`]);
    const pickings=await readAll<StockPicking>(odooUrl,odooDb,uid,apiKey,"stock.picking",dateDoneDomain,["id","name","picking_type_code","origin","partner_id","company_id","state","date_done","return_id"],companyIds);
    const pickingMap=new Map(pickings.map((p)=>[p.id,p]));
    const deliveryPartnerIds=uniqueNumbers(pickings.map((p)=>m2oId(p.partner_id)));
    const partnerFields=["id","name","parent_id","street","street2","city","state_id","company_id","write_date"].filter((field)=>Boolean(partnerMeta[field]));
    const deliveryPartners=deliveryPartnerIds.length ? await readAll<Partner>(odooUrl,odooDb,uid,apiKey,"res.partner",[["id","in",deliveryPartnerIds]],partnerFields,companyIds) : [];
    const deliveryPartnerMap=new Map(deliveryPartners.map((p)=>[p.id,p]));
    const pickingIds=pickings.map((p)=>p.id);
    const moveFields=["id","picking_id","product_id","product_uom_qty","quantity","origin_returned_move_id","state","write_date"];
    if(hasSaleLineId) moveFields.push("sale_line_id");
    const stockMoves=pickingIds.length ? await readAll<StockMove>(odooUrl,odooDb,uid,apiKey,"stock.move",[["picking_id","in",pickingIds],["state","=","done"]],moveFields,companyIds) : [];
    const returnMoves=stockMoves.filter((m)=>Boolean(m2oId(m.origin_returned_move_id)));
    const deliveryMoves=stockMoves.filter((m)=>pickingMap.get(m2oId(m.picking_id)??-1)?.picking_type_code === "outgoing" && !m2oId(m.origin_returned_move_id));
    const deliveryDirect=hasSaleLineId ? deliveryMoves.filter((m)=>Boolean(m2oId(m.sale_line_id))).length : 0;

    const originalMoveIds=uniqueNumbers(returnMoves.map((m)=>m2oId(m.origin_returned_move_id)));
    const originalMoves=originalMoveIds.length ? await readAll<StockMove>(odooUrl,odooDb,uid,apiKey,"stock.move",[["id","in",originalMoveIds]],[...moveFields],companyIds) : [];
    const originalMoveMap=new Map(originalMoves.map((m)=>[m.id,m]));
    // Original outbound pickings may predate the sync window.
    const originalPickingIds=uniqueNumbers(originalMoves.map((m)=>m2oId(m.picking_id))).filter((id)=>!pickingMap.has(id));
    const originalPickings:StockPicking[]=[];
    for(const batch of chunks(originalPickingIds,400)){
      const rows=await readAll<StockPicking>(odooUrl,odooDb,uid,apiKey,"stock.picking",[["id","in",batch],["company_id","in",companyIds]],["id","name","partner_id","company_id","origin"],companyIds);
      originalPickings.push(...rows);
    }
    const originalPickingMap=new Map([...pickings,...originalPickings].map((p)=>[p.id,p]));
    const extraOriginalPartnerIds=uniqueNumbers(originalPickings.map((p)=>m2oId(p.partner_id))).filter((id)=>!deliveryPartnerMap.has(id));
    for(const batch of chunks(extraOriginalPartnerIds,400)){
      const partners=await readAll<Partner>(odooUrl,odooDb,uid,apiKey,"res.partner",[["id","in",batch]],partnerFields,companyIds);
      for(const partner of partners) deliveryPartnerMap.set(partner.id,partner);
    }
    const returnsWithOriginalResolved=returnMoves.filter((m)=>originalMoveMap.has(m2oId(m.origin_returned_move_id)??-1)).length;
    const returnsWithSaleLine=returnMoves.filter((m)=>{const original=originalMoveMap.get(m2oId(m.origin_returned_move_id)??-1); return Boolean(original && hasSaleLineId && m2oId(original.sale_line_id));}).length;

    const accountDomain:unknown[]=[["move_type","in",["out_invoice","out_refund"]],["state","=","posted"],["company_id","in",companyIds],["invoice_date",">=",startDate]];
    if(endDate) accountDomain.push(["invoice_date","<=",endDate]);
    const accountMoves=await readAll<AccountMove>(odooUrl,odooDb,uid,apiKey,"account.move",accountDomain,["id","name","move_type","state","date","invoice_date","invoice_origin","company_id","partner_id","invoice_user_id","reversed_entry_id","currency_id","write_date"],companyIds);
    const accountMoveMap=new Map(accountMoves.map((m)=>[m.id,m]));
    const accountMoveIds=accountMoves.map((m)=>m.id);
    const accountLines=accountMoveIds.length ? await readAll<AccountMoveLine>(
      odooUrl,odooDb,uid,apiKey,"account.move.line",
      [["move_id","in",accountMoveIds],["product_id","!=",false],["display_type", "=", "product"]],
      ["id","move_id","product_id","quantity","price_subtotal","price_total","sale_line_ids","display_type","write_date"],companyIds
    ) : [];
    const invoiceNoSaleLine=accountLines.filter((l)=>(l.sale_line_ids??[]).length===0).length;
    const invoiceSingleSaleLine=accountLines.filter((l)=>(l.sale_line_ids??[]).length===1).length;
    const invoiceMultiSaleLineCount=accountLines.filter((l)=>(l.sale_line_ids??[]).length>1).length;
    const diagnostics={
      stock_move_sale_line_id_available:hasSaleLineId,
      completed_pickings_count:pickings.length,
      delivery_moves_count:deliveryMoves.length,
      delivery_direct_link_count:deliveryDirect,
      delivery_direct_link_pct:pct(deliveryDirect,deliveryMoves.length),
      return_moves_count:returnMoves.length,
      return_original_move_resolved_count:returnsWithOriginalResolved,
      return_original_move_link_pct:pct(returnsWithOriginalResolved,returnMoves.length),
      return_sale_line_link_count:returnsWithSaleLine,
      return_sale_line_link_pct:pct(returnsWithSaleLine,returnMoves.length),
      posted_invoice_credit_moves_count:accountMoves.length,
      invoice_lines_count:accountLines.length,
      invoice_no_sale_line_count:invoiceNoSaleLine,
      invoice_single_sale_line_count:invoiceSingleSaleLine,
      invoice_single_sale_line_pct:pct(invoiceSingleSaleLine,accountLines.length),
      invoice_multi_sale_line_count:invoiceMultiSaleLineCount,
      distinct_delivery_partner_count:deliveryPartnerIds.length,
      delivery_partner_details_resolved_count:deliveryPartners.length,
      return_original_picking_lookup_count:originalPickings.length,
      return_original_delivery_partner_lookup_count:extraOriginalPartnerIds.length,
    };
    if(mode === "dry_run") return json({success:true,mode:"dry_run",caller_role:callerRole,database:odooDb,companies:companyIds,start_date:startDate,end_date:endDate,missing_fields:missingFields,diagnostics,writes_performed:0});

    const referencedSaleLineIds=uniqueNumbers([...deliveryMoves.map((m)=>m2oId(m.sale_line_id)),...originalMoves.map((m)=>m2oId(m.sale_line_id)),...accountLines.flatMap((l)=>l.sale_line_ids??[])]);
    const saleLineMap=new Map<number,SaleLineSnapshot>();
    for(const batch of chunks(referencedSaleLineIds,500)){
      const {data,error}=await supabase.from("product_sales_from_june1").select("odoo_line_id,order_id,order_name,customer_id,customer_name,product_id,product_name,company_id,company_name,qty_sold,subtotal").in("odoo_line_id",batch);
      if(error) throw new Error(`Could not read ordered sale lines: ${error.message}`);
      for(const row of (data??[]) as SaleLineSnapshot[]) saleLineMap.set(Number(row.odoo_line_id),row);
    }
    const originNames=[...new Set(pickings.map((p)=>p.origin).filter((v):v is string=>Boolean(v)))];
    const fallbackSaleLines:SaleLineSnapshot[]=[];
    for(const batch of chunks(originNames,200)){
      const {data,error}=await supabase.from("product_sales_from_june1").select("odoo_line_id,order_id,order_name,customer_id,customer_name,product_id,product_name,company_id,company_name,qty_sold,subtotal").in("order_name",batch);
      if(error) throw new Error(`Could not read fallback sale lines: ${error.message}`);
      fallbackSaleLines.push(...((data??[]) as SaleLineSnapshot[]));
    }
    const inferSaleLine=(picking:StockPicking|undefined,move:StockMove):SaleLineSnapshot|null=>{
      if(!picking?.origin) return null;
      const productId=m2oId(move.product_id), companyId=m2oId(picking.company_id);
      const candidates=fallbackSaleLines.filter((line)=>line.order_name===picking.origin && Number(line.product_id)===productId && Number(line.company_id)===companyId);
      return candidates.length===1 ? candidates[0] : null;
    };
    const allOrderIds=uniqueNumbers([
      ...[...saleLineMap.values()].map((line)=>line.order_id),
      ...fallbackSaleLines.map((line)=>line.order_id),
    ]);
    const saleOrders:OdooSaleOrder[]=[];
    for(const batch of chunks(allOrderIds,400)){
      const orders=await readAll<OdooSaleOrder>(odooUrl,odooDb,uid,apiKey,"sale.order",[["id","in",batch],["company_id","in",companyIds]],["id","company_id","partner_id","partner_shipping_id","write_date"],companyIds);
      saleOrders.push(...orders);
    }
    const extraShippingIds=uniqueNumbers(saleOrders.map((o)=>m2oId(o.partner_shipping_id))).filter((id)=>!deliveryPartnerMap.has(id));
    for(const batch of chunks(extraShippingIds,400)){
      const partners=await readAll<Partner>(odooUrl,odooDb,uid,apiKey,"res.partner",[["id","in",batch]],partnerFields,companyIds);
      for(const partner of partners) deliveryPartnerMap.set(partner.id,partner);
    }
    const salespersonByOrder=new Map<number,number|null>();
    for(const batch of chunks(allOrderIds,500)){
      const {data,error}=await supabase.from("sales_orders_odoo18_secure").select("order_id,salesperson_id").in("order_id",batch);
      if(error) throw new Error(`Could not read secure salesperson identity: ${error.message}`);
      for(const row of (data??[]) as SecureOrder[]) salespersonByOrder.set(Number(row.order_id),row.salesperson_id==null?null:Number(row.salesperson_id));
    }
    const lineContext=(saleLineId:number|null,fallback:SaleLineSnapshot|null=null)=>{
      const sale=saleLineId ? saleLineMap.get(saleLineId) ?? fallback : fallback;
      const orderId=sale?.order_id==null ? null : Number(sale.order_id);
      return {sale,salespersonId:orderId ? salespersonByOrder.get(orderId) ?? null : null};
    };

    const now=new Date().toISOString();
    // res.partner.company_id is often null for shared Odoo contacts.
    // Derive the company from the picking, never from the first requested company.
    // Resolve the commercial customer from sale-order lines only when unambiguous.
    const saleCustomersByOrigin=new Map<string,Set<number>>();
    for(const line of fallbackSaleLines){
      if(!line.order_name || line.company_id==null || line.customer_id==null) continue;
      const key=`${Number(line.company_id)}:${line.order_name}`;
      const customers=saleCustomersByOrigin.get(key)??new Set<number>();
      customers.add(Number(line.customer_id));
      saleCustomersByOrigin.set(key,customers);
    }
    const addressRowsByKey=new Map<string,JsonRecord>();
    for(const picking of [...pickings,...originalPickings]){
      const partnerId=m2oId(picking.partner_id), companyId=m2oId(picking.company_id);
      if(partnerId==null || companyId==null) continue;
      const partner=deliveryPartnerMap.get(partnerId);
      if(!partner) continue;
      const possibleCustomers=saleCustomersByOrigin.get(`${companyId}:${picking.origin??""}`);
      const resolvedCustomer=possibleCustomers?.size===1?[...possibleCustomers][0]:null;
      const key=`${companyId}:${partnerId}`;
      const previous=addressRowsByKey.get(key);
      addressRowsByKey.set(key,{
        company_id:companyId,
        customer_id:resolvedCustomer??previous?.customer_id??null,
        delivery_partner_id:partner.id,
        delivery_partner_name:partner.name??null,
        street:partner.street??null,street2:partner.street2??null,city:partner.city??null,
        state_id:m2oId(partner.state_id),state_name:m2oName(partner.state_id),
        geography_source:"odoo_delivery_partner",geography_confidence:null,
        needs_review:true,source_updated_at:toIso(partner.write_date),refreshed_at:now
      });
    }
    // Shipping partners on sale.order can differ from the picking partner.
    for(const order of saleOrders){
      const companyId=m2oId(order.company_id), partnerId=m2oId(order.partner_shipping_id);
      if(companyId==null || partnerId==null) continue;
      const partner=deliveryPartnerMap.get(partnerId);
      if(!partner) continue;
      const key=`${companyId}:${partnerId}`;
      const existing=addressRowsByKey.get(key);
      const customerId=m2oId(order.partner_id);
      addressRowsByKey.set(key,{
        company_id:companyId,customer_id:existing?.customer_id??customerId,
        delivery_partner_id:partner.id,delivery_partner_name:partner.name??null,
        street:partner.street??null,street2:partner.street2??null,city:partner.city??null,
        state_id:m2oId(partner.state_id),state_name:m2oName(partner.state_id),
        geography_source:"odoo_delivery_partner",geography_confidence:null,needs_review:true,
        source_updated_at:toIso(partner.write_date),refreshed_at:now
      });
    }
    const orderShippingRows=saleOrders.map((order)=>({
      company_id:m2oId(order.company_id),order_id:order.id,
      customer_id:m2oId(order.partner_id),delivery_partner_id:m2oId(order.partner_shipping_id),
      source_updated_at:toIso(order.write_date),refreshed_at:now
    })).filter((order)=>order.company_id!=null);
    // A shared delivery partner can serve multiple commercial customers.
    // Keep customer_id null rather than arbitrarily assigning it to the first order.
    const addressCustomerCandidates=new Map<string,Set<number>>();
    const addAddressCustomer=(companyId:number|null,partnerId:number|null,customerId:number|null)=>{
      if(companyId==null||partnerId==null||customerId==null) return;
      const key=`${companyId}:${partnerId}`;
      const candidates=addressCustomerCandidates.get(key)??new Set<number>();
      candidates.add(customerId);
      addressCustomerCandidates.set(key,candidates);
    };
    for(const picking of [...pickings,...originalPickings]){
      const companyId=m2oId(picking.company_id),partnerId=m2oId(picking.partner_id);
      const customers=saleCustomersByOrigin.get(`${companyId}:${picking.origin??""}`);
      if(customers?.size===1) addAddressCustomer(companyId,partnerId,[...customers][0]);
    }
    for(const order of saleOrders) addAddressCustomer(m2oId(order.company_id),m2oId(order.partner_shipping_id),m2oId(order.partner_id));
    for(const [key,row] of addressRowsByKey){
      const candidates=addressCustomerCandidates.get(key);
      row.customer_id=candidates?.size===1?[...candidates][0]:null;
    }
    const deliveryAddressRows=[...addressRowsByKey.values()];
    const deliveryRows=deliveryMoves.map((move)=>{
      const picking=pickingMap.get(m2oId(move.picking_id)??-1);
      const directSaleLineId=hasSaleLineId ? m2oId(move.sale_line_id) : null;
      const inferred=directSaleLineId ? null : inferSaleLine(picking,move);
      const {sale,salespersonId}=lineContext(directSaleLineId,inferred);
      const saleQty=num(sale?.qty_sold), unitValue=saleQty ? num(sale?.subtotal)/saleQty : null, qty=num(move.quantity??move.product_uom_qty);
      return {odoo_move_id:move.id,odoo_picking_id:m2oId(move.picking_id),picking_name:picking?.name??m2oName(move.picking_id),sale_order_line_id:directSaleLineId??(inferred?Number(inferred.odoo_line_id):null),company_id:m2oId(picking?.company_id),customer_id:sale?.customer_id??null,delivery_partner_id:m2oId(picking?.partner_id),salesperson_id:salespersonId,product_id:m2oId(move.product_id),delivery_date:toIso(picking?.date_done),delivered_qty:qty,delivered_value:unitValue==null?null:Number((unitValue*qty).toFixed(6)),value_basis:unitValue==null?"missing":"sale_order_line_estimate",source_state:move.state??"done",link_confidence:directSaleLineId?"direct":inferred?"inferred":"unmatched",source_updated_at:toIso(move.write_date),last_seen_at:now,synced_at:now};
    });
    const deliveryByMoveId=new Map(deliveryRows.map((row)=>[row.odoo_move_id,row]));
    const returnRows=returnMoves.map((move)=>{
      const picking=pickingMap.get(m2oId(move.picking_id)??-1), originalMoveId=m2oId(move.origin_returned_move_id), originalMove=originalMoveId?originalMoveMap.get(originalMoveId):undefined;
      const originalSaleLineId=hasSaleLineId?m2oId(originalMove?.sale_line_id):null, priorDelivery=originalMoveId?deliveryByMoveId.get(originalMoveId):undefined, saleLineId=originalSaleLineId??priorDelivery?.sale_order_line_id??null;
      const originalPicking=originalMove?originalPickingMap.get(m2oId(originalMove.picking_id)??-1):undefined;
      const originalDeliveryPartnerId=m2oId(originalPicking?.partner_id);
      const {sale,salespersonId}=lineContext(saleLineId), saleQty=num(sale?.qty_sold), unitValue=saleQty?num(sale?.subtotal)/saleQty:null, qty=num(move.quantity??move.product_uom_qty), confidence=originalSaleLineId?"direct":saleLineId?"inferred":"unmatched";
      return {odoo_return_move_id:move.id,odoo_return_picking_id:m2oId(move.picking_id),return_picking_name:picking?.name??m2oName(move.picking_id),origin_returned_move_id:originalMoveId,sale_order_line_id:saleLineId,company_id:m2oId(picking?.company_id),customer_id:sale?.customer_id??null,delivery_partner_id:originalDeliveryPartnerId,return_partner_id:m2oId(picking?.partner_id),salesperson_id:salespersonId,product_id:m2oId(move.product_id),return_receipt_date:toIso(picking?.date_done),returned_qty:qty,estimated_operational_value:unitValue==null?null:Number((unitValue*qty).toFixed(6)),value_basis:unitValue==null?"missing":"sale_order_line_estimate",return_reason:null,source_state:move.state??"done",link_confidence:confidence,source_updated_at:toIso(move.write_date),last_seen_at:now,synced_at:now};
    });
    const invoiceRows=accountLines.map((line)=>{
      const move=accountMoveMap.get(m2oId(line.move_id)??-1), saleLineIds=(line.sale_line_ids??[]).map(Number).filter(Number.isFinite), singleSaleLineId=saleLineIds.length===1?saleLineIds[0]:null, {sale,salespersonId}=lineContext(singleSaleLineId);
      return {account_move_line_id:line.id,account_move_id:m2oId(line.move_id),move_name:move?.name??m2oName(line.move_id),move_type:move?.move_type,sale_order_line_id:singleSaleLineId,sale_order_line_ids:saleLineIds,company_id:m2oId(move?.company_id),customer_id:sale?.customer_id??m2oId(move?.partner_id)??null,salesperson_id:salespersonId??m2oId(move?.invoice_user_id),product_id:m2oId(line.product_id),invoice_date:move?.invoice_date??move?.date??null,quantity:num(line.quantity),price_subtotal:num(line.price_subtotal),price_total:num(line.price_total),currency_id:m2oId(move?.currency_id),reversed_entry_id:m2oId(move?.reversed_entry_id),source_state:move?.state??"posted",link_confidence:saleLineIds.length===1?"direct":"unmatched",allocation_status:saleLineIds.length===1?"single_link":saleLineIds.length>1?"multi_link_unallocated":"unmatched",source_updated_at:toIso(line.write_date??move?.write_date),last_seen_at:now,synced_at:now};
    });
    const upsert=async(table:string,rows:JsonRecord[],conflict:string)=>{if(!rows.length) return 0; let written=0; for(const batch of chunks(rows,500)){const {error}=await supabase!.from(table).upsert(batch,{onConflict:conflict}); if(error) throw new Error(`${table} upsert failed: ${error.message}`); written+=batch.length;} return written;};
    const {data:customerGeoRefresh,error:customerGeoRefreshError}=await supabase.rpc("refresh_customer_geography_dimension_v1");
    if(customerGeoRefreshError) throw new Error(`Customer geography refresh failed: ${customerGeoRefreshError.message}`);
    const deliveryAddressesWritten=await upsert("customer_delivery_address_dimension",deliveryAddressRows,"company_id,delivery_partner_id");
    const orderShippingWritten=await upsert("otc_order_shipping_dimension",orderShippingRows,"company_id,order_id");
    const {data:geoRefresh,error:geoRefreshError}=await supabase.rpc("refresh_customer_delivery_geography_v1");
    if(geoRefreshError) throw new Error(`Delivery geography refresh failed: ${geoRefreshError.message}`);
    const deliveriesWritten=await upsert("otc_delivery_lines",deliveryRows,"odoo_move_id"), returnsWritten=await upsert("otc_return_lines",returnRows,"odoo_return_move_id"), invoicesWritten=await upsert("otc_invoice_lines",invoiceRows,"account_move_line_id");
    const finishedAt=new Date().toISOString();
    const summary={customer_geography_refresh:customerGeoRefresh,order_shipping_written:orderShippingWritten,delivery_addresses_written:deliveryAddressesWritten,delivery_geography_refresh:geoRefresh,deliveries_written:deliveriesWritten,returns_written:returnsWritten,invoice_lines_written:invoicesWritten,diagnostics,no_historical_delete:true};
    const {error:logError}=await supabase.from("sync_logs").insert({sync_type:"order_to_cash_returns",status:"success",message:JSON.stringify(summary),rows_count:deliveriesWritten+returnsWritten+invoicesWritten,started_at:startedAt,finished_at:finishedAt});
    if(logError) throw new Error(`sync_logs insert failed: ${logError.message}`);
    return json({success:true,mode:"sync",caller_role:callerRole,database:odooDb,start_date:startDate,end_date:endDate,...summary});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    // Dry runs must be read-only, including their failure path. Unauthorized callers
    // must not generate writes via a service-role client either.
    if(supabase && mode === "sync" && message !== "AUTH_REQUIRED" && message !== "SYNC_FORBIDDEN"){
      try{
        await supabase.from("sync_logs").insert({sync_type:"order_to_cash_returns",status:"error",message,rows_count:0,started_at:startedAt,finished_at:new Date().toISOString()});
      }catch(logError){
        console.error("OTC sync failure logging failed",logError);
      }
    }
    const status=message === "AUTH_REQUIRED" ? 401 : message === "SYNC_FORBIDDEN" ? 403 : 500;
    return json({success:false,error:message},status);
  }
});
