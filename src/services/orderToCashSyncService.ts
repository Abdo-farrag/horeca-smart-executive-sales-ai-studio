import { supabase } from '../lib/supabase';

export type OtcSyncMode = 'dry_run' | 'sync';

export interface OtcSyncRequest {
  mode: OtcSyncMode;
  startDate: string;
  endDate: string;
  companyIds: number[];
}

export interface OtcSyncResult {
  success: boolean;
  mode?: OtcSyncMode;
  caller_role?: string;
  database?: string;
  start_date?: string;
  end_date?: string | null;
  deliveries_written?: number;
  returns_written?: number;
  invoice_lines_written?: number;
  writes_performed?: number;
  diagnostics?: Record<string, unknown>;
  error?: string;
}

export async function runOrderToCashSync(request: OtcSyncRequest): Promise<OtcSyncResult> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const { data, error } = await supabase.functions.invoke('sync-odoo18-order-to-cash', {
    body: {
      mode: request.mode,
      start_date: request.startDate,
      end_date: request.endDate,
      company_ids: request.companyIds,
    },
  });

  if (error) throw new Error(error.message || 'OTC_SYNC_FAILED');
  const result = (data ?? {}) as OtcSyncResult;
  if (!result.success) throw new Error(result.error || 'OTC_SYNC_FAILED');
  return result;
}
