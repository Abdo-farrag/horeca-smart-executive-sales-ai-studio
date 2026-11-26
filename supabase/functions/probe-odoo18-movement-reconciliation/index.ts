import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Issue #13. Independent, read-only Odoo↔OTC movement-ID reconciliation.
// Never writes to either system. An incomplete bounded sample cannot pass.
type Row=Record<string,unknown>;
type Move={id:number;picking_id?:unknown;company_id?:unknown;origin_returned_move_id?:unknown;state?:string};
type Picking={id:number;company_id?:unknown;picking_type_code?:string;date_done?:string;state?:string};
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type"};
const result=(body:Row,status=200)=>new Response(JSON.stringify(body),{status,headers});
const id=(v:unknown):number|null=>Array.isArray(v)&&Number.isInteger(Number(v[0]))?Number(v[0]):null;
const env=(key:string)=>{const v=Deno.env.get(key)?.trim();if(!v)throw Error("MISSING_CONFIGURATION");return v;};
function day(s:unknown):s is string{
 if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+"T00:00:00Z");return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;
}
const dayAfter=(s:string)=>{const d=new Date(s+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
async function jsonrpc(url:string,service:string,method:string,args:unknown[]):Promise<unknown>{
 const res=await fetch(url.replace(/\/$/,"")+"/jsonrpc",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({jsonrpc:"2.0",method:"call",params:{service,method,args},id:1}),
 });
 if(!res.ok)throw Error("ODOO_READ_FAILED");
 const payload=await res.json();if(payload.error)throw Error("ODOO_READ_FAILED");
 return payload.result;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return result({error:"METHOD_NOT_ALLOWED"},405);
 try{
  const body=await req.json().catch(()=>({})) as Row;
  const company=Number(body.company_id);
  if(!Number.isInteger(company)||![1,2].includes(company))return result({error:"INVALID_COMPANY"},400);
  if(!day(body.start_date)||!day(body.end_date))return result({error:"INVALID_DATES"},400);
  const start=body.start_date,end=body.end_date;
  const length=(Date.parse(end+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86400000;
  if(length<0||length>6)return result({error:"DATE_WINDOW_EXCEEDS_7_DAYS"},400);
  const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return result({error:"AUTH_REQUIRED"},401);
  const url=env("SUPABASE_URL");
  const service=createClient(url,env("SUPABASE_SERVICE_ROLE_KEY"),{
   auth:{persistSession:false,autoRefreshToken:false},
  });
  const {data:{user},error:authError}=await service.auth.getUser(token);
  if(authError||!user)return result({error:"AUTH_REQUIRED"},401);
  const {data:role,error:roleError}=await service.from("app_user_roles")
   .select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(roleError||!role?.is_active||!["admin","manager"].includes(String(role.role)))
   return result({error:"RECONCILIATION_FORBIDDEN"},403);
  const staff=createClient(url,env("SUPABASE_ANON_KEY"),{
   global:{headers:{Authorization:"Bearer "+token}},
   auth:{persistSession:false,autoRefreshToken:false},
  });
  const {data:allowed,error:scopeError}=await staff.rpc("authorized_company_ids");
  if(scopeError||!Array.isArray(allowed)||!allowed.map(Number).includes(company))
   return result({error:"COMPANY_SCOPE_FORBIDDEN"},403);

  const odooUrl=env("ODOO_URL"),db=Deno.env.get("ODOO_DB")?.trim()||"DB-LIVE";
  const key=env("ODOO_API_KEY"),username=env("ODOO_USERNAME");
  const uid=Number(await jsonrpc(odooUrl,"common","authenticate",[db,username,key,{}]));
  if(!Number.isInteger(uid)||uid<=0)throw Error("ODOO_AUTH_FAILED");
  const execute=(model:string,method:string,args:unknown[],kwargs:Row={})=>
    jsonrpc(odooUrl,"object","execute_kw",[db,uid,key,model,method,args,kwargs]);

  // Must fetch one sentinel extra row so that 'complete' is demonstrably bounded.
  const maxPickings=400,maxMoves=2000,maxSnapshot=2000;
  const next=dayAfter(end);
  const pickings=await execute("stock.picking","search_read",
   [[["state","=","done"],["company_id","=",company],
     ["date_done",">=",start+" 00:00:00"],["date_done","<",next+" 00:00:00"]]],
   {fields:["id","company_id","picking_type_code","date_done","state"],
    limit:maxPickings+1,order:"id asc",context:{allowed_company_ids:[company]}}) as Picking[];
  if(!Array.isArray(pickings))throw Error("BAD_ODOO_RESPONSE");
  if(pickings.some(p=>id(p.company_id)!==company||p.state!=="done"))
   return result({error:"UPSTREAM_COMPANY_SCOPE_MISMATCH",writes_performed:0},502);
  if(pickings.length>maxPickings)return result({success:false,status:"INCOMPLETE_WINDOW",
   reason:"PICKING_LIMIT_EXCEEDED",sample_count:pickings.length,writes_performed:0},200);
  const ids=pickings.map(p=>p.id);
  const pickingById=new Map(pickings.map(p=>[p.id,p]));
  const moves=ids.length?await execute("stock.move","search_read",
   [[["picking_id","in",ids],["state","=","done"]]],
   {fields:["id","picking_id","company_id","origin_returned_move_id","state"],
    limit:maxMoves+1,order:"id asc",context:{allowed_company_ids:[company]}}) as Move[]:[];
  if(!Array.isArray(moves))throw Error("BAD_ODOO_RESPONSE");
  if(moves.some(m=>id(m.company_id)!==company||m.state!=="done"||!pickingById.has(id(m.picking_id)??-1)))
   return result({error:"UPSTREAM_COMPANY_SCOPE_MISMATCH",writes_performed:0},502);
  if(moves.length>maxMoves)return result({success:false,status:"INCOMPLETE_WINDOW",
   reason:"MOVE_LIMIT_EXCEEDED",sample_count:moves.length,writes_performed:0},200);
  // A Set silently collapses repeated IDs and can falsely report a clean match.
  const upstreamIds=moves.map(m=>Number(m.id));
  if(upstreamIds.some(n=>!Number.isSafeInteger(n)||n<=0)||
     new Set(upstreamIds).size!==upstreamIds.length)
   return result({success:false,status:"INCOMPLETE_WINDOW",
    reason:"INVALID_OR_DUPLICATE_ODOO_MOVE_ID",writes_performed:0});
  const srcDelivery=new Set<number>(),srcReturn=new Set<number>();
  for(const move of moves){
   const isReturn=id(move.origin_returned_move_id)!==null;
   if(isReturn)srcReturn.add(move.id);
   else if(pickingById.get(id(move.picking_id)??-1)?.picking_type_code==="outgoing")
     srcDelivery.add(move.id);
  }
  const fetchRows=async(table:"otc_delivery_lines"|"otc_return_lines",keyField:string,dateField:string)=>{
   const {data,error}=await service.from(table).select(keyField+",company_id")
    .eq("company_id",company).gte(dateField,start+"T00:00:00Z")
    .lt(dateField,next+"T00:00:00Z").order(keyField,{ascending:true})
    .range(0,maxSnapshot);
   if(error||!Array.isArray(data))throw Error("OTC_SNAPSHOT_READ_FAILED");
   if(data.some((r:Row)=>Number(r.company_id)!==company))throw Error("OTC_SCOPE_MISMATCH");
   if(data.length>maxSnapshot)return {status:"limit" as const};
   const moveIds=data.map((r:Row)=>Number(r[keyField]));
   if(moveIds.some(n=>!Number.isSafeInteger(n)||n<=0))
    return {status:"invalid" as const};
   if(new Set(moveIds).size!==moveIds.length)
    return {status:"duplicate" as const};
   return {status:"complete" as const,ids:new Set<number>(moveIds)};
  };
  const [snapDelivery,snapReturn]=await Promise.all([
   fetchRows("otc_delivery_lines","odoo_move_id","delivery_date"),
   fetchRows("otc_return_lines","odoo_return_move_id","return_receipt_date"),
  ]);
  if(snapDelivery.status!=="complete"||snapReturn.status!=="complete"){
   const failure=snapDelivery.status!=="complete"?snapDelivery:snapReturn;
   return result({success:false,status:"INCOMPLETE_WINDOW",
    reason:failure.status==="limit"?"SNAPSHOT_LIMIT_EXCEEDED":
      failure.status==="duplicate"?"DUPLICATE_SNAPSHOT_MOVE_ID":"INVALID_SNAPSHOT_MOVE_ID",
    writes_performed:0});
  }
  const compare=(source:Set<number>,snapshot:Set<number>)=>{
   const missing=[...source].filter(x=>!snapshot.has(x));
   const extra=[...snapshot].filter(x=>!source.has(x));
   return {odoo_count:source.size,snapshot_count:snapshot.size,
    missing_in_snapshot_count:missing.length,extra_in_snapshot_count:extra.length,
    missing_move_ids_sample:missing.slice(0,20),extra_move_ids_sample:extra.slice(0,20),
    ids_match:missing.length===0&&extra.length===0};
  };
  const delivery=compare(srcDelivery,snapDelivery.ids),returns=compare(srcReturn,snapReturn.ids);
  return result({success:true,status:delivery.ids_match&&returns.ids_match?"IDS_MATCH_IN_WINDOW":"ID_MISMATCH",
   company_id:company,start_date:start,end_date:end,scope:"completed_pickings_in_requested_window",
   deliveries:delivery,returns,writes_performed:0,
   caveat:"Read-only source-accessible, bounded movement-ID comparison. Matching IDs do not certify Odoo source completeness, stock quantities, unit conversions or finalized accounting."});
 }catch(e){
  console.error("OTC_MOVEMENT_RECONCILIATION_FAILED",e instanceof Error?e.message:"UNKNOWN");
  return result({success:false,error:"RECONCILIATION_READ_FAILED",writes_performed:0},500);
 }
});
