import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {transformSync} from "esbuild";
const source=readFileSync("supabase/functions/probe-odoo18-uom-readonly/index.ts","utf8")
 .replace(/^import "jsr:[^\n]+\n/m,"")
 .replace(/^import \{ createClient \} from "npm:[^\n]+\n/m,"");
const js=transformSync(source,{loader:"ts",target:"es2022",format:"iife"}).code;
let handler,odooCalls=0,writes=0,authorizedUser=null,role=null,scope=[1];
let missingCategory=false,wrongCompany=false,invalidQuantity=false;
const fakeService={
 auth:{getUser:async()=>({data:{user:authorizedUser},error:null})},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:role,error:null})})})}),
};
const fakeStaff={rpc:async()=>({data:scope,error:null})};
runInNewContext(js,{
 Deno:{serve:(fn)=>{handler=fn;},env:{get:(k)=>({
   SUPABASE_URL:"https://supa.test",SUPABASE_SERVICE_ROLE_KEY:"service-test",
   SUPABASE_ANON_KEY:"anon-test",ODOO_URL:"https://odoo.test",ODOO_DB:"TEST",
   ODOO_API_KEY:"key",ODOO_USERNAME:"staff",
 })[k]}},
 createClient:(_url,key)=>key==="service-test"?fakeService:fakeStaff,
 fetch:async(_url,options)=>{
  odooCalls++;
  const v=JSON.parse(options.body);
  if(v.params.service==="common")return {ok:true,json:async()=>({result:10})};
  const [db,uid,key,model,method,args,kwargs]=v.params.args;
  assert.equal(db,"TEST");assert.equal(uid,10);
  assert.ok(["fields_get","search_read"].includes(method));
  const fields={
   "stock.move":["id","company_id","product_id","picking_id","origin_returned_move_id","sale_line_id","state","write_date","quantity","product_uom_qty","product_uom"],
   "product.product":["id","name","uom_id"],
   "uom.uom":["id","name","category_id","factor","factor_inv","rounding"],
  };
  let result;
  if(method==="fields_get")result=Object.fromEntries(fields[model].map(k=>[k,{type:"unknown"}]));
  else if(model==="stock.move"){
   assert.deepEqual(JSON.parse(JSON.stringify(args[0])),[["company_id","=",1],["state","=","done"]]);
   assert.equal(kwargs.limit,5);
   result=[{id:100,company_id:wrongCompany?[2,"Horeca Smart"]:[1,"MAS"],product_id:[200,"Product"],
     picking_id:[300,"Delivery"],origin_returned_move_id:false,
     sale_line_id:[400,"Line"],state:"done",quantity:invalidQuantity?"not-a-number":10,
     product_uom_qty:11,product_uom:[5,"Box"],write_date:"2026-11-20 10:00:00"}];
  }else if(model==="product.product")result=[{id:200,uom_id:[6,"Each"]}];
  else if(model==="uom.uom")result=[
   {id:5,category_id:missingCategory?false:[3,"Units"],factor:0.1},
   {id:6,category_id:[3,"Units"],factor:1},
  ];else throw Error(model);
  return {ok:true,json:async()=>({result})};
 },
 Response,Request,Headers,crypto:globalThis.crypto,
 console:{error:()=>{}},
});
const call=async(body={},token)=>{
 const headers={"Content-Type":"application/json"};
 if(token)headers.Authorization="Bearer "+token;
 const response=await handler(new Request("https://supa.test/functions/v1/probe-odoo18-uom-readonly",{
  method:"POST",headers,body:JSON.stringify({company_id:1,limit:5,...body}),
 }));
 return {status:response.status,data:await response.json()};
};
let a=await call();assert.equal(a.status,401);assert.equal(odooCalls,0);
authorizedUser={id:"user-1"};role={role:"sales_rep",is_active:true};
a=await call({},"jwt");assert.equal(a.status,403);assert.equal(odooCalls,0);
role={role:"manager",is_active:true};
scope=[2];a=await call({},"jwt");assert.equal(a.status,403);assert.equal(odooCalls,0);
scope=[1];a=await call({limit:101},"jwt");assert.equal(a.status,400);assert.equal(odooCalls,0);
a=await call({},"jwt");
assert.equal(a.status,200,JSON.stringify(a));
assert.equal(a.data.writes_performed,0);
assert.equal(a.data.metadata.formula_verified,false);
assert.equal(a.data.samples[0].source_move_uom_id,5);
assert.equal(a.data.samples[0].product_base_uom_id,6);
assert.equal(a.data.samples[0].same_uom_category,true);
assert.equal(a.data.samples[0].arithmetic_verified,false);
assert.equal(a.data.samples[0].metadata_complete,true);
assert.equal(a.data.metadata_complete_count,1);
missingCategory=true;
a=await call({},"jwt");
assert.equal(a.status,200);
assert.equal(a.data.samples[0].same_uom_category,null);
assert.equal(a.data.samples[0].metadata_complete,false);
assert.equal(a.data.diagnostic_issue_counts.MISSING_UOM_CATEGORY,1);
missingCategory=false;
wrongCompany=true;
a=await call({},"jwt");
assert.equal(a.data.samples[0].source_company_matches_request,false);
assert.equal(a.data.diagnostic_issue_counts.WRONG_COMPANY_SOURCE,1);
wrongCompany=false;
invalidQuantity=true;
a=await call({},"jwt");
assert.equal(a.data.samples[0].performed_quantity_valid,false);
assert.equal(a.data.diagnostic_issue_counts.INVALID_EXECUTED_QUANTITY,1);
invalidQuantity=false;
assert.equal(writes,0);
console.log("✓ read-only UoM probe auth, company isolation, bounded inputs and evidence semantics");
