# P0 Live Supabase QA Gate

The offline CI intentionally excludes `phase6LiveReconciliation.test.ts` because those tests require live Supabase credentials and production-like Analytics RPC access.

Run the preserved live reconciliation suite in an authorized environment with valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`:

```bash
npm run test:live
```

A merge can require this gate when live data reconciliation is part of the release decision. The live tests are not replaced by mocks and their assertions remain intact.
