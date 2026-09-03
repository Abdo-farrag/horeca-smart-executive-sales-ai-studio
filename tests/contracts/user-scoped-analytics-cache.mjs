import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const file of [
  'src/analytics/client.ts',
  'apps/lovable/src/analytics/client.ts',
  'apps/studio/src/analytics/client.ts',
]) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /session\.user\.id/, `${file} cache key must include authenticated user id`);
  assert.match(source, /clearAnalyticsClientCache/, `${file} must export a cache clear function`);
  assert.match(source, /ANALYTICS_AUTH_REQUIRED/, `${file} must fail closed without an authenticated session`);
}

for (const file of [
  'src/context/AccessContext.tsx',
  'apps/lovable/src/context/AccessContext.tsx',
  'apps/studio/src/context/AccessContext.tsx',
]) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /clearAnalyticsClientCache\s*\(/, `${file} must clear analytics cache across auth/profile transitions`);
}

console.log('✓ User-scoped analytics cache contract passed');
