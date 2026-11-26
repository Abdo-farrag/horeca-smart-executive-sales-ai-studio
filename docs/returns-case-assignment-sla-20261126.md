# Returns case ownership, priority and SLA — Draft implementation

This is an extension of the **merged** Returns Intelligence Center PR #19, in a separate PR. All new RPC SQL is **PROPOSAL** only. The new frontend remains hidden by `VITE_RETURNS_REVIEW_CENTER_ENABLED` (OFF by default).

## What the screen now offers

- An assignment form nested within each original order: select an active employee from the same company, choose low/medium/high/critical priority, set a due date, and record an auditable reason.
- Only cases with an existing saved review and permanent `case_key → (company_id,order_id)` association can be assigned. Alert disappearance must not erase a saved assignment or close it.
- An in-page worklist for assigned cases with order, priority, assignee ID, due date, status, and whether detection remains visible.
- An overdue indicator with Cairo calendar-day logic; `resolved`, `explained`, and `dismissed` cases are considered closed for SLA purposes; they can be optionally included.
- Worklist count/overdue count explicitly refer **only to the current page**. This is not a company-wide SLA KPI or count of all unassigned alerts.

## Proposed backend, NOT deployed

`docs/security-proposals/returns-case-assignment-sla-PROPOSAL.sql` adds private, RLS-protected, browser-inaccessible `otc_return_case_assignments` (one active owner per case) and append-only `otc_return_case_assignment_events` records, with manager-only RPC contracts:

1. `analytics_returns_case_assignees_v1(company_id)`: active members of the exact company, max 200.
2. `analytics_returns_order_assignments_v1(company_id,order_id)`: bounded assignment records for the original order.
3. `analytics_returns_case_worklist_v1(company_id,include_closed,limit,offset)`: authorized manager/company worklist, max 100/page, overdue vs Cairo local date.
4. `assign_returns_order_case_v1(company_id,order_id,case_key,assignee_id,priority,due_date,expected_version,reason)`: checks active manager, authorized company, exact original case/order mapping, active same-company assignee, 0–90 day future due date, mandatory note 5–2000 chars and version. Uses advisory transaction lock, increments version and appends an event atomically. It does NOT modify Odoo or any sales/movement source.

## Safety and verification

- Existing Production may have legacy permissive OTC source-table `customer360_authenticated_read` policies, not yet company-restricted. Fix these separately and validate with genuine JWT/Customer360 UAT before enabling any new audit frontend.
- Separate typed `SECURITY DEFINER` RPCs grant `authenticated` EXECUTE, but enforce manager/company *inside* every function; raw tables revoke browser grants and enforce RLS. The release still requires independent threat review.
- Ephemeral CI PostgreSQL fixtures `130_returns_assignment_fixture.sql`, `140_returns_assignment_assertions.sql` check version conflict, ownership, cross-company employee rejection, inactive employee rejection, authorized directory, private tables, event history and overdue logic. Synthetic SQL tests are not actual JWT verification.
- **Known missing features:** Uploaded files/documents and electronic signatures are not implemented; capture document IDs and references in the reviewer note only until a secure storage/access model is approved. No notifications or automatic assignment; no true global overdue KPI beyond paginated data. Employee directory is limited to first 200 active users per company.
- No Supabase migrations applied, no branch created on Supabase, no Production deployment and no GitHub merge until explicit approval.

## Release acceptance

Verify UI on live authenticated manager role and authorized company, preserve nested order disclosure, enforce case ownership on every RPC, test changing priority and due date with simultaneous managers, test overdue in Cairo midnight and holiday/weekend policy, validate actual company ID membership for every user in Odoo/Supabase, and obtain Warehouse/Finance sign-off.
