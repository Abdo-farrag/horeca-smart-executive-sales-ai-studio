import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for (const base of ['src','apps/lovable/src','apps/studio/src']){
 const view=readFileSync(base+'/views/ReturnsIntelligenceCenter.tsx','utf8');
 const review=readFileSync(base+'/components/OrderCaseReviewPanel.tsx','utf8');
 const assign=readFileSync(base+'/components/OrderCaseAssignmentPanel.tsx','utf8');
 const queue=readFileSync(base+'/components/ReturnsAssignmentWorklistPanel.tsx','utf8');
 assert.match(view,/ReturnsAssignmentWorklistPanel companyId=/,base+': missing worklist');
 assert.match(review,/OrderCaseAssignmentPanel/,base+': no per-order assignment');
 assert.match(review,/reviewVersion>0/,base+': unreviewed case should not be assigned without mapping');
 assert.match(assign,/analytics_returns_case_assignees_v1/,base+': company scoped staff missing');
 assert.match(assign,/analytics_returns_order_assignments_v1/,base+': own order assignment missing');
 assert.match(assign,/assign_returns_order_case_v1/,base+': versioned assignment write missing');
 assert.match(assign,/p_expected_version:current\?\.version\?\?0/,base+': no optimistic locking');
 assert.match(queue,/analytics_returns_case_worklist_v1/,base+': no overdue list');
 assert.match(queue,/الرقم يخص الصفحة وليس إجمالي النظام/,base+': incomplete pagination warning missing');
 assert.ok(!queue.includes('.from('),base+': source tables must not be queried from browser');
}
const sql=readFileSync('docs/security-proposals/returns-case-assignment-sla-PROPOSAL.sql','utf8');
for(const rpc of ['analytics_returns_case_worklist_v1','assign_returns_order_case_v1',
  'analytics_returns_case_assignees_v1','analytics_returns_order_assignments_v1']){
 assert.ok(sql.includes(rpc),rpc+' absent');
}
assert.match(sql,/assignment_version integer not null/, 'Versioning required');
assert.match(sql,/ASSIGNEE_NOT_ACTIVE_IN_COMPANY/,'Cross-company staff assignment protection missing');
assert.match(sql,/ASSIGNMENT_VERSION_CONFLICT/,'Concurrency guard missing');
assert.match(sql,/Africa\/Cairo/,'Timezone for SLA missing');
assert.match(sql,/otc_return_case_assignment_events/,'No event audit table');
assert.match(sql,/revoke all on public\.otc_return_case_assignments/,'Raw browser access not denied');
assert.ok(sql.startsWith('-- PROPOSAL ONLY.'),'Must not claim deployed backend');
console.log('✓ returns assignments gated, case-scoped, auditable and source-table private in all apps');
