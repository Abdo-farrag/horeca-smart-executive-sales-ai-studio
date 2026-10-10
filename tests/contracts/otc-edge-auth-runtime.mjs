import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

// Runtime security regression test using only mocks. This must never contact Odoo or Supabase.
const source=readFileSync("supabase/functions/sync-odoo18-order-to-cash/index.ts","utf8")
  .replace(/^import "jsr:[^\n]+\n/m,"")
  .replace(/^import \{ createClient \} from "npm:[^\n]+\n/m,"");
const js=transformSync(source,{loader:"ts",target:"es2022",format:"iife"}).code;
let handler;
let writes=0;
let networkCalls=0;
let allowMockOdoo=false;
let diagnosticReasons=[];
let authorizedUser=null;
let lookupRole=null;
const supabase={
  auth:{getUser:async()=>({data:{user:authorizedUser},error:authorizedUser?null:{message:"invalid user"}})},
  from(table){
    return {
      insert:async()=>{writes++;return {error:null};},
      upsert:async()=>{writes++;return {error:null};},
      select:()=>({eq:()=>({maybeSingle:async()=>({data:lookupRole,error:null})})}),
    };
  },
};
runInNewContext(js,{
  Deno:{serve:(fn)=>{handler=fn;},env:{get:(k)=>({
    SUPABASE_URL:"https://test.invalid",
    SUPABASE_SERVICE_ROLE_KEY:"test-only-service-key",
    ...(allowMockOdoo?{ODOO_URL:"https://odoo.test.invalid",ODOO_USERNAME:"test-user",ODOO_API_KEY:"dummy",ODOO_DB:"TEST"}:{}),
    // No Odoo credentials: authorization MUST happen before Odoo access.
  })[k]}},
  createClient:()=>supabase,
  Response,Request,Headers,URL,crypto:globalThis.crypto,
  fetch:async(_url,options)=>{
    networkCalls++;
    if(!allowMockOdoo) throw Error("unexpected network");
    const payload=JSON.parse(options.body);
    if(payload.params.service==="common") return {ok:true,json:async()=>({result:101})};
    const [db,uid,key,model,method]=payload.params.args;
    assert.equal(db,"TEST");
    assert.equal(uid,101);
    if(method==="fields_get"){
      const fields={
        "stock.move":["id","picking_id","product_id","product_uom_qty","quantity","origin_returned_move_id","state","sale_line_id"],
        "stock.picking":["id","name","picking_type_code","origin","partner_id","company_id","state","date_done","return_id"],
        "account.move":["id","name","move_type","state","date","invoice_date","invoice_origin","company_id","partner_id","invoice_user_id","reversed_entry_id","currency_id"],
        "account.move.line":["id","move_id","product_id","quantity","price_subtotal","price_total","sale_line_ids","display_type"],
        "res.partner":["id","name"],
        "sale.order":["id","partner_shipping_id"],
      }[model];
      assert.ok(fields,`unknown mocked model ${model}`);
      return {ok:true,json:async()=>({result:Object.fromEntries(fields.map(f=>[f,{type:"string"}]))})};
    }
    if(method==="search_read") return {ok:true,json:async()=>({result:[]})};
    throw Error("unexpected Odoo method "+method);
  },
  console:{warn:(label,info)=>{assert.equal(label,"OTC_AUTH_DENIED");diagnosticReasons.push(info.reason);},error:()=>{},log:()=>{}},
});
assert.equal(typeof handler,"function");

async function request(mode,token){
  const headers={"Content-Type":"application/json"};
  if(token!==undefined) headers.Authorization="Bearer "+token;
  const response=await handler(new Request("https://test.invalid/functions/v1/sync-odoo18-order-to-cash",{
    method:"POST",headers,body:JSON.stringify({mode,company_ids:[1],start_date:"2026-10-01",end_date:"2026-10-02"})
  }));
  return {status:response.status,body:await response.json()};
}
for(const mode of ["dry_run","sync"]){
  authorizedUser=null;
  let result=await request(mode);
  assert.equal(result.status,401);
  assert.equal(result.body.error,"AUTH_REQUIRED");
  result=await request(mode,"invalid-user-token");
  assert.equal(result.status,401);
  assert.equal(result.body.error,"AUTH_REQUIRED");
  authorizedUser={id:"fake-user"};
  lookupRole={role:"salesperson",is_active:true};
  result=await request(mode,"unprivileged-user-token");
  assert.equal(result.status,403);
  assert.equal(result.body.error,"SYNC_FORBIDDEN");
}
// A permitted dry run that fails before contacting Odoo must still perform zero writes.
authorizedUser={id:"fake-admin-user"};
lookupRole={role:"admin",is_active:true};
const permittedDryRun=await request("dry_run","valid-test-admin-token");
assert.equal(permittedDryRun.status,500);
assert.match(permittedDryRun.body.error,/Missing required secret: ODOO_URL/);
// Invalid calendar dates must fail before calling Odoo or writing to Supabase.
for(const badDate of ["2026-02-30","2026-13-01","2026-10-01T12:00:00","2026/10/01"]){
  const response=await handler(new Request("https://test.invalid/functions/v1/sync-odoo18-order-to-cash",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"dry_run",company_ids:[1],start_date:badDate,end_date:"2026-10-02"})
  }));
  assert.equal(response.status,500);
  assert.equal((await response.json()).error,"INVALID_DATE_RANGE");
}
const backwards=await handler(new Request("https://test.invalid/functions/v1/sync-odoo18-order-to-cash",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"dry_run",start_date:"2026-10-03",end_date:"2026-10-02"})
}));
assert.equal((await backwards.json()).error,"INVALID_DATE_RANGE");
// A complete authorized dry_run with simulated Odoo API and empty data
// MUST succeed without any database writes, even though it makes read-only Odoo calls.
allowMockOdoo=true;
const completeDryRun=await request("dry_run","valid-test-admin-token");
assert.equal(completeDryRun.status,200,JSON.stringify(completeDryRun));
assert.equal(completeDryRun.body.success,true);
assert.equal(completeDryRun.body.mode,"dry_run");
assert.equal(completeDryRun.body.writes_performed,0);
assert.equal(completeDryRun.body.diagnostics.delivery_moves_count,0);
assert.equal(completeDryRun.body.diagnostics.invoice_lines_count,0);
assert.ok(networkCalls>0,"mocked read-only Odoo API calls were expected");
allowMockOdoo=false;
assert.deepEqual(diagnosticReasons,[
  "missing_authorization","unresolved_user_token","role_not_authorized",
  "missing_authorization","unresolved_user_token","role_not_authorized",
]);
assert.equal(writes,0,"unauthorized failure paths must never write sync logs or snapshots");
assert.ok(networkCalls>0,"authorized dry run should call mocked Odoo");
console.log("OTC Edge unauthorized paths: zero writes and zero external network calls");
