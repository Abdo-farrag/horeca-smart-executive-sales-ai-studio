import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Workspace Layout Contract', () => {
  const root = process.cwd();

  const requiredPaths = [
    'apps/studio',
    'apps/lovable',
    'packages/core',
    'supabase',
    'tests',
    '.github/workflows/ci.yml',
    'package.json',
    'tsconfig.base.json',
    'README.md',
  ];

  for (const relPath of requiredPaths) {
    it(`contains required path: ${relPath}`, () => {
      const fullPath = path.resolve(root, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  }

  it('packages/core exports valid package.json with name @horeca-smart/core', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(root, 'packages/core/package.json'), 'utf-8')
    );
    expect(pkgJson.name).toBe('@horeca-smart/core');
  });

  it('apps/studio contains server.ts and package.json', () => {
    expect(fs.existsSync(path.resolve(root, 'apps/studio/server.ts'))).toBe(true);
    expect(fs.existsSync(path.resolve(root, 'apps/studio/package.json'))).toBe(true);
  });

  it('apps/lovable contains package.json and vite.config.ts', () => {
    expect(fs.existsSync(path.resolve(root, 'apps/lovable/package.json'))).toBe(true);
    expect(fs.existsSync(path.resolve(root, 'apps/lovable/vite.config.ts'))).toBe(true);
  });
});
