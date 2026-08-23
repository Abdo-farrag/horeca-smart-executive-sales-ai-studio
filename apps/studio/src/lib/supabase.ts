import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = ((import.meta as unknown) as { env?: Record<string, string | undefined> }).env || {};
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim().length > 0 && 
  supabaseAnonKey.trim().length > 0 &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface SupabaseStatusInfo {
  isConfigured: boolean;
  url: string | null;
  statusText: string;
}

export function getSupabaseStatusInfo(): SupabaseStatusInfo {
  return {
    isConfigured: isSupabaseConfigured,
    url: supabaseUrl || null,
    statusText: isSupabaseConfigured ? 'Connected to Supabase' : 'Supabase Not Configured (Using Safe Mock Fallback)'
  };
}

export function getSupabaseHostOnly(): string {
  if (!supabaseUrl || !isSupabaseConfigured) return 'Not configured';
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.host;
  } catch {
    return supabaseUrl.replace(/^https?:\/\//, '').split('/')[0] || 'Unknown Host';
  }
}
