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

const snapshotMigration = read('supabase/migrations/20261003010000_otc_snapshot_foundation.sql');
for (const table of ['otc_delivery_lines', 'otc_return_lines', 'otc_invoice_lines']) {
  requireText(snapshotMigration, `create table public.${table}`, 'snapshot migration');
  requireText(snapshotMigration, `alter table public.${table} enable row level security`, 'snapshot RLS');
}
requireText(snapshotMigration, 'link_confidence', 'snapshot migration');
requireText(snapshotMigration, "check (link_confidence in ('direct', 'inferred', 'unmatched'))", 'link confidence constraint');
requireText(snapshotMigration, 'sale_order_line_id', 'sale-order-line grain');
requireText(snapshotMigration, 'odoo_move_id', 'delivery immutable key');
requireText(snapshotMigration, 'odoo_return_move_id', 'return immutable key');
requireText(snapshotMigration, 'account_move_line_id', 'invoice immutable key');
if (/create\s+policy[\s\S]*for\s+(insert|update|delete|all)[\s\S]*to\s+(anon|public)/i.test(snapshotMigration)) {
  errors.push('snapshot migration must not create anon/public write policies');
}

const rpcMigration = read('supabase/migrations/20261003020000_otc_secure_rpcs.sql');
for (const fn of [
  'analytics_order_to_cash_kpis_v1',
  'analytics_order_to_cash_trend_v1',
  'analytics_returns_exception_queue_v1',
  'analytics_customer_order_to_cash_v1',
  'analytics_sales_rep_order_to_cash_v1',
  'analytics_product_order_to_cash_v1',
]) {
  requireText(rpcMigration, `function public.${fn}`, 'secure RPC migration');
}
requireText(rpcMigration, 'authorized_company_ids()', 'company authorization scope');
requireText(rpcMigration, 'authorized_salesperson_ids()', 'salesperson authorization scope');
requireText(rpcMigration, 'gross_delivered', 'delivery metric');
requireText(rpcMigration, 'returned', 'return metric');
requireText(rpcMigration, 'net_delivered', 'net delivered metric');
requireText(rpcMigration, 'gross_invoiced', 'gross invoiced metric');
requireText(rpcMigration, 'credit_note', 'credit note metric');
requireText(rpcMigration, 'net_invoiced', 'net invoiced metric');
requireText(rpcMigration, 'date_basis', 'explicit date basis');

const syncSource = read('supabase/functions/sync-odoo18-order-to-cash/index.ts');
for (const model of ['stock.picking', 'stock.move', 'account.move', 'account.move.line']) {
  requireText(syncSource, model, 'OTC sync models');
}
requireText(syncSource, 'dry_run', 'dry-run mode');
requireText(syncSource, 'sync_logs', 'sync logging');
requireText(syncSource, 'sale_line_id', 'delivery direct relation probe');
requireText(syncSource, 'origin_returned_move_id', 'return linkage');
requireText(syncSource, 'sale_line_ids', 'invoice linkage');
requireText(syncSource, 'invoice_multi_sale_line_count', 'invoice multi-link diagnostics');
requireText(syncSource, 'delivery_direct_link_pct', 'delivery relation coverage');
requireText(syncSource, 'return_original_move_link_pct', 'return relation coverage');
requireText(syncSource, 'display_type', 'invoice-line nature diagnostics');
requireText(syncSource, 'invoice_display_type_counts', 'invoice-line display-type coverage');
if (/\.delete\s*\(/.test(syncSource)) errors.push('OTC sync V1 must not hard-delete historical rows');

for (const appRoot of ['src', 'apps/lovable/src', 'apps/studio/src']) {
  if (!fs.existsSync(path.join(root, appRoot))) continue;
  const stack = [path.join(root, appRoot)];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const source = fs.readFileSync(full, 'utf8');
        if (/\.from\(\s*['"]otc_(delivery|return|invoice)_lines['"]\s*\)/.test(source)) {
          errors.push(`frontend raw OTC table read is forbidden: ${path.relative(root, full)}`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error('order-to-cash-returns-control-contract: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('order-to-cash-returns-control-contract: PASS');