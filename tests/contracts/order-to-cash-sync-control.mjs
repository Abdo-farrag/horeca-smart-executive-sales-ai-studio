import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const control = readFileSync('src/components/OrderToCashSyncControl.tsx', 'utf8');
const service = readFileSync('src/services/orderToCashSyncService.ts', 'utf8');

assert.match(app, /OrderToCashSyncControl/, 'OTC route must render the sync control');
assert.match(control, /useAccess\(\)/, 'OTC sync controls must use the authenticated access context');
assert.match(control, /profile\.role === 'admin'|profile\.role === 'manager'/, 'OTC sync controls must be limited to admin or manager');
assert.match(control, /Dry Run/, 'OTC sync controls must expose a dry-run action');
assert.match(control, /Sync Now/, 'OTC sync controls must expose a sync action');
assert.match(service, /supabase\.functions\.invoke\(['"]sync-odoo18-order-to-cash['"]/, 'OTC sync must invoke the protected edge function through the authenticated Supabase client');
assert.doesNotMatch(service, /service[_-]?role/i, 'Frontend sync service must never contain a service-role credential or bypass');

console.log('order-to-cash sync control contract passed');
