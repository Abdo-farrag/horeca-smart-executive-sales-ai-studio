import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('server.ts', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

assert.match(server, /authorization/i, 'server.ts must read Authorization header for /api/ai/chat');
assert.match(server, /getUser\s*\(/, 'server.ts must verify the Supabase JWT before processing AI commercial context');
assert.match(app, /AccessProvider/, 'src/App.tsx must be wrapped with AccessProvider');
assert.match(app, /AccessGate/, 'src/App.tsx must gate the commercial application behind AccessGate');

console.log('✓ Auth-required commercial runtime contract passed');
