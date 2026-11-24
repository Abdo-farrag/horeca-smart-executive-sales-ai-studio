import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Diagnostics only. This function never writes to Odoo or Supabase.
// Quantity / unit semantics cannot be certified from field names alone.
type Row = Record<string, unknown>;
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type"};
const respond=(body:Row,status=200)=>new Response(JSON.stringify(body),{status,headers});
const m2o=(v:unknown)=>Array.isArray(v)&&Number.isInteger(Number(v[0]))?Number(v[0]):null;
const validCompany=(n:unknown)=>Number.isInteger(n)&&[1,2].includes(Number(n));
function required(name:string){const v=Deno.env.get(name)?.trim();if(!v)throw Error("MISSING_CONFIGURATION");return v;}
async function odoo(url:string,db:string,uid:number,key:string,model:string,method:string,args:unknown[],kwargs:Row={}):Promise<unknown>{
 const response=await fetch(url.replace(/\\/$/,"")+"/jsonrpc",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({jsonrpc:"2.0",method:"call",params:{service:"object",method:"execute_kw",args:[db,uid,key,model,method,args,kwargs]},id:1}),
 });
 if(!response.ok)throw Error("ODOO_READ_FAILED");
 const payload=await response.json();
 if(payload.error)throw Error("ODOO_READ_FAILED");
 return payload.result;
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return respond({error:"METHOD_NOT_ALLOWED"},405);
 try{
  const body=await req.json().catch(()=>({})) as Row;
  // Bounded read-only sample: explicit company required. User input is never
  // treated as an Odoo model, field, method, URL, or unrestricted query.
  const companyId=body.company_id;
  if(!validCompany(companyId))return respond({error:"INVALID_COMPANY"},400);
  const limit=body.limit===undefined?30:Number(body.limit);
  if(!Number.isInteger(limit)||limit<1||limit>100)return respond({error:"INVALID_LIMIT"},400);
  const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"").trim();
  if(!token)return respond({error:"AUTH_REQUIRED"},401);
  const client=createClient(required("SUPABASE_URL"),required("SUPABASE_SERVICE_ROLE_KEY"),
   {auth:{persistSession:false,autoRefreshToken:false}});
  // Service token alone is not a staff identity: require an actual verified user.
  const {data:{user},error:authError}=await client.auth.getUser(token);
  if(authError||!user)return respond({error:"AUTH_REQUIRED"},401);
  const {data:role,error:roleError}=await client.from("app_user_roles")
   .select("role,is_active,company_id").eq("user_id",user.id).maybeSingle();
  if(roleError||!role?.is_active||!["admin","manager"].includes(String(role.role)))
   return respond({error:"PROBE_FORBIDDEN"},403);
  const {data:scope,error:scopeError}=await client.rpc("authorized_company_ids");
  if(scopeError||!Array.isArray(scope)||!scope.map(Number).includes(Number(companyId)))
   return respond({error:"COMPANY_SCOPE_FORBIDDEN"},403);

  const url=required("ODOO_URL"),db=Deno.env.get("ODOO_DB")?.trim()||"DB-LIVE";
  const key=required("ODOO_API_KEY"),username=required("ODOO_USERNAME");
  const authResponse=await fetch(url.replace(/\\/$/,"")+"/jsonrpc",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({jsonrpc:"2.0",method:"call",
    params:{service:"common",method:"authenticate",args:[db,username,key,{}]},id:1}),
  });
  if(!authResponse.ok)throw Error("ODOO_READ_FAILED");
  const auth=await authResponse.json();
  const uid=Number(auth.result);
  if(!Number.isInteger(uid)||uid<=0)throw Error("ODOO_AUTH_FAILED");

  // Dynamic introspection; never assume Odoo 18 fields or formula semantics.
  const moveMeta=await odoo(url,db,uid,key,"stock.move","fields_get",[],{attributes:["type","relation","string"]}) as Row;
  const productMeta=await odoo(url,db,uid,key,"product.product","fields_get",[],{attributes:["type","relation","string"]}) as Row;
  const uomMeta=await odoo(url,db,uid,key,"uom.uom","fields_get",[],{attributes:["type","relation","string"]}) as Row;
  const moveFields=["id","company_id","product_id","picking_id","origin_returned_move_id",
   "sale_line_id","state","write_date","quantity","product_uom_qty","product_uom"].filter(f=>f in moveMeta);
  if(!["id","company_id","product_id","quantity","product_uom"].every(f=>moveFields.includes(f)))
   return respond({success:false,error:"REQUIRED_MOVE_FIELDS_MISSING",
     field_availability:Object.fromEntries(["quantity","product_uom","product_uom_qty","origin_returned_move_id","sale_line_id"].map(f=>[f,f in moveMeta])),
     writes_performed:0},422);
  const records=await odoo(url,db,uid,key,"stock.move","search_read",
   [[["company_id","=",companyId],["state","=","done"]]],
   {fields:moveFields,limit,order:"id desc",context:{allowed_company_ids:[companyId]}}) as Row[];
  const productIds=[...new Set(records.map(r=>m2o(r.product_id)).filter((n):n is number=>n!==null))];
  const productFields=["id","uom_id","name"].filter(f=>f in productMeta);
  const products=productIds.length?await odoo(url,db,uid,key,"product.product","search_read",
   [[["id","in",productIds]]],{fields:productFields,limit:100,context:{allowed_company_ids:[companyId]}}) as Row[]:[];
  const sourceUomIds=[...new Set(records.map(r=>m2o(r.product_uom)).filter((n):n is number=>n!==null))];
  const baseUomIds=products.map(r=>m2o(r.uom_id)).filter((n):n is number=>n!==null);
  const allUoms=[...new Set([...sourceUomIds,...baseUomIds])];
  const uomFields=["id","name","category_id","factor","factor_inv","ratio","rounding","relative_factor"]
    .filter(f=>f in uomMeta);
  const uoms=allUoms.length?await odoo(url,db,uid,key,"uom.uom","search_read",
   [[["id","in",allUoms]]],{fields:uomFields,limit:200,context:{allowed_company_ids:[companyId]}}) as Row[]:[];
  const productById=new Map(products.map(p=>[Number(p.id),p]));
  const uomById=new Map(uoms.map(u=>[Number(u.id),u]));
  const samples=records.map(r=>{
   const productId=m2o(r.product_id),sourceId=m2o(r.product_uom);
   const product=productId==null?undefined:productById.get(productId);
   const baseId=m2o(product?.uom_id);
   const sourceUom=sourceId==null?undefined:uomById.get(sourceId);
   const baseUom=baseId==null?undefined:uomById.get(baseId);
   const sameCategory=sourceUom&&baseUom?m2o(sourceUom.category_id)===m2o(baseUom.category_id):null;
   return {move_id:r.id,product_id:productId,origin_move_id:m2o(r.origin_returned_move_id),
    sale_order_line_id:m2o(r.sale_line_id),source_move_uom_id:sourceId,
    product_base_uom_id:baseId,
    source_uom_category_id:m2o(sourceUom?.category_id),base_uom_category_id:m2o(baseUom?.category_id),
    same_uom_category:sameCategory,executed_quantity:r.quantity??null,
    demanded_quantity:r.product_uom_qty??null,source_updated_at:r.write_date??null,
    arithmetic_verified:false,requires_semantics_review:true};
  });
  return respond({success:true,mode:"read_only_uom_probe",writes_performed:0,
   company_id:companyId,returned_moves:samples.length,
   metadata:{stock_move_fields:Object.fromEntries(["quantity","product_uom","product_uom_qty","origin_returned_move_id","sale_line_id"].map(f=>[f,f in moveMeta])),
    product_uom_available:"uom_id" in productMeta,
    uom_fields_available:uomFields,formula_verified:false},
   samples,warning:"Source Odoo fields and UoM categories are observed only. No conversion formula or arithmetic alert is certified."});
 }catch(e){
  console.error("OTC_UOM_READONLY_PROBE_FAILED",e instanceof Error?e.message:"UNKNOWN");
  return respond({success:false,error:"UOM_PROBE_FAILED",writes_performed:0},500);
 }
});
