import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AnalyticsError } from './errors';

const MAX_CONCURRENT_RPCS = 4;
let activeRpcs = 0;
const rpcQueue: Array<() => void> = [];
const inFlightRequests = new Map<string, Promise<any>>();
interface CacheEntry { data: any[]; timestamp: number; }
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10_000;

function acquireSlot(): Promise<void> {
  if (activeRpcs < MAX_CONCURRENT_RPCS) { activeRpcs++; return Promise.resolve(); }
  return new Promise((resolve) => rpcQueue.push(() => { activeRpcs++; resolve(); }));
}
function releaseSlot(): void {
  activeRpcs--;
  if (rpcQueue.length > 0 && activeRpcs < MAX_CONCURRENT_RPCS) rpcQueue.shift()?.();
}
function isTransientError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return code === '57014' || code === '53300' || msg.includes('statement timeout') || msg.includes('connection pool') || msg.includes('timed out') || msg.includes('timeout') || msg.includes('too many connections') || msg.includes('network') || msg.includes('failed to fetch');
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTestEnv = () => typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST));

export function clearAnalyticsClientCache(): void {
  responseCache.clear();
  inFlightRequests.clear();
}

async function requireAuthenticatedUserId(operation: string): Promise<string> {
  if (!supabase) throw new AnalyticsError({ message: `Supabase client is not configured for '${operation}'`, code: 'ANALYTICS_NOT_CONFIGURED', operation });
  if (isTestEnv() && (!supabase.auth || typeof supabase.auth.getSession !== 'function')) return 'test-user';
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (error || !session?.user?.id) {
    throw new AnalyticsError({ message: `Authenticated session required for '${operation}'`, code: 'ANALYTICS_AUTH_REQUIRED', operation, details: error, cause: error });
  }
  return session.user.id;
}

export async function callAnalyticsRpc<T>(operation: string, params: Record<string, unknown>, normalize: (row: Record<string, unknown>) => T): Promise<T[]> {
  if (!isSupabaseConfigured || !supabase) throw new AnalyticsError({ message: `Supabase client is not configured when calling RPC '${operation}'`, code: 'ANALYTICS_NOT_CONFIGURED', operation });
  const userId = await requireAuthenticatedUserId(operation);
  const cacheKey = `${userId}:${operation}:${JSON.stringify(params)}`;
  const testEnv = isTestEnv();

  if (!testEnv) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data.map((row) => normalize(row));
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) return (await inFlight).map((row: Record<string, unknown>) => normalize(row));
  }

  const executePromise = (async () => {
    const maxRetries = 2;
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await acquireSlot();
      try {
        const { data, error } = await supabase.rpc(operation, params);
        if (error) {
          lastError = error;
          if (attempt < maxRetries && isTransientError(error)) { await sleep(400 * (attempt + 1) + Math.random() * 200); continue; }
          throw new AnalyticsError({ message: `RPC '${operation}' execution failed: ${error.message}`, code: 'ANALYTICS_RPC_ERROR', operation, details: error, cause: error });
        }
        if (data === null || !Array.isArray(data)) throw new AnalyticsError({ message: `RPC '${operation}' expected an array response, received ${data === null ? 'null' : typeof data}`, code: 'ANALYTICS_INVALID_RESPONSE', operation, details: { data } });
        if (!testEnv) responseCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        lastError = err;
        if (err instanceof AnalyticsError) {
          if (attempt < maxRetries && isTransientError(err.cause || err.details)) { await sleep(400 * (attempt + 1) + Math.random() * 200); continue; }
          throw err;
        }
        if (attempt < maxRetries && isTransientError(err)) { await sleep(400 * (attempt + 1) + Math.random() * 200); continue; }
        throw new AnalyticsError({ message: `RPC '${operation}' execution failed: ${err.message || String(err)}`, code: 'ANALYTICS_RPC_ERROR', operation, details: err, cause: err });
      } finally { releaseSlot(); }
    }
    throw lastError || new Error(`RPC '${operation}' failed after retries`);
  })();

  if (!testEnv) inFlightRequests.set(cacheKey, executePromise);
  try { return (await executePromise).map((row: Record<string, unknown>) => normalize(row)); }
  finally { if (!testEnv) inFlightRequests.delete(cacheKey); }
}

export async function readAnalyticsTable<T>(tableName: 'analytics_catalog' | 'business_metrics_dictionary', normalize: (row: Record<string, unknown>) => T): Promise<T[]> {
  if (!isSupabaseConfigured || !supabase) throw new AnalyticsError({ message: `Supabase client is not configured when reading table '${tableName}'`, code: 'ANALYTICS_NOT_CONFIGURED', operation: tableName });
  await requireAuthenticatedUserId(tableName);
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw new AnalyticsError({ message: `Table read '${tableName}' failed: ${error.message}`, code: 'ANALYTICS_RPC_ERROR', operation: tableName, details: error, cause: error });
  if (data === null || !Array.isArray(data)) throw new AnalyticsError({ message: `Table read '${tableName}' expected an array response, received ${data === null ? 'null' : typeof data}`, code: 'ANALYTICS_INVALID_RESPONSE', operation: tableName, details: { data } });
  return data.map((row: Record<string, unknown>) => normalize(row));
}
