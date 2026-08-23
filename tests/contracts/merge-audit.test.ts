import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Merge Audit Contract', () => {
  it('validates canonical monorepo layout', () => {
    expect(fs.existsSync(path.resolve(process.cwd(), 'packages/core'))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), 'apps/studio'))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), 'apps/lovable'))).toBe(true);
  });
});
