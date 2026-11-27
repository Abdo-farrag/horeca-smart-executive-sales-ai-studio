# Horeca Smart — Move dashboard off Replit (review-only plan, 2026-11-27)

## Current repository & constraints

- Canonical source is `Abdo-farrag/horeca-smart-executive-sales-ai-studio`, branch `main`. Keep all updates in this repo; do **not** fork/rebuild the application in Lovable or Replit.
- The canonical root project is **not just a static Vite site**. It builds Vite frontend plus a Node 22 Express server, including `POST /api/ai/chat`, `GET /api/health` and `GET /health`. Express verifies Supabase authenticated bearer tokens and server-side access profiles for the AI endpoint.
- Supabase Auth, sales KPIs, Odoo snapshots and Customer360 source data are independent of the host; moving the frontend **does not deploy missing Supabase RPCs**. Keep `VITE_RETURNS_REVIEW_CENTER_ENABLED=false` until real JWT/company RLS and returns RPC gates pass.
- Existing Replit `horecasmart-dashboard` may contain code divergence from canonical GitHub. Before changing the public domain, compare the old site to the new preview for routes, sales cards, auth, filters, AI and return controls.
- Current Vercel connected team `Horeca / horeca1` is on **Hobby**. Vercel explicitly restricts Hobby to personal non-commercial use; use Pro **only if explicitly approved**, not as a free business site. Vercel Pro is ~$20/month excluding taxes/possible extra usage, potentially exceeding the company's extra ~$25/month budget. No Vercel deployment was created.
- Existing server is the strongest $0 **incremental hosting cost** option if spare CPU/RAM, HTTPS access and ops/admin coverage are verified. Resources, bandwidth, backup and server costs are not truly zero.

## Choice A — portable full-stack Docker image on existing server (preferred)

Prepared non-deployed `Dockerfile` and `.dockerignore` use Node 22 and the existing monorepo build to serve:
- React SPA at the same origin as `/api/ai/chat`.
- Express healthcheck `GET /api/health` (no authentication), with the actual Gemini route still requiring a valid Supabase token.
- The build uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, which are **public client config** (never a Supabase service-role key). Do not include `GEMINI_API_KEY` in the browser or image build arguments. The server receives that secret **at runtime** in the server platform's secret store.

A future deployment owner should:
1. Verify the existing server is appropriate for this distinct container and has capacity, Docker support, secure external TLS reverse proxy, isolation from Odoo, monitoring and access control.
2. Keep GitHub `main` as the only approved source. Merge this PR only after all CI and security review. Pin the SHA for an immutable release and keep rollback image.
3. Build with the approved **public** Supabase project URL + publishable anon key as Vite build arguments and `VITE_RETURNS_REVIEW_CENTER_ENABLED=false`. Do not place production private keys in Docker build args or GitHub artifacts.
4. Provide `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `GEMINI_API_KEY` to the production Node process **as server-only runtime environment** (secrets store, no plaintext repository or logs). Backend authenticates a bearer token, and must not access Supabase data using a service-role key to bypass row-level permissions.
5. Validate authentication and authorization with approved test accounts from each company, `/api/health`, SPA route refresh, `/api/ai/chat` 401 for no bearer, 403 for non-manager, 200 for permitted user only when keys are configured; check network calls and no source-table overread.
6. Test across customer/sales/areas/finance dashboards before switching DNS; use HTTPS and have rollback to the existing live site. Avoid revealing the app publicly without working auth.

**CI:** `.github/workflows/portable-runtime.yml` builds the full monorepo, boots the actual production Express bundle on an ephemeral GitHub Actions runner with no secrets, asserts `/api/health`, homepage and unauthenticated AI request rejection. A second job builds and runs the proposed Docker image with the same checks. This does **not** prove production credentials, company RLS, or Odoo integration.

## Choice B — Cloudflare Pages frontend + existing backend

Cloudflare Pages can serve the compiled static Vite site with GitHub integration and a generous free static tier. **Do not** upload the full root `dist` containing `server.cjs` or secrets. Build only the Vite frontend (for example with the site's `vite build`) to a dedicated static output.

The current AI client calls `/api/ai/chat` on the same origin, so a static Pages deployment alone **breaks that feature**. A tested HTTPS proxy/Cloudflare Pages Function to the authenticated Node backend, or a suitable hosted Supabase Edge Function replacement, must be added. Also check CORS, forwarded bearer token, content limits and cache policy. This route is economical but increases deployment complexity.

Cloudflare Pages: https://developers.cloudflare.com/pages/get-started/git-integration/
React build docs: https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/

## Choice C — Vercel

Current team is Hobby (non-commercial only). Vercel Pro starts at $20/month plus VAT/usage; production use requires an approved commercial plan, budget cap, and cost controls. The current Express process with `app.listen` must be deliberately adapted or hosted as a separate backend; Vercel does **not** magically run the existing server as an always-on process. Do not create a Vercel commercial deployment on Hobby. Do not migrate auth/database just to change hosting.

Pricing/terms: https://vercel.com/pricing and https://vercel.com/docs/limits/fair-use-guidelines

## Lovable

Useful as a **frontend design/iteration workspace**, not necessarily the cheapest or simplest production host for this React + Express architecture. There is already an `apps/lovable` workspace in the canonical repository; this is source layout, **not evidence that an existing hosted Lovable project is linked**. Lovable project lookup was unavailable in this session. Keep GitHub canonical and do not create a duplicate database or independently diverging repo.

## Hard release blockers independent of host

1. As checked in Supabase Production on 2026-11-27, the proposed new returns review/assignment RPCs/tables are not deployed. Do not enable the Returns Intelligence feature flag as if they exist.
2. Current `customer360_authenticated_read` SELECT policy on `otc_delivery_lines`, `otc_return_lines`, `otc_invoice_lines` has `auth.uid() IS NOT NULL` without company scoping. Treat as potential cross-company exposure, obtain secure RLS migration and JWT regression before any broad rollout.
3. Ensure only real validated data, no dummy values or inferred fraud; original order-date cohort returns must stay linked to their order ID and company.
4. The existing Replit deployment must remain untouched until a separate preview passes functional UAT and explicit DNS/cutover approval.

**Status:** Infrastructure code only, no cloud account creation, paid plan, database migration, Replit changes, deployment or Production traffic switch.
