# P1 Release Candidate Verification Gate — 2026-09-03

This file marks the final verification gate for the P1 access-control and analytics-correctness release candidate.

## Required before production migration / PR handoff

- Contract tests pass.
- Offline unit tests pass.
- TypeScript check passes.
- Production build passes.
- Customer Action Center uses canonical company IDs: MAS=1, Horeca Smart=2.
- Product Dashboard distinct Orders and Customers come from order-level scoped Executive KPIs, not sums of per-SKU counts.
- Analytics cache remains user-scoped and clears on auth/profile transitions.
- Production migration is applied only after reviewed-safe migration steps are confirmed.
- The broad authenticated EXECUTE revocation migration must not be applied until secure application entrypoints are complete.

No merge to `main` is authorized by this checklist.
