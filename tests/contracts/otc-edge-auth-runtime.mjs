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
    // No Odoo credentials: authorization MUST happen before Odoo access.
  })[k]}},
  createClient:()=>supabase,
  Response,Request,Headers,URL,crypto:globalThis.crypto,
  fetch:async()=>{networkCalls++;throw Error("unexpected network");},
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
assert.deepEqual(diagnosticReasons,[
  "missing_authorization","unresolved_user_token","role_not_authorized",
  "missing_authorization","unresolved_user_token","role_not_authorized",
]);
assert.equal(writes,0,"unauthorized failure paths must never write sync logs or snapshots");
assert.equal(networkCalls,0,"unauthorized requests must never reach Odoo");
console.log("OTC Edge unauthorized paths: zero writes and zero external network calls");
