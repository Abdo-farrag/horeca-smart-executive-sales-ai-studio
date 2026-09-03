import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');

const appContext = read('src/context/AppContext.tsx');
assert.match(appContext, /const resetFilters = \(\) => \{[\s\S]*setFilters\(\(prev\)/, 'resetFilters must derive from the current filter state');
assert.match(appContext, /latestAvailableDataDate:\s*prev\.latestAvailableDataDate/, 'resetFilters must preserve loaded freshness');

const salesRepService = read('src/services/salesRepService.ts');
for (const key of ['governorateCode', 'areaCode', 'customerId', 'productId']) {
  assert.match(
    salesRepService,
    new RegExp(`${key}\\s*(?::|[,}])`),
    `Sales Rep summary must propagate ${key}`,
  );
}
assert.match(salesRepService, /ADVANCED_FILTERS_UNSUPPORTED/, 'Sales Rep 360 detail RPCs must fail visibly instead of silently dropping unsupported advanced filters');

const salesService = read('src/services/salesService.ts');
assert.doesNotMatch(salesService, /\.from\(['"]sales_orders_odoo18['"]\)/, 'Sales service must not bypass analytics with direct order-table reads');

const rootSupabase = read('src/lib/supabase.ts');
assert.doesNotMatch(rootSupabase, /createClient\(/, 'Root app must not construct a second Supabase auth client');
assert.match(rootSupabase, /@horeca-smart\/core/, 'Root app should reuse the shared core Supabase singleton');

const lovableSupabase = read('apps/lovable/src/lib/supabase.ts');
const studioSupabase = read('apps/studio/src/lib/supabase.ts');
assert.doesNotMatch(lovableSupabase, /createClient\(/, 'Lovable app must not construct a second Supabase auth client');
assert.doesNotMatch(studioSupabase, /createClient\(/, 'Studio app must not construct a second Supabase auth client');

const csvExport = read('packages/core/src/exports/csv.ts');
assert.match(csvExport, /\uFEFF|\\uFEFF/, 'CSV export must include a UTF-8 BOM for Arabic Excel compatibility');
assert.match(csvExport, /downloadCsv/, 'CSV utility must expose a real download function');

for (const path of ['src/views/SalesDashboard.tsx', 'src/views/ExecutiveDashboard.tsx', 'src/components/DrillDownModal.tsx']) {
  const source = read(path);
  assert.doesNotMatch(source, /alert\([^\n]*(export|تصدير)/i, `${path} must not fake export success with alert()`);
  assert.match(source, /downloadCsv/, `${path} must use the real scoped CSV export path`);
}

const aiClient = read('src/services/aiChatService.ts');
assert.match(aiClient, /auth\.getSession\(\)/, 'AI client must read the active Supabase session');
assert.match(aiClient, /Authorization[^\n]*Bearer/, 'AI client must send a Bearer token');

for (const path of ['server.ts', 'apps/studio/server.ts']) {
  const server = read(path);
  assert.match(server, /auth\.getUser\(/, `${path} must validate the bearer token with Supabase Auth`);
  assert.match(server, /current_access_profile/, `${path} must load the current access profile`);
  assert.match(server, /AI_SCOPE_NOT_READY|authenticatedRole/, `${path} must enforce the authenticated access profile`);
  assert.match(server, /status\(503\)/, `${path} must return service unavailable when the AI provider is missing`);
  assert.match(server, /AI_SERVICE_UNAVAILABLE/, `${path} must use a clear AI service unavailable code`);
}

console.log('release QA fixes contract passed');
