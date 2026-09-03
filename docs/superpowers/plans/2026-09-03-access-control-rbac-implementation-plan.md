# P1 Access Control & Role-Based Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure Supabase Auth, role-based data visibility, team/company scoping, Admin-only user management, and end-to-end authorization across dashboards, RPCs, AI, drill-downs, and exports.

**Architecture:** Supabase Auth establishes identity; `app_user_roles` plus team membership resolves a trusted server-side authorization scope from `auth.uid()`. Commercial RPCs intersect caller filters with that scope, while the React apps use a dedicated access context only for navigation/UX. RLS/grants are defense-in-depth and the database remains the security authority.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Supabase JS 2.111, PostgreSQL/Supabase Auth/RLS/RPC, Express, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-access-control-rbac-design.md`

## Global Constraints

- No public sign-up; only Admin/CEO creates users.
- Roles are exactly `sales_rep`, `supervisor`, `manager`, `admin`.
- Sales Rep scope is exactly one salesperson.
- Supervisor scope is exactly one team in one company.
- Manager sees all Horeca Smart + MAS commercial data but cannot manage users.
- Admin sees all commercial data and manages users/permissions.
- Security joins use stable IDs, never salesperson names.
- All commercial calls require an authenticated JWT and fail closed when identity/scope cannot be verified.
- Frontend route/filter hiding is UX only; it is never the security boundary.
- Existing P0 fail-closed/no-mock guarantees must remain intact.
- Historical migrations are immutable; new behavior is added only through unique new migration files.
- Database migrations are written and reviewed in Git before any production application.
- Never merge to `main` without explicit user approval.

---

## File Structure

### New database/security files
- `supabase/migrations/20260903010000_p1_identity_scope_foundation.sql` — IAM schema extensions, teams, members, audit log, profile/scope functions.
- `supabase/migrations/20260903020000_p1_salesperson_identity.sql` — stable salesperson ID in secure order analytics layer.
- `supabase/migrations/20260903030000_p1_scoped_analytics_rpcs.sql` — scope enforcement for commercial analytics RPCs.
- `supabase/migrations/20260903040000_p1_rls_grants_hardening.sql` — anon revokes, authenticated grants, RLS/security-definer hardening.
- `supabase/functions/admin-user-management/index.ts` — privileged Admin-only user creation/profile update/password-reset orchestration.
- `supabase/functions/admin-user-management/deno.json` — Edge Function runtime config.

### New shared/root frontend files
- `src/types/access.ts` — role/profile/capability contracts.
- `src/services/accessService.ts` — profile fetch and access-scope client mapping.
- `src/context/AccessContext.tsx` — session/auth/access state.
- `src/components/auth/LoginView.tsx` — email/password login UI.
- `src/components/auth/AccessGate.tsx` — loading/unauthenticated/inactive/authorized gate.
- `src/access/viewCapabilities.ts` — role-to-view capability matrix.
- `src/views/AdminUserManagement.tsx` — Admin-only IAM UI.
- `src/services/adminUserService.ts` — Admin Edge Function client.
- `src/services/__tests__/accessService.test.ts` — access profile mapping/fail-closed tests.
- `src/context/__tests__/AccessContext.test.tsx` — session/role state tests.
- `src/access/__tests__/viewCapabilities.test.ts` — role route matrix tests.
- `src/services/__tests__/adminUserService.test.ts` — Admin API contract tests.

### Root files to modify
- `src/lib/supabase.ts` — ensure auth session persistence/refresh behavior remains explicit.
- `src/App.tsx` — wrap app with `AccessProvider` and gate authorized layout.
- `src/components/Sidebar.tsx` — render only permitted menu entries.
- `src/components/GlobalFilterBar.tsx` — lock company/team/salesperson filters to authorized scope.
- `src/components/Header.tsx` — user identity, role, logout.
- `src/context/AppContext.tsx` — reset analytical filters without broadening authorization scope.
- `src/analytics/client.ts` — authenticated-session guard and user-aware cache key/flush behavior.
- `src/analytics/sales.ts`
- `src/analytics/customers.ts`
- `src/analytics/salesReps.ts`
- `src/analytics/products.ts`
- `src/analytics/productCategories.ts`
- `src/analytics/filters.ts` — use scoped RPC contracts; caller filters stay analytical only.
- `src/services/executiveService.ts`
- `src/services/customerService.ts`
- `src/services/salesRepService.ts`
- `src/services/productService.ts` — preserve fail-closed handling on authorization failures.
- `src/components/DrillDownModal.tsx`
- `src/components/EntityDetailModals.tsx`
- `src/components/AiAssistantPanel.tsx`
- `src/services/aiChatService.ts`
- `server.ts` — verify Supabase JWT on `/api/ai/chat`, resolve trusted scope, reject anonymous/mismatched requests.
- `package.json` — add authorization contract test command entries if required.
- `.github/workflows/ci.yml` — include authorization contracts/offline role tests.

### App-local parity files
The root, Lovable, and Studio apps intentionally keep local React contexts/analytics boundaries. Apply equivalent auth/access changes to:
- `apps/lovable/src/...`
- `apps/studio/src/...`
using the same file names and interfaces as root, without cross-app React context re-exports.

### New contracts / QA
- `tests/contracts/auth-required-commercial-runtime.mjs`
- `tests/contracts/no-anon-commercial-rpc.mjs`
- `tests/contracts/access-parity.mjs`
- `tests/business-rules/role-scope-contract.mjs`
- `docs/p1-access-control-live-qa.md`
- `docs/p1-access-control-release-evidence.md`

---

### Task 1: Lock the Authorization Contracts Before Implementation

**Files:**
- Create: `tests/contracts/auth-required-commercial-runtime.mjs`
- Create: `tests/contracts/no-anon-commercial-rpc.mjs`
- Create: `tests/contracts/access-parity.mjs`
- Create: `tests/business-rules/role-scope-contract.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: static contracts that reject anonymous commercial runtime paths, missing role matrices, cross-app access-layer drift, and unsafe migration grants.

- [ ] **Step 1: Write failing contracts**

`auth-required-commercial-runtime.mjs` must assert that `server.ts` verifies a bearer Supabase JWT before `/api/ai/chat` processes commercial context, and that `src/App.tsx` is wrapped by an access/auth gate.

`role-scope-contract.mjs` must encode this immutable matrix:

```js
const scopes = {
  sales_rep: { ownRep: true, ownTeam: false, allCompanies: false, manageUsers: false },
  supervisor: { ownRep: false, ownTeam: true, allCompanies: false, manageUsers: false },
  manager: { ownRep: false, ownTeam: false, allCompanies: true, manageUsers: false },
  admin: { ownRep: false, ownTeam: false, allCompanies: true, manageUsers: true },
};
```

`no-anon-commercial-rpc.mjs` must scan P1 migration SQL and fail if any new commercial RPC is granted to `anon`.

`access-parity.mjs` must require equivalent `AccessContext.tsx` and `viewCapabilities.ts` files under root, Lovable, and Studio.

- [ ] **Step 2: Run contracts and verify RED**

Run:
```bash
npm run contracts:test
```
Expected: FAIL because the required access files/JWT guard/P1 migrations do not exist yet.

- [ ] **Step 3: Add the four contracts to `contracts:test`**

Append them to the existing command without removing P0 contracts.

- [ ] **Step 4: Commit RED contract baseline**

```bash
git add tests package.json
git commit -m "test(p1): define access control security contracts"
```

---

### Task 2: Add IAM Schema, Team Model, Audit Log, and Trusted Profile Function

**Files:**
- Create: `supabase/migrations/20260903010000_p1_identity_scope_foundation.sql`
- Test: `tests/contracts/no-anon-commercial-rpc.mjs`
- Test: `tests/business-rules/role-scope-contract.mjs`

**Interfaces:**
- Produces DB function: `current_access_profile()` returning authenticated user profile/capabilities.
- Produces tables: `sales_teams`, `sales_team_members`, `access_control_audit_log`.
- Extends: `app_user_roles(company_id, team_id, salesperson_id)`.

- [ ] **Step 1: Write the migration with explicit role constraints**

Migration must add nullable scope columns to the existing `app_user_roles` and a CHECK equivalent to:

```sql
role in ('sales_rep','supervisor','manager','admin')
```

Create `sales_teams` and `sales_team_members` with stable IDs and unique `(team_id, salesperson_id)` membership. Create an Admin-only audit table storing actor, target, action, old snapshot, new snapshot, timestamp.

- [ ] **Step 2: Add `current_access_profile()` as SECURITY DEFINER with fixed search path**

Required pattern:

```sql
create or replace function public.current_access_profile()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.app_user_roles%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_profile
  from public.app_user_roles
  where user_id = v_uid and is_active = true;

  if not found then
    raise exception 'ACCESS_PROFILE_UNAVAILABLE' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'user_id', v_profile.user_id,
    'display_name', v_profile.display_name,
    'role', v_profile.role,
    'company_id', v_profile.company_id,
    'team_id', v_profile.team_id,
    'salesperson_id', v_profile.salesperson_id,
    'can_view_executive', v_profile.role in ('manager','admin'),
    'can_manage_users', v_profile.role = 'admin'
  );
end;
$$;
```

- [ ] **Step 3: Set grants safely**

```sql
revoke all on function public.current_access_profile() from public, anon;
grant execute on function public.current_access_profile() to authenticated;
```

No browser direct write grants to IAM tables.

- [ ] **Step 4: Run offline contracts**

```bash
npm run contracts:test
```
Expected: authorization migration/grant contracts progress toward GREEN; runtime/auth contracts may remain RED until later tasks.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations tests
git commit -m "feat(p1): add identity and team scope foundation"
```

**Production gate:** Do not apply this migration to Supabase yet.

---

### Task 3: Normalize Stable Salesperson Identity in Order Analytics

**Files:**
- Create: `supabase/migrations/20260903020000_p1_salesperson_identity.sql`
- Modify later-generated DB types only after migration application.
- Add/modify tests under `src/analytics/__tests__/` for salesperson ID mapping where SDK types expose it.

**Interfaces:**
- Produces: `salesperson_id bigint` in the secure order analytics source consumed by scoped RPCs.
- Security invariant: rows without a reliable salesperson ID are excluded from rep/team-scoped data rather than matched by name.

- [ ] **Step 1: Inspect the production source lineage read-only**

Use SQL metadata/definitions to identify the authoritative Odoo user/salesperson ID feeding each order. Document the exact join key inside the migration comments.

- [ ] **Step 2: Write migration to expose stable ID**

Recreate or wrap the order analytics view so it contains both:

```sql
salesperson_id bigint,
salesperson text
```

The text column remains display-only.

- [ ] **Step 3: Add fail-closed handling for unmapped rows**

Scoped queries must use:

```sql
where salesperson_id is not null
```

for Sales Rep/Supervisor scope enforcement. Manager/Admin aggregate behavior may include all valid commercial orders according to existing business rules, but no name-based authorization fallback is allowed.

- [ ] **Step 4: Add a regression test that rejects name-only authorization**

The test must fail if SDK/security code uses `salespersonName`/`salesperson` as the authorization key.

- [ ] **Step 5: Run**

```bash
npm run test:unit
npm run contracts:test
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations src/analytics tests
git commit -m "feat(p1): normalize salesperson identity for authorization"
```

**Production gate:** Do not apply this migration yet.

---

### Task 4: Build the Central Database Scope Resolver and Scope Intersection Helpers

**Files:**
- Modify: `supabase/migrations/20260903010000_p1_identity_scope_foundation.sql` before it is ever applied, or add the functions in `20260903030000_p1_scoped_analytics_rpcs.sql` if Task 2 is already reviewed/locked.
- Create tests in `tests/business-rules/role-scope-contract.mjs`.

**Interfaces:**
- Produces DB functions:
  - `authorized_salesperson_ids() returns setof bigint`
  - `authorized_company_ids() returns setof bigint`
  - `can_manage_users() returns boolean`
  - `can_view_executive() returns boolean`

- [ ] **Step 1: Implement role-specific resolver semantics**

Required behavior:
- `sales_rep` → exactly `app_user_roles.salesperson_id`.
- `supervisor` → active salesperson IDs in its one `sales_team_members.team_id`, constrained to its `company_id`.
- `manager` / `admin` → all commercial salespeople/companies belonging to Horeca Smart + MAS.
- missing/inactive/malformed mapping → authorization error, never empty-broad scope.

- [ ] **Step 2: Test malformed mappings**

Contract cases must include:
- Sales Rep with null salesperson ID → deny.
- Supervisor with null team/company → deny.
- Manager/Admin → no user-supplied salesperson/team restriction required for authorization.

- [ ] **Step 3: Run contracts**

```bash
npm run contracts:test
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations tests/business-rules
git commit -m "feat(p1): add trusted authorization scope resolver"
```

---

### Task 5: Scope Every Commercial Analytics RPC and Remove Anonymous Execution

**Files:**
- Create: `supabase/migrations/20260903030000_p1_scoped_analytics_rpcs.sql`
- Create: `supabase/migrations/20260903040000_p1_rls_grants_hardening.sql`
- Modify SDK callers only when RPC signatures require stable ID fields:
  - `src/analytics/sales.ts`
  - `src/analytics/customers.ts`
  - `src/analytics/salesReps.ts`
  - `src/analytics/products.ts`
  - `src/analytics/productCategories.ts`
  - `src/analytics/filters.ts`
  - equivalent files under `apps/lovable/src/analytics/` and `apps/studio/src/analytics/`.

**Interfaces:**
- All existing commercial RPC names remain compatible where possible.
- Caller parameters remain analytical filters, never authorization claims.
- Effective rule: `authorized_scope INTERSECT requested_filters`.

- [ ] **Step 1: Inventory every RPC used by SDK**

Use `src/analytics/*.ts` as the authoritative caller inventory. Map each operation name to its SQL definition and classify it: commercial, catalog/dictionary, or administrative.

- [ ] **Step 2: Write a failing live-SQL authorization matrix before replacing RPCs**

For each major domain verify expected behavior for four test identities:
- Executive KPI
- sales rep summary/trend/customers/retention
- customer summary/details/action center
- product 360/top customers/cross-sell
- filters/catalogs that expose commercial entity lists

- [ ] **Step 3: Recreate commercial RPCs with `auth.uid()` scope**

Each SQL function must begin from trusted scope and only then apply optional caller filters. A salesperson parameter should be treated like:

```sql
and (
  p_salesperson_id is null
  or order_salesperson_id = p_salesperson_id
)
and order_salesperson_id in (select salesperson_id from public.authorized_salesperson_ids())
```

Never derive authorization from `p_salesperson_id` itself.

- [ ] **Step 4: Harden grants**

For each commercial RPC:

```sql
revoke all on function ... from public, anon;
grant execute on function ... to authenticated;
```

For SECURITY DEFINER functions, set a fixed `search_path` and avoid dynamic SQL using caller-controlled identifiers.

- [ ] **Step 5: Restrict direct commercial reads**

Where the frontend can bypass RPCs by selecting directly from commercial views/tables, revoke the bypass or add RLS/policies so authenticated users cannot broaden scope.

- [ ] **Step 6: Update SDK tests**

Add unit tests proving authorization errors become fail-closed `AnalyticsError` results and never trigger mock/fallback data.

- [ ] **Step 7: Run**

```bash
npm run contracts:test
npm run test:unit
npm run lint
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations src/analytics apps/lovable/src/analytics apps/studio/src/analytics tests
git commit -m "feat(p1): enforce authenticated scope across analytics RPCs"
```

**Production gate:** Migration application requires explicit migration-set review before execution.

---

### Task 6: Add Supabase Auth Session and Access Context in All Three Apps

**Files:**
- Create root:
  - `src/types/access.ts`
  - `src/services/accessService.ts`
  - `src/context/AccessContext.tsx`
  - `src/components/auth/LoginView.tsx`
  - `src/components/auth/AccessGate.tsx`
  - tests listed in File Structure.
- Create equivalent local files under:
  - `apps/lovable/src/`
  - `apps/studio/src/`
- Modify:
  - `src/lib/supabase.ts`
  - app-local `lib/supabase.ts`
  - `src/App.tsx`, `apps/lovable/src/App.tsx`, `apps/studio/src/App.tsx`.

**Interfaces:**

```ts
export type AppRole = 'sales_rep' | 'supervisor' | 'manager' | 'admin';

export interface AccessProfile {
  userId: string;
  displayName: string;
  role: AppRole;
  companyId: number | null;
  teamId: number | null;
  salespersonId: number | null;
  canViewExecutive: boolean;
  canManageUsers: boolean;
}
```

`useAccess()` exposes `session`, `user`, `profile`, `status`, `signIn(email,password)`, `signOut()`.

- [ ] **Step 1: Write failing `accessService` tests**

Cases:
- maps a valid `current_access_profile()` response.
- rejects missing profile.
- rejects inactive/unknown role.
- never accepts role/team/company from local storage or caller params.

- [ ] **Step 2: Implement `accessService.ts`**

It calls `supabase.auth.getSession()` and authenticated RPC `current_access_profile` only.

- [ ] **Step 3: Write failing `AccessContext` tests**

Test states: loading → unauthenticated, loading → authorized, inactive/error → blocked, sign-out clears access state.

- [ ] **Step 4: Implement `AccessContext` and `AccessGate`**

`AccessGate` behavior:
- Supabase not configured → unavailable state, no commercial UI.
- no session → `LoginView`.
- profile unavailable/inactive → access denied state and sign-out action.
- authorized → render children.

- [ ] **Step 5: Wrap each app**

Target nesting:

```tsx
<AccessProvider>
  <AccessGate>
    <AppProvider>
      <MainLayout />
    </AppProvider>
  </AccessGate>
</AccessProvider>
```

Do not cross-import React contexts between root/Lovable/Studio.

- [ ] **Step 6: Run tests/build**

```bash
npm run test:unit
npm run lint
npm run build
npm run contracts:test
```

- [ ] **Step 7: Commit**

```bash
git add src apps/lovable/src apps/studio/src tests
git commit -m "feat(p1): add authenticated access context"
```

---

### Task 7: Make Analytics Client Session-Aware and Prevent Cross-User Cache Leakage

**Files:**
- Modify:
  - `src/analytics/client.ts`
  - `apps/lovable/src/analytics/client.ts`
  - `apps/studio/src/analytics/client.ts`
  - `packages/core/src/analytics/client.ts` only if it independently owns request caching.
- Create/modify tests under each analytics test suite.

**Interfaces:**
- Cache key must include authenticated user/session identity or cache must be cleared on auth changes.
- No commercial RPC execution without a valid authenticated session.

- [ ] **Step 1: Write RED test for cache isolation**

Simulate user A calling an RPC, then user B calling same operation/params. User B must not receive user A cached result.

- [ ] **Step 2: Write RED test for unauthenticated RPC**

`callAnalyticsRpc()` must fail with an explicit auth-required analytics error before issuing the commercial call when no session exists.

- [ ] **Step 3: Implement session-aware cache isolation**

Preferred implementation:
- include current authenticated user ID in `cacheKey`, and
- expose `clearAnalyticsRequestCache()` called by `AccessContext` on auth-state change/sign-out.

- [ ] **Step 4: Run**

```bash
npm run test:unit
npm run contracts:test
```

- [ ] **Step 5: Commit**

```bash
git add src/analytics apps packages src/context tests
git commit -m "fix(p1): isolate analytics cache by authenticated user"
```

---

### Task 8: Add Role-Based Navigation, View Guards, and Locked Filters

**Files:**
- Create in root/Lovable/Studio: `src/access/viewCapabilities.ts` and tests.
- Modify in all three apps:
  - `App.tsx`
  - `components/Sidebar.tsx`
  - `components/GlobalFilterBar.tsx`
  - `components/Header.tsx`
  - `context/AppContext.tsx`

**Interfaces:**

`viewCapabilities.ts` exports:

```ts
export function canAccessView(role: AppRole, viewId: string): boolean;
export function defaultViewForRole(role: AppRole): string;
```

Role defaults:
- `sales_rep` → `sales-rep-daily-action-center` or My Performance equivalent.
- `supervisor` → team/sales-rep performance view.
- `manager` / `admin` → `executive`.

- [ ] **Step 1: Write complete role/view matrix tests**

Sales Rep: no Executive, no company-wide Sales Rep roster, no Settings/IAM unless non-commercial personal settings are explicitly separated.
Supervisor: team views only, no Executive, no Admin.
Manager: all commercial views, no Admin User Management.
Admin: all commercial + Admin User Management.

- [ ] **Step 2: Implement Sidebar filtering**

Render only menu items allowed by `canAccessView(profile.role, item.id)`.

- [ ] **Step 3: Guard `renderCurrentView()`**

Before switch rendering, if current view is unauthorized, redirect in-memory to `defaultViewForRole(role)` and never briefly render the forbidden view.

- [ ] **Step 4: Lock filters**

Sales Rep:
- company fixed to profile company.
- salesperson fixed to profile salesperson ID.

Supervisor:
- company fixed to profile company.
- salesperson options come only from authorized team members returned by secure filters RPC.

Manager/Admin:
- normal company/team/salesperson selection across Horeca Smart + MAS.

`resetFilters()` resets only analytical filters and restores role-derived locked values.

- [ ] **Step 5: Add Header identity/logout**

Show authenticated `displayName` + translated role label and call `signOut()` securely.

- [ ] **Step 6: Run all offline checks**

```bash
npm run contracts:test
npm run test:unit
npm run lint
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src apps tests
git commit -m "feat(p1): enforce role-based navigation and filters"
```

---

### Task 9: Add Admin-Only User Management Through a Privileged Edge Function

**Files:**
- Create:
  - `supabase/functions/admin-user-management/index.ts`
  - `supabase/functions/admin-user-management/deno.json`
  - `src/services/adminUserService.ts`
  - `src/views/AdminUserManagement.tsx`
  - equivalents in Lovable/Studio if both are deployable UI targets.
  - related tests.
- Modify `viewCapabilities.ts`, `App.tsx`, `Sidebar.tsx` in each app.

**Interfaces:**
- Edge Function requires JWT verification.
- It validates caller profile role is `admin` server-side before any auth admin operation.
- Supported actions: `create_user`, `update_access`, `set_active`, `send_password_reset`, `list_users`.

- [ ] **Step 1: Write client contract tests**

Manager calling Admin service must result in forbidden behavior. Admin requests include no service-role secret in browser payload.

- [ ] **Step 2: Implement Edge Function authorization first**

Request flow:
1. Parse bearer token.
2. Build user-scoped Supabase client from bearer token.
3. Call `current_access_profile()`.
4. Require `role === 'admin'`.
5. Only then instantiate service-role client from Edge Function environment secret.
6. Perform requested Admin Auth operation.
7. Update `app_user_roles` and write `access_control_audit_log`.

- [ ] **Step 3: Implement user creation validation**

Required mapping rules:
- `sales_rep`: companyId + salespersonId required.
- `supervisor`: companyId + teamId required.
- `manager`: scope fields null.
- `admin`: scope fields null.

- [ ] **Step 4: Implement Admin UI**

UI supports create, role assignment, company/team/salesperson assignment, activate/deactivate, reset-password email, and audit log viewing. Do not show or accept plaintext existing passwords.

- [ ] **Step 5: Test role visibility**

Only Admin sees `AdminUserManagement`. Manager direct navigation is blocked locally and server calls remain forbidden.

- [ ] **Step 6: Run**

```bash
npm run test:unit
npm run contracts:test
npm run lint
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions src apps tests
git commit -m "feat(p1): add admin-only user management"
```

**Deployment gate:** Do not deploy the Edge Function until database access migrations are reviewed/applied in the approved environment.

---

### Task 10: Authenticate and Scope the AI Endpoint

**Files:**
- Modify: `server.ts`
- Modify: `src/services/aiChatService.ts`
- Modify: `src/components/AiAssistantPanel.tsx`
- Modify equivalent Lovable/Studio AI clients.
- Add tests in `src/services/ai/__tests__/` and server-focused tests.

**Interfaces:**
- `/api/ai/chat` requires `Authorization: Bearer <Supabase access token>`.
- Server resolves user from Supabase token and `current_access_profile()`.
- Browser cannot submit a trusted role/company/team/salesperson scope.

- [ ] **Step 1: Write RED tests**

Cases:
- no Authorization header → 401.
- invalid token → 401.
- inactive/missing access profile → 403.
- Sales Rep context containing another rep/customer → reject or rebuild context server-side before Gemini.
- Supervisor cross-team context → reject.

- [ ] **Step 2: Add server Supabase auth helper**

Create a server-side publishable/anon Supabase client only for JWT verification/profile RPC, using environment configuration. Never expose service role for AI reads.

- [ ] **Step 3: Verify JWT before body context processing**

The current route must move authentication ahead of sanitization/model execution.

- [ ] **Step 4: Enforce scope on AI context**

Preferred: AI drill-down/aggregate context is fetched/reconciled through the same secure scoped analytics boundary. At minimum, server verifies supplied entity IDs belong to authorized scope before accepting sanitized context.

- [ ] **Step 5: Add basic rate limiting**

Implement per-user bounded request rate in the server layer or approved infrastructure so authenticated users cannot freely abuse Gemini calls.

- [ ] **Step 6: Send current access token from client**

`aiChatService.ts` obtains the active Supabase session and sends its access token in `Authorization`.

- [ ] **Step 7: Run**

```bash
npm run test:unit
npm run contracts:test
npm run lint
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add server.ts src apps tests
git commit -m "fix(p1): authenticate and scope AI requests"
```

---

### Task 11: Re-Authorize Every Drill-Down, Detail Modal, and Export Path

**Files:**
- Modify:
  - `src/components/DrillDownModal.tsx`
  - `src/components/EntityDetailModals.tsx`
  - `src/components/Customer360Panel.tsx`
  - `src/services/customerService.ts`
  - `src/services/salesRepService.ts`
  - `src/services/productService.ts`
  - any export helper discovered in the active views.
- Equivalent local files in Lovable/Studio.
- Add focused unit/live reconciliation tests.

**Interfaces:**
- Detail IDs are never trusted because parent page was authorized.
- Every detail/export performs a secure scoped RPC.

- [ ] **Step 1: Inventory UI drill-down entry points**

Search for `setSelectedCustomer`, `setSelectedRep`, `setSelectedProduct`, `openDrillDown`, CSV/Excel/download code, and direct `.from(...)` commercial reads.

- [ ] **Step 2: Add negative tests**

Examples:
- Sales Rep opens valid customer ID owned by another rep → no protected data.
- Supervisor opens rep ID outside team → no protected data.
- Manager opens same IDs → allowed.
- export with manually altered salesperson/team params → output remains authorized-scope only.

- [ ] **Step 3: Remove assumptions from parent scope**

Detail services must query scoped RPCs directly and fail closed on authorization errors.

- [ ] **Step 4: Ensure export is generated from scoped result**

Do not export a cached/unscoped table or reconstruct authorization from browser filters.

- [ ] **Step 5: Run**

```bash
npm run test:unit
npm run contracts:test
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src apps tests
git commit -m "fix(p1): secure drilldowns details and exports"
```

---

### Task 12: Production Migration Review Gate and Controlled Application

**Files:**
- Review only before apply:
  - all four P1 migration files.
- Create: `docs/p1-access-control-migration-review.md`.

**Interfaces:**
- Migration set is independently reviewable before production execution.
- Rollback instructions are explicit for grants/policies/functions/schema additions.

- [ ] **Step 1: Run migration history contract**

```bash
node tests/contracts/migration-history.mjs
```
Expected: all migration files unique by content.

- [ ] **Step 2: Perform read-only production preflight**

Verify existing object signatures, current grants, RLS state, `app_user_roles` data, company IDs, and salesperson identity coverage.

- [ ] **Step 3: Write migration review document**

Record:
- objects created/altered,
- grants revoked/granted,
- SECURITY DEFINER functions,
- data backfill impact,
- rows lacking salesperson ID,
- rollback SQL approach,
- expected downtime: none or explicitly documented if discovered.

- [ ] **Step 4: Stop for explicit migration approval**

Do not apply any P1 database migration until the user explicitly approves the reviewed migration set.

- [ ] **Step 5: After approval, apply migrations in timestamp order**

Apply only to Supabase project `afzxhuaeggrngvchbvur` (`odoo`). Do not apply to `procurement-engine`.

- [ ] **Step 6: Immediately run Supabase security advisors**

Resolve new missing-RLS/unsafe-definer/grant findings introduced by P1 before proceeding.

- [ ] **Step 7: Commit review evidence updates**

```bash
git add docs
git commit -m "docs(p1): record access control migration review"
```

---

### Task 13: Create Four Test Identities and Execute Full Role QA Matrix

**Files:**
- Create: `docs/p1-access-control-live-qa.md`
- Update: `docs/p1-access-control-release-evidence.md`
- Extend live integration tests, preferably under `src/services/ai/__tests__/` and a new `tests/live/access-control/` suite.

**Interfaces:**
- Dedicated test identities: Sales Rep, Supervisor, Manager, Admin.
- No credentials committed to Git or pasted into test source.

- [ ] **Step 1: Create test identities through Admin flow**

Assign known production-safe test mappings:
- one salesperson with known orders/customers,
- one supervisor team containing at least two reps,
- one manager,
- one admin.

- [ ] **Step 2: Verify role matrix by database calls**

For each identity, run the same core RPC set and assert row/metric scope.

- [ ] **Step 3: Execute screen-by-screen QA**

Certify:
- Executive Dashboard
- Sales Dashboard
- Customer Dashboard
- Customer Action Center
- Sales Rep Daily Action Center
- Sales Rep 360
- Products/Product 360
- Categories
- Areas
- Lost/At-Risk
- Settings/Data & Sync where commercial data appears
- Admin User Management
- AI
- exports/drill-downs

Classify each role/screen as `PASS`, `BLOCKED`, or `FAIL`.

- [ ] **Step 4: Run mandatory negative tests**

- Sales Rep requests another rep/customer.
- Supervisor requests another team/company.
- Manager calls Admin user API.
- inactive user accesses commercial RPC.
- anonymous client accesses commercial RPC.
- anonymous client calls AI endpoint.
- manually altered browser filters attempt broader scope.

- [ ] **Step 5: Reconcile visible numbers against scoped SQL/RPC results**

For representative Sales Rep, Supervisor, and Manager scopes, visible KPI totals must match secure RPC outputs exactly.

- [ ] **Step 6: Document evidence**

Record date, branch SHA, migration versions, tested role, tested screen, expected scope, actual result, and PASS/BLOCKED/FAIL.

- [ ] **Step 7: Commit**

```bash
git add tests docs
git commit -m "test(p1): add full role-based live QA evidence"
```

---

### Task 14: Final CI, Security Review, PR, and Merge Gate

**Files:**
- Modify: `.github/workflows/ci.yml` only if new test commands are not already picked up.
- Finalize: `docs/p1-access-control-release-evidence.md`.

**Interfaces:**
- Release acceptance requires exact branch SHA evidence.

- [ ] **Step 1: Run complete offline verification on exact head**

```bash
npm run contracts:test
npm run test:unit
npm run lint
npm run build
```
Expected: all PASS.

- [ ] **Step 2: Run approved live authorization suite**

Use secure environment credentials; never commit secrets.

- [ ] **Step 3: Run Supabase security/performance advisors**

No new critical authorization/RLS findings may remain unresolved.

- [ ] **Step 4: Verify Git diff**

Confirm:
- no service-role key in browser code,
- no auth credentials committed,
- no anonymous commercial grants,
- no name-based authorization,
- no P0 fail-closed regression,
- no accidental historical migration edits.

- [ ] **Step 5: Open Draft PR to `main`**

PR body must include:
- role matrix,
- migration list,
- authorization architecture,
- exact CI run evidence,
- exact live QA evidence,
- Supabase advisor findings,
- rollback notes,
- known deferred P2 debt.

- [ ] **Step 6: Keep PR unmerged until explicit approval**

Do not mark the work complete or merge to `main` until the user explicitly approves the merge.

---

## Planned Test Matrix Summary

| Security Area | Sales Rep | Supervisor | Manager | Admin |
|---|---|---|---|---|
| Own/authorized sales data | PASS | PASS | PASS | PASS |
| Other rep outside scope | BLOCKED | BLOCKED if outside team | PASS | PASS |
| Other team | BLOCKED | BLOCKED | PASS | PASS |
| Other company | BLOCKED unless assigned | BLOCKED | PASS | PASS |
| Executive | BLOCKED | BLOCKED | PASS | PASS |
| User management | BLOCKED | BLOCKED | BLOCKED | PASS |
| AI outside scope | BLOCKED | BLOCKED | PASS within HS+MAS | PASS within HS+MAS |
| Export outside scope | BLOCKED | BLOCKED | PASS | PASS |
| Direct URL hidden view | BLOCKED | BLOCKED where unauthorized | PASS | PASS |
| Anonymous commercial RPC | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

## Release Definition of Done

P1 is releasable only when:
1. Auth is required for all commercial runtime paths.
2. Four-role DB scope is enforced from `auth.uid()`.
3. Salesperson authorization uses stable IDs.
4. All commercial RPCs intersect filters with authorized scope.
5. Anonymous commercial execution is removed.
6. Frontend navigation/routes/filters match role capabilities without being the security boundary.
7. Cross-user analytics cache leakage is impossible.
8. AI, drill-downs, details, and exports use the same scope.
9. Admin user management is server-side privileged and Admin-only.
10. Full four-role QA has no unauthorized exposure.
11. Contracts, unit tests, TypeScript, build, approved live tests, and security advisors are green.
12. PR remains unmerged until explicit user merge approval.
