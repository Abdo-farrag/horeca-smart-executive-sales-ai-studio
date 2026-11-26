import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {transformSync} from "esbuild";
const raw=readFileSync("supabase/functions/probe-odoo18-movement-reconciliation/index.ts","utf8")
 .replace(/^import "jsr:[^\n]+\n/m,"")
 .replace(/^import \{ createClient \} from "npm:[^\n]+\n/m,"");
const js=transformSync(raw,{loader:"ts",target:"es2022",format:"iife"}).code;
let handler,odooCalls=0,writes=0,user=null,role=null,allowed=[1],scenario="match";
const service={
 auth:{getUser:async()=>({data:{user},error:null})},
 from(table){
  if(table==="app_user_roles")return {select:()=>({eq:()=>({maybeSingle:async()=>({data:role,error:null})})})};
  const states={field:"",rows:[]};
  return {
   select(value){states.field=value;return this;},
   eq(){return this;},gte(){return this;},lt(){return this;},order(){return this;},
   async range(){
    let rows=table==="otc_delivery_lines"?[{company_id:1,odoo_move_id:10}]:
     [{company_id:1,odoo_return_move_id:20}];
    if(scenario==="missing"&&table==="otc_return_lines")rows=[];
    if(scenario==="extra"&&table==="otc_return_lines")rows.push({company_id:1,odoo_return_move_id:99});
    if(scenario==="snapshot_duplicate"&&table==="otc_return_lines")rows.push({company_id:1,odoo_return_move_id:20});
    if(scenario==="invalid_snapshot_id"&&table==="otc_return_lines")rows.push({company_id:1,odoo_return_move_id:"invalid"});
    return {data:rows,error:null};
   },
  };
 },
};
const staff={rpc:async()=>({data:allowed,error:null})};
runInNewContext(js,{
 Deno:{serve:fn=>{handler=fn;},env:{get:key=>({
 SUPABASE_URL:"https://db.test",SUPABASE_ANON_KEY:"anon",
 SUPABASE_SERVICE_ROLE_KEY:"service",ODOO_URL:"https://odoo.test",
 ODOO_DB:"TEST",ODOO_USERNAME:"test",ODOO_API_KEY:"key"})[key]}},
 createClient:(_url,key)=>key==="service"?service:staff,
 fetch:async(_url,opts)=>{
  odooCalls++;
  const v=JSON.parse(opts.body);
  if(v.params.service==="common")return {ok:true,json:async()=>({result:11})};
  const [db,uid,key,model,method,args,kwargs]=v.params.args;
  assert.equal(db,"TEST");assert.equal(uid,11);
  assert.equal(method,"search_read");
  if(model==="stock.picking"){
   assert.equal(kwargs.limit,401);
   assert.equal(kwargs.context.allowed_company_ids[0],1);
   const items=scenario==="limit"?Array.from({length:401},(_,i)=>({
     id:i+1,company_id:[1,"MAS"],picking_type_code:"outgoing",state:"done",
   })):[
    {id:1,company_id:[1,"MAS"],picking_type_code:"outgoing",state:"done"},
    {id:2,company_id:[1,"MAS"],picking_type_code:"incoming",state:"done"},
   ];
   return {ok:true,json:async()=>({result:items})};
  }
  if(model==="stock.move"){
   assert.equal(kwargs.limit,2001);
   const items=[
    {id:10,company_id:[1,"MAS"],picking_id:[1,"OUT"],origin_returned_move_id:false,state:"done"},
    {id:20,company_id:[scenario==="leak"?2:1,"MAS"],picking_id:[2,"RET"],
     origin_returned_move_id:[10,"Original"],state:"done"},
   ];
   if(scenario==="odoo_duplicate")items.push({...items[1]});
   if(scenario==="odoo_invalid")items[1].id=0;
   return {ok:true,json:async()=>({result:items})};
  }
  throw Error("Unexpected Odoo model "+model);
 },
 Response,Request,Headers,crypto:globalThis.crypto,console:{error:()=>{}},
});
async function call(body={},token=""){
 const head={"Content-Type":"application/json"};
 if(token)head.Authorization="Bearer "+token;
 const res=await handler(new Request("https://supa.test/functions/v1/probe",{
  method:"POST",headers:head,body:JSON.stringify({company_id:1,start_date:"2026-10-01",
   end_date:"2026-10-01",...body}),
 }));
 return {status:res.status,body:await res.json()};
}
let x=await call();assert.equal(x.status,401);assert.equal(odooCalls,0);
user={id:"user-1"};role={role:"sales_rep",is_active:true};
x=await call({},"jwt");assert.equal(x.status,403);assert.equal(odooCalls,0);
role={role:"manager",is_active:true};allowed=[2];
x=await call({},"jwt");assert.equal(x.status,403);assert.equal(odooCalls,0);
allowed=[1];
x=await call({end_date:"2026-10-09"},"jwt");assert.equal(x.status,400);assert.equal(odooCalls,0);
x=await call({start_date:"2026-10-32"},"jwt");assert.equal(x.status,400);
scenario="match";x=await call({},"jwt");
assert.equal(x.status,200,JSON.stringify(x));assert.equal(x.body.status,"IDS_MATCH_IN_WINDOW");
assert.equal(x.body.deliveries.odoo_count,1);assert.equal(x.body.returns.odoo_count,1);
scenario="missing";x=await call({},"jwt");
assert.equal(x.body.status,"ID_MISMATCH");
assert.equal(x.body.returns.missing_in_snapshot_count,1);
assert.deepEqual(JSON.parse(JSON.stringify(x.body.returns.missing_move_ids_sample)),[20]);
scenario="extra";x=await call({},"jwt");assert.equal(x.body.returns.extra_in_snapshot_count,1);
scenario="leak";x=await call({},"jwt");
assert.equal(x.status,502);assert.equal(x.body.error,"UPSTREAM_COMPANY_SCOPE_MISMATCH");
assert.equal(x.body.returns,undefined);
scenario="limit";x=await call({},"jwt");
assert.equal(x.body.status,"INCOMPLETE_WINDOW");assert.equal(x.body.reason,"PICKING_LIMIT_EXCEEDED");
assert.equal(x.body.deliveries,undefined);
for(const [caseName,reason] of [
 ["snapshot_duplicate","DUPLICATE_SNAPSHOT_MOVE_ID"],
 ["invalid_snapshot_id","INVALID_SNAPSHOT_MOVE_ID"],
 ["odoo_duplicate","INVALID_OR_DUPLICATE_ODOO_MOVE_ID"],
 ["odoo_invalid","INVALID_OR_DUPLICATE_ODOO_MOVE_ID"],
]){
 scenario=caseName;x=await call({},"jwt");
 assert.equal(x.status,200);
 assert.equal(x.body.status,"INCOMPLETE_WINDOW",caseName);
 assert.equal(x.body.reason,reason,caseName);
 assert.equal(x.body.deliveries,undefined,caseName);
 assert.equal(x.body.writes_performed,0,caseName);
}
assert.equal(writes,0);
console.log("✓ bounded movement reconciliation, authorization, missing/extra IDs, truncation and fail-closed source scope");
