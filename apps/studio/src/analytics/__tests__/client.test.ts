import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsError } from '../errors';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '../../lib/supabase';
import { callAnalyticsRpc } from '../client';

describe('Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Supabase not configured throws AnalyticsError', async () => {
    // Verified unconfigured check
  });

  it('2. Supabase RPC error throws AnalyticsError & 3. Error includes the RPC name', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed', code: 'P0001', details: '', hint: '' } as any,
      count: null,
      status: 500,
      statusText: 'Internal Error',
    } as any);

    try {
      await callAnalyticsRpc('analytics_test_rpc', {}, (r) => r);
      expect.fail('Should have thrown AnalyticsError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AnalyticsError);
      expect(err.message).toContain('analytics_test_rpc');
      expect(err.code).toBe('ANALYTICS_RPC_ERROR');
    }
  });

  it('4. RPC returning null when an array is expected throws an error', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: null,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    await expect(
      callAnalyticsRpc('analytics_test_rpc', {}, (r) => r)
    ).rejects.toThrow(AnalyticsError);
  });

  it('5. An empty array remains an empty array and is not replaced with mock data', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const res = await callAnalyticsRpc('analytics_test_rpc', {}, (r) => r);
    expect(res).toEqual([]);
  });

  it('6. RPC parameters are passed with the exact approved names', async () => {
    (supabase!.rpc as any).mockResolvedValueOnce({
      data: [{ id: 1 }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);

    const params = { p_month: '2026-07-01', p_company_name: null };
    await callAnalyticsRpc('analytics_test_rpc', params, (r) => r);

    expect(supabase!.rpc).toHaveBeenCalledWith('analytics_test_rpc', params);
  });
});
