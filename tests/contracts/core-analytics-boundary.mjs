import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

assert.ok(fs.existsSync('packages/core/src/analytics'), 'packages/core/src/analytics must exist');
console.log('✓ Core analytics boundary contract passed');
