import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const versions = [
  'src/views/OrderToCashReturnsControl.tsx',
  'apps/lovable/src/views/OrderToCashReturnsControl.tsx',
  'apps/studio/src/views/OrderToCashReturnsControl.tsx',
];
const panels = [
  'OtcMovementReconciliationPanel',
  'ReturnEvidenceCoveragePanel',
  'ReturnAuditCandidatesPanel',
  'ReturnAuditHistoryPanel',
];
for (const path of versions) {
  const contents = readFileSync(path, 'utf8');
  assert.match(contents, /const auditPanelsEnabled = import\.meta\.env\.VITE_OTC_RETURNS_AUDIT_ENABLED === 'true';/,
    path + ': feature disabled unless explicitly enabled');
  const guarded = contents.match(/\{auditPanelsEnabled \? \(<>[\s\S]*?<\/\>\) : null\}/);
  assert.ok(guarded, path + ': missing guarded audit controls');
  for (const name of panels) {
    const tag = '<' + name + ' />';
    assert.ok(guarded[0].includes(tag), path + ': ' + tag + ' outside guard');
    assert.equal(contents.split(tag).length - 1, 1, path + ': duplicated control ' + name);
  }
  assert.match(contents, /fetchOrderToCashControlData\(/,
    path + ': existing OTC operational data must remain unaffected');
}
console.log('✓ OTC audit UI hidden by default in root/Lovable/Studio, with existing OTC operations intact');
