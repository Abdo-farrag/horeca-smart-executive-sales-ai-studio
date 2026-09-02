# P0 Stabilization v2 — Review Notes

## P0 guarantees

- Executive route remains `./views/ExecutiveDashboard`; no reduced replacement screen is introduced.
- Executive commercial sections fail closed when verified Analytics/Supabase data is unavailable.
- No Executive KPI fallback to context/mock/demo commercial values.
- No hardcoded Executive runtime sales date or sync-row fallback values.
- Audit diagnostics remain outside the Executive Dashboard and are available in Settings.
- Major Executive interactions are protected by feature-preservation contracts: AI Brief, KPI cards, Daily Sales Rep Performance, representative/customer search, representative/customer drill-down, daily trend, company mix, and retention.
- Offline unit QA and live Supabase reconciliation QA are separated without weakening the live tests.

## Verification

Latest full CI for commit `285f75ab80e51452f7b9d4d00a2059eb79c17595` passed:

- Contract tests
- Offline unit tests
- TypeScript
- Monorepo build

## Deferred technical debt — P1

1. Executive summary adapters currently populate required legacy `Customer` / `SalesRep` fields with neutral values when those fields are not supplied by the summary RPC. Active Executive tables expose verified fields only; customer detail re-queries live data by customer ID. The long-term fix is to introduce dedicated summary DTO/view-model types rather than force full entity types.
2. `companyFrom` currently classifies MAS explicitly and otherwise resolves to Horeca Smart. Replace this with an explicit normalized company contract that rejects unknown company names once the canonical company-value mapping is finalized.
3. Settings/Data & Sync contains legacy display fallbacks and should receive a separate diagnostics-hardening pass. These values are not used by the active Executive commercial KPI path.

## Merge rule

Do not merge until the PR diff is reviewed and any required live Supabase reconciliation is executed in an environment with valid Supabase credentials.
