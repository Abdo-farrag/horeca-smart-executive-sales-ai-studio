import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { AccessProfile, AppRole } from '../types/access';

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'sales_rep' || value === 'supervisor' || value === 'manager' || value === 'admin';
}

export function normalizeAccessProfile(raw: unknown): AccessProfile {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') throw new Error('ACCESS_PROFILE_INVALID');
  const record = row as Record<string, unknown>;
  if (!isAppRole(record.role)) throw new Error('ACCESS_ROLE_INVALID');

  return {
    userId: String(record.user_id ?? ''),
    displayName: String(record.display_name ?? ''),
    role: record.role,
    isActive: record.is_active !== false,
    companyId: toNullableNumber(record.company_id),
    teamId: toNullableNumber(record.team_id),
    salespersonId: toNullableNumber(record.salesperson_id),
    canViewExecutive: Boolean(record.can_view_executive),
    canManageUsers: Boolean(record.can_manage_users),
  };
}

export async function getCurrentAccessProfile(): Promise<AccessProfile> {
  if (!isSupabaseConfigured || !supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.rpc('current_access_profile');
  if (error) throw new Error(error.message || 'ACCESS_PROFILE_UNAVAILABLE');
  return normalizeAccessProfile(data);
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string): Promise<{ user: User; session: Session }> {
  if (!isSupabaseConfigured || !supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw error || new Error('AUTH_SESSION_UNAVAILABLE');
  return { user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
