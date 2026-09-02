# P1 Access Control & Role-Based Visibility Design

## Status
Approved functional design. This document defines the technical architecture to implement before any production permission changes are made.

## Goal
Build a secure multi-role access-control layer so every user sees only the commercial data and screens authorized for their role, while preserving the existing Executive Sales Intelligence behavior and preventing frontend filter manipulation from exposing unauthorized data.

## Business Roles

### Sales Rep
Scope: one salesperson only.

Can see:
- My Performance
- My Customers
- My Orders
- My Retention / Lost / At-Risk
- My Products / Basket
- My Targets & Achievement
- AI Assistant restricted to own data

Cannot see:
- Executive Dashboard
- Other sales reps
- Other teams
- Company-wide reports
- User management

### Supervisor
Scope: one team in one company only.

Can see:
- Team Performance
- Team Sales Reps
- Team Customers
- Team Orders
- Team Retention / Lost / At-Risk
- Team Products / Basket
- Team Targets & Achievement
- Team-scoped AI Assistant
- Drill-downs only for reps/customers/orders inside the assigned team

Cannot see:
- Other teams
- The other company
- Company-wide totals outside the team scope
- Executive Dashboard
- User management

Constraint: each Supervisor belongs to exactly one team and one company.

### Manager
Scope: full commercial visibility across Horeca Smart + MAS.

Can see:
- Executive Dashboard
- Sales Rep 360 for all reps
- All team performance
- All customers and orders
- Retention / Lost / At-Risk
- Products / Basket / Categories / Areas
- Targets & Achievement
- Horeca Smart vs MAS comparison
- Full commercial AI Assistant
- All commercial drill-downs and exports

Cannot manage users or permissions.

### Admin / CEO
Scope: same commercial visibility as Manager plus identity and access administration.

Additional capabilities:
- Create user
- Assign role
- Assign company
- Assign team
- Assign salesperson
- Activate / deactivate user
- Trigger password reset workflow
- View permission-change audit log

## Authentication Model
Use Supabase Auth with email + password.

Rules:
- No public sign-up.
- Accounts are created only by Admin / CEO.
- Users authenticate independently from Odoo.
- Supabase `auth.users.id` is the authoritative application identity.
- Every commercial request must run with a valid authenticated JWT.

## Existing Database Assets
The current Supabase `odoo` project already contains:
- `app_user_roles` with `user_id uuid`, `display_name`, `role`, `is_active`, version/audit fields.
- An existing Admin user record.
- `customer_master_odoo18.salesperson_id bigint`.
- `customer_product_history.salesperson_id bigint`.
- `raw_customers_odoo18.salesperson_id bigint`.

Important gap:
- `sales_orders_odoo18` currently exposes `salesperson` as text and does not expose a stable `salesperson_id`.

The authorization system must not rely on salesperson names as a security key.

## Recommended Architecture

```text
Supabase Auth
    |
    v
app_user_roles
    |
    +-- role
    +-- is_active
    +-- company_id
    +-- team_id
    +-- salesperson_id
    |
    v
authorized_user_scope()
    |
    +-- SALES_REP   -> one salesperson_id
    +-- SUPERVISOR  -> one company_id + one team_id
    +-- MANAGER     -> Horeca Smart + MAS
    +-- ADMIN       -> Horeca Smart + MAS + IAM administration
    |
    v
Scoped Analytics RPCs / secure views
    |
    +-- Executive
    +-- Sales Reps
    +-- Customers
    +-- Orders
    +-- Retention
    +-- Products
    +-- Targets
    +-- Exports
    +-- AI context
```

The frontend never decides the user's true data scope. It may hide unavailable navigation and filters, but the database layer is authoritative.

## Data Model

### Extend `app_user_roles`
Required logical fields:
- `user_id uuid primary key references auth.users(id)`
- `display_name text not null`
- `role text not null check role in ('sales_rep','supervisor','manager','admin')`
- `is_active boolean not null default true`
- `company_id bigint null`
- `team_id bigint null`
- `salesperson_id bigint null`
- `version bigint not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `updated_by uuid null`

Role validation rules:
- Sales Rep: `salesperson_id` required; `team_id` optional/derived; `company_id` required.
- Supervisor: `company_id` and `team_id` required; `salesperson_id` must not define security scope.
- Manager: no salesperson/team restriction; sees both commercial companies.
- Admin: no salesperson/team restriction; sees both commercial companies and IAM administration.

### `sales_teams`
Fields:
- `team_id bigint primary key`
- `team_name text not null`
- `company_id bigint not null`
- `supervisor_user_id uuid null references auth.users(id)`
- `is_active boolean not null default true`
- audit timestamps

Constraint:
- one active supervisor per team for P1.
- each supervisor is assigned to one active team only.

### `sales_team_members`
Fields:
- `team_id bigint not null`
- `salesperson_id bigint not null`
- `salesperson_name text`
- `is_active boolean not null default true`
- audit timestamps

Primary key or unique constraint on `(team_id, salesperson_id)`.

Security joins must use `salesperson_id`, never `salesperson_name`.

## Salesperson Identity Normalization
Before enforcing rep/team permissions across all analytics, a stable salesperson identifier must exist in the order-level analytics layer.

Preferred approach:
1. Identify the authoritative Odoo salesperson/user id in the source tables feeding `sales_orders_odoo18`.
2. Add `salesperson_id bigint` to the secure analytics source/view.
3. Keep `salesperson` text for display only.
4. Update relevant RPC filters and joins to use `salesperson_id` internally.

If production source mapping is ambiguous for a row, fail closed for user-scoped analytics rather than matching by text.

## Central Authorization Function
Create one database function conceptually named:

`authorized_user_scope()`

It derives scope from `auth.uid()` and returns only server-trusted values, for example:
- authenticated user id
- role
- is_active
- allowed company ids
- allowed team id
- allowed salesperson ids
- can_manage_users
- can_view_executive

Required behavior:
- no JWT user -> deny
- missing profile -> deny
- inactive profile -> deny
- malformed role mapping -> deny
- Sales Rep -> exactly one authorized salesperson id
- Supervisor -> active member salesperson ids from assigned team, restricted to assigned company
- Manager/Admin -> both commercial companies

No RPC may trust a caller-supplied role, team, company scope, or salesperson authorization claim.

## RPC Authorization Rules
Every commercial RPC used by the dashboard must become scope-aware.

Caller-provided filters such as company, salesperson, customer, product, area, date, etc. are optional analytical filters only after intersecting them with the authenticated user's authorized scope.

Examples:
- Sales Rep requests another salesperson -> return no rows or explicit authorization error; never honor the unauthorized id.
- Supervisor requests another team/company -> deny or return no rows.
- Manager requests MAS only -> allowed because MAS is inside Manager scope.
- Admin requests all companies -> allowed.

Preferred rule:
`effective_scope = authorized_scope INTERSECT requested_filters`

Never:
`effective_scope = requested_filters`

## RLS and Database Security
RLS is a defense-in-depth layer, not the only authorization mechanism.

Requirements:
- Remove anonymous commercial read paths where practical.
- Authenticated access only for application commercial data.
- Restrict direct table/view reads that could bypass scoped RPCs.
- SECURITY DEFINER functions must have tightly controlled `search_path`, grants, and explicit authorization checks.
- Revoke unnecessary `anon` execute privileges on commercial RPCs.
- Service-role access remains server-side only and must never be exposed to the browser.

Existing P1 security debt around anon-accessible SECURITY DEFINER RPCs must be included in this workstream.

## Frontend Session & Access Context
Add an application auth/access context distinct from the existing analytics filter context.

It should expose only trusted session metadata returned by Supabase / secure profile RPC:
- `user`
- `session`
- `role`
- `displayName`
- `companyId`
- `teamId`
- `salespersonId`
- capabilities such as `canViewExecutive`, `canManageUsers`
- loading / authenticated / unauthorized / inactive states

The frontend uses capabilities for UX only. Database enforcement remains mandatory.

## Route and Navigation Guards
Navigation visibility must follow role capabilities.

### Sales Rep routes
- My Performance
- My Customers
- My Orders
- My Retention / At-Risk
- My Products / Basket
- My Targets
- AI Assistant

### Supervisor routes
- Team Performance
- Team Sales Reps
- Team Customers
- Team Orders
- Team Retention
- Team Products / Basket
- Team Targets
- AI Assistant

### Manager routes
- All commercial dashboards and reports
- No user-management route

### Admin routes
- All Manager routes
- User Management / Access Administration

Direct URL navigation to a hidden route must still be blocked by route guards, but route guards are not considered the security boundary.

## Filter Behavior by Role

### Sales Rep
- salesperson filter locked to self and preferably hidden.
- company locked to assigned company.
- no team switching.

### Supervisor
- company locked to assigned company.
- team locked to assigned team.
- salesperson selector contains only team members.

### Manager/Admin
- company can be All / Horeca Smart / MAS.
- team and salesperson filters can span both companies.

Reset Filters must never reset authorization scope; it only resets analytical filters inside the allowed scope.

## Drill-Down Security
Every drill-down request must reapply database authorization.

Do not assume that because the parent table was scoped, a detail modal is safe.

Required protected drill-downs include:
- Sales Rep detail
- Customer detail
- Orders
- Retention details
- Lost customer records
- Product/customer intersections
- Area/territory details

Attempting to open a valid entity id outside user scope must return no protected data.

## AI Assistant Security
AI must inherit exactly the same authorized scope as the dashboard.

Rules:
- AI endpoint requires authenticated JWT.
- Backend resolves `auth.uid()` and authorized scope; frontend must not supply trusted role/scope.
- Sales Rep AI can analyze only own commercial data.
- Supervisor AI can analyze only assigned team's data.
- Manager/Admin AI can analyze Horeca Smart + MAS.
- Customer/product drill-down context must pass the same authorization checks as normal analytics.
- Keep existing PII minimization and allowlist behavior.
- `/api/ai/chat` must not remain an unauthenticated/unrate-limited bypass path.

## Export Security
Any CSV/Excel/report export must be generated from already authorized queries or a secure export RPC.

A user must not be able to export data they cannot see in the UI.

Exports must not reconstruct scope from frontend filters alone.

## Admin User Management
Admin / CEO only.

Required workflows:
1. Create email/password user through a privileged server-side or Edge Function flow.
2. Create/update associated `app_user_roles` mapping atomically or with compensating failure handling.
3. Assign role.
4. Assign company/team/salesperson where required.
5. Activate/deactivate account mapping.
6. Trigger password reset email rather than exposing passwords.
7. Log changes in an audit table.

Public self-registration remains disabled.

No service role key may be sent to the frontend.

## Audit Log
Recommended table: `access_control_audit_log`.

Minimum fields:
- event id
- target user id
- actor user id
- action type
- previous role/scope snapshot
- new role/scope snapshot
- created_at

Audit records are visible to Admin/CEO only.

## Fail-Closed Behavior
If authorization state cannot be verified:
- do not show stale commercial data
- do not fall back to mock/demo values
- do not silently broaden scope
- show a clear unavailable/unauthorized state

This extends the P0 fail-closed principle to identity and permissions.

## Full Screen QA Matrix
Acceptance requires at least four dedicated test identities:
1. Sales Rep test user
2. Supervisor test user
3. Manager test user
4. Admin test user

For every active screen/report, test:
- expected route visibility
- direct URL access
- displayed KPIs
- table rows
- filters
- drill-downs
- customer detail
- salesperson detail
- exports
- AI queries
- browser refresh/session restore
- logout/login switch between roles

Negative tests are mandatory:
- Sales Rep requests another rep id
- Sales Rep requests another customer outside portfolio
- Supervisor requests another team id
- Supervisor requests MAS while assigned to Horeca Smart, or vice versa
- Manager attempts user management
- inactive user attempts login/data access
- unauthenticated client calls commercial RPC
- anon client calls previously exposed SECURITY DEFINER RPC

## Required Dashboard QA Coverage
At minimum review and certify:
- Executive Dashboard
- Sales Rep 360
- Team / rep performance views
- Customers
- Customer detail
- Orders
- Retention
- Lost / At-Risk views
- Products / Product 360
- Basket / cross-sell analytics
- Categories
- Areas / territories
- Targets & Achievement
- Company comparison
- AI Assistant
- Data exports
- Settings / Data & Sync where commercial data is exposed
- Admin User Management

Each screen must be classified after testing as:
- PASS — authorized scope correct
- BLOCKED — correctly inaccessible for role
- FAIL — unauthorized exposure or broken authorized behavior

No release acceptance while any unauthorized exposure remains.

## Implementation Sequence

### Phase 1 — Identity Foundation
- Supabase Auth login/logout/session.
- Extend `app_user_roles`.
- Add teams/team members.
- Normalize salesperson id in order analytics.
- Build trusted access-scope resolver.

### Phase 2 — Database Enforcement
- Scope commercial RPCs.
- Restrict direct read access.
- Harden SECURITY DEFINER functions.
- Remove unnecessary anon execution.
- Add RLS defense-in-depth policies.

### Phase 3 — Role-Based UI
- Auth gate/login screen.
- Access context.
- Role navigation.
- Route guards.
- Locked filters by role.
- Admin user-management UI.

### Phase 4 — AI, Export & Drill-Down Hardening
- Authenticated AI endpoint.
- Scope-aware AI context.
- Scope-aware exports.
- Verify every detail/drill-down path.

### Phase 5 — Full Role QA
- Four-role end-to-end matrix.
- Cross-scope negative tests.
- Reconcile visible KPIs with secure RPC outputs.
- Security advisor review.
- Document release evidence.

## Migration Safety
- All database changes must be committed as unique migrations.
- Never edit historical production migrations to change already-applied behavior.
- Continue the P0 duplicate-migration content contract.
- Apply database migrations only after explicit review/approval of the migration set.
- Keep a rollback strategy for schema/grant/policy changes.

## Git / Release Safety
- Work on a dedicated P1 branch.
- Do not commit implementation directly to `main`.
- Use TDD for authorization behavior and regression cases.
- Open a PR for review.
- Never merge to `main` without explicit user approval.

## Acceptance Criteria
P1 Access Control is complete only when all of the following are true:
- Public signup is disabled.
- All normal users authenticate with Supabase Auth email/password.
- Admin/CEO is the only role capable of user administration.
- Sales Rep cannot retrieve commercial data outside own salesperson scope.
- Supervisor cannot retrieve commercial data outside one assigned team/company.
- Manager can retrieve all Horeca Smart + MAS commercial data but cannot manage users.
- Admin can retrieve all commercial data and manage access.
- All commercial RPCs enforce server-side authenticated scope.
- Direct frontend filter manipulation cannot broaden data access.
- Drill-downs, exports, and AI enforce the same scope.
- Unauthorized and inactive states fail closed.
- Every active screen/report is QA-classified for all four roles.
- CI, type checks, builds, contract tests, authorization tests, and approved live QA are green before merge.
