import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const read = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    errors.push(`missing required file: ${relative}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
};

const requireText = (source, needle, label) => {
  if (!source.includes(needle)) errors.push(`${label}: missing ${needle}`);
};

for (const appRoot of ['src', 'apps/lovable/src', 'apps/studio/src']) {
  if (!fs.existsSync(path.join(root, appRoot))) continue;

  const analytics = read(`${appRoot}/analytics/orderToCash.ts`);
  const service = read(`${appRoot}/services/orderToCashService.ts`);
  const view = read(`${appRoot}/views/OrderToCashReturnsControl.tsx`);
  const app = read(`${appRoot}/App.tsx`);
  const sidebar = read(`${appRoot}/components/Sidebar.tsx`);
  const capabilities = read(`${appRoot}/access/viewCapabilities.ts`);

  for (const rpc of [
    'analytics_order_to_cash_kpis_v1',
    'analytics_order_to_cash_trend_v1',
    'analytics_returns_exception_queue_v1',
  ]) {
    requireText(analytics, rpc, `${appRoot} OTC analytics RPC adapter`);
  }

  requireText(analytics, 'date_basis', `${appRoot} OTC explicit date basis`);
  requireText(service, 'getEffectiveFilterParams', `${appRoot} OTC global filter propagation`);
  requireText(service, 'fetchOrderToCashControlData', `${appRoot} OTC service entrypoint`);
  requireText(view, 'OrderToCashReturnsControl', `${appRoot} OTC control view`);
  requireText(view, 'Net Delivered', `${appRoot} OTC net delivered KPI`);
  requireText(view, 'Net Invoiced', `${appRoot} OTC net invoiced KPI`);
  requireText(view, 'Uncredited Returns', `${appRoot} OTC exception KPI`);
  requireText(view, 'Date Basis', `${appRoot} OTC date basis selector`);
  requireText(app, "case 'order-to-cash'", `${appRoot} OTC app route`);
  requireText(sidebar, "id: 'order-to-cash'", `${appRoot} OTC sidebar entry`);
  requireText(capabilities, "'order-to-cash'", `${appRoot} OTC RBAC capability`);

  for (const source of [analytics, service, view]) {
    if (/\.from\(\s*['\"]otc_(delivery|return|invoice)_lines['\"]\s*\)/.test(source)) {
      errors.push(`${appRoot} OTC browser code must use secure RPCs only`);
    }
  }
}

if (errors.length) {
  console.error('order-to-cash-ui-contract: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('order-to-cash-ui-contract: PASS');
