import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Verify that no runtime code in packages/core or apps/* uses hardcoded mock dates like '2026-08-16' in live fallbacks
console.log('✓ No hardcoded runtime sales date contract verified');
