import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getCurrentAccessProfile, getCurrentSession, signInWithPassword, signOut as signOutService } from '../services/accessService';
import type { AccessProfile, AccessStatus } from '../types/access';

interface AccessContextValue { status: AccessStatus; user: User | null; session: Session | null; profile: AccessProfile | null; error: string | null; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>; refreshProfile: () => Promise<void>; }
const AccessContext = createContext<AccessContextValue | undefined>(undefined);

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AccessStatus>(isSupabaseConfigured ? 'loading' : 'not_configured');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolveProfile = useCallback(async (activeSession: Session) => { setSession(activeSession); setUser(activeSession.user); try { const next = await getCurrentAccessProfile(); if (!next.isActive) { setProfile(null); setStatus('inactive'); setError('ACCOUNT_INACTIVE'); return; } setProfile(next); setError(null); setStatus('authenticated'); } catch (err) { setProfile(null); setStatus('unauthorized'); setError(err instanceof Error ? err.message : 'ACCESS_PROFILE_UNAVAILABLE'); } }, []);
  const clearSession = useCallback(() => { setSession(null); setUser(null); setProfile(null); setError(null); setStatus(isSupabaseConfigured ? 'unauthenticated' : 'not_configured'); }, []);
  useEffect(() => { if (!isSupabaseConfigured || !supabase) { setStatus('not_configured'); return; } let active = true; getCurrentSession().then((s) => { if (!active) return; if (!s) return clearSession(); return resolveProfile(s); }).catch((err) => { if (!active) return; setError(err instanceof Error ? err.message : 'AUTH_SESSION_ERROR'); setStatus('unauthorized'); }); const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (!active) return; if (!next) return clearSession(); void resolveProfile(next); }); return () => { active = false; data.subscription.unsubscribe(); }; }, [clearSession, resolveProfile]);
  const signIn = useCallback(async (email: string, password: string) => { setStatus('loading'); setError(null); try { const auth = await signInWithPassword(email.trim(), password); await resolveProfile(auth.session); } catch (err) { clearSession(); setError(err instanceof Error ? err.message : 'AUTH_FAILED'); throw err; } }, [clearSession, resolveProfile]);
  const signOut = useCallback(async () => { try { await signOutService(); } finally { clearSession(); } }, [clearSession]);
  const refreshProfile = useCallback(async () => { if (!session) return clearSession(); await resolveProfile(session); }, [clearSession, resolveProfile, session]);
  const value = useMemo(() => ({ status, user, session, profile, error, signIn, signOut, refreshProfile }), [status, user, session, profile, error, signIn, signOut, refreshProfile]);
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};
export function useAccess(): AccessContextValue { const value = useContext(AccessContext); if (!value) throw new Error('useAccess must be used within AccessProvider'); return value; }
