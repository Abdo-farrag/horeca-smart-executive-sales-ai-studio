# Customer Layer Audit Corrections / Clarifications

Date: 2026-09-03
Applies to: `2026-09-03-customer-layer-audit.md`

## Clarification for C-007

The original C-007 correctly identifies that `Customer360Panel.tsx` reads `filters.dateRange.startDate/endDate` rather than explicitly reading `effectiveStartDate/effectiveEndDate`.

However, review of current `AppContext` shows that after sales freshness is loaded, `dateRange.startDate/endDate` are themselves rewritten to the calculated effective window. The Global Filter handlers also write the effective range into `dateRange`.

Therefore:
- The direct SQL example demonstrates the business risk of using a future selected month-end for recency calculations.
- But this is **not currently proven to occur in the normal AppContext flow** because `dateRange` is normally synchronized to the effective window.

Revised severity: `Medium / contract-hardening`, not Critical runtime bug.

Recommended correction remains:
- Customer 360 should explicitly use `effectiveStartDate/effectiveEndDate` for selected-period analytics.
- Operational risk should use an explicit `as_of_date`.
- Avoid relying on the implicit invariant that `dateRange` always equals the effective window.

This clarification supersedes the original C-007 severity while preserving the architectural recommendation.
