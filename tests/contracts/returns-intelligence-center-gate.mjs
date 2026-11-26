import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bases=['src','apps/lovable/src','apps/studio/src'];
for(const base of bases){
 const access=readFileSync(base+'/access/viewCapabilities.ts','utf8');
 const app=readFileSync(base+'/App.tsx','utf8');
 const sidebar=readFileSync(base+'/components/Sidebar.tsx','utf8');
 const view=readFileSync(base+'/views/ReturnsIntelligenceCenter.tsx','utf8');
 assert.match(access,/'returns-intelligence'/,base+': missing navigation type');
 assert.match(app,/ReturnsIntelligenceCenter/,base+': missing route');
 assert.match(app,/VITE_RETURNS_REVIEW_CENTER_ENABLED === 'true'/,base+': route not feature-gated');
 assert.match(sidebar,/VITE_RETURNS_REVIEW_CENTER_ENABLED === 'true'/,base+': sidebar not gated');
 assert.match(view,/analytics_returns_cohort_dashboard_v1/,base+': backend cohort RPC missing');
 assert.match(view,/analytics_returns_cohort_order_detail_v1/,base+': order detail RPC missing');
 assert.match(view,/تاريخ إنشاء الأوردر/,base+': cohort basis not disclosed');
 assert.match(view,/لا نعرض أرقامًا صفرية بديلة/,base+': no missing-data guard');
 assert.match(view,/setPage\(0\)/,base+': filters must reset pagination');
 assert.ok(!view.includes('otc_return_lines").select('),base+': no direct browser source-table reads');
 const manager=access.slice(access.indexOf('manager: new Set'),access.indexOf('admin: new Set'));
 assert.match(manager,/'returns-intelligence'/,base+': manager blocked');
 const supervisor=access.slice(access.indexOf('supervisor: new Set'),access.indexOf('manager: new Set'));
 assert.ok(!supervisor.includes("'returns-intelligence'"),base+': supervisor should not see review center');
}
console.log('✓ returns center routed, manager-only in primary ACL, release gated and cohort-contract driven in all variants');
