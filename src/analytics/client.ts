import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AnalyticsError } from './errors';

export async function callAnalyticsRpc<T>(
  operation: string,
  params: Record<string, unknown>,
  normalize: (row: Record<string, unknown>) => T
): Promise<T[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new AnalyticsError({
      message: `Supabase client is not configured when calling RPC '${operation}'`,
      code: 'ANALYTICS_NOT_CONFIGURED',
      operation,
    });
  }

  const { data, error } = await supabase.rpc(operation, params);

  if (error) {
    throw new AnalyticsError({
      message: `RPC '${operation}' execution failed: ${error.message}`,
      code: 'ANALYTICS_RPC_ERROR',
      operation,
      details: error,
      cause: error,
    });
  }

  if (data === null || !Array.isArray(data)) {
    throw new AnalyticsError({
      message: `RPC '${operation}' expected an array response, received ${data === null ? 'null' : typeof data}`,
      code: 'ANALYTICS_INVALID_RESPONSE',
      operation,
      details: { data },
    });
  }

  return data.map((row: Record<string, unknown>) => normalize(row));
}

export async function readAnalyticsTable<T>(
  tableName: 'analytics_catalog' | 'business_metrics_dictionary',
  normalize: (row: Record<string, unknown>) => T
): Promise<T[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new AnalyticsError({
      message: `Supabase client is not configured when reading table '${tableName}'`,
      code: 'ANALYTICS_NOT_CONFIGURED',
      operation: tableName,
    });
  }

  const { data, error } = await supabase.from(tableName).select('*');

  if (error) {
    throw new AnalyticsError({
      message: `Table read '${tableName}' failed: ${error.message}`,
      code: 'ANALYTICS_RPC_ERROR',
      operation: tableName,
      details: error,
      cause: error,
    });
  }

  if (data === null || !Array.isArray(data)) {
    throw new AnalyticsError({
      message: `Table read '${tableName}' expected an array response, received ${data === null ? 'null' : typeof data}`,
      code: 'ANALYTICS_INVALID_RESPONSE',
      operation: tableName,
      details: { data },
    });
  }

  return data.map((row: Record<string, unknown>) => normalize(row));
}
