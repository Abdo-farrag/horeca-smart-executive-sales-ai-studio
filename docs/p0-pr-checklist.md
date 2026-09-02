# P0 PR Review Checklist

- [ ] Executive route remains unchanged (`./views/ExecutiveDashboard`).
- [ ] No fake/demo commercial fallback can reach Executive KPI, retention, customer, or representative sections.
- [ ] No hardcoded Executive runtime sales dates or sync row counts.
- [ ] AI Brief, KPI cards, Daily Sales Rep Performance, search, and drill-down interactions remain present.
- [ ] Audit diagnostics are not rendered inside Executive Dashboard.
- [ ] Contract tests pass.
- [ ] Offline unit tests pass.
- [ ] TypeScript check passes.
- [ ] Monorepo build passes.
- [ ] Live Supabase reconciliation (`npm run test:live`) is executed when required by the release decision.
- [ ] Deferred P1 technical debt in `p0-stabilization-v2-review-notes.md` is acknowledged.

Do not merge while this pull request remains in Draft state.
