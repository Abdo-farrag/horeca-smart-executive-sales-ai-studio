import React, { useState } from 'react';
import { DatabaseZap, PlayCircle, RefreshCw } from 'lucide-react';
import { useAccess } from '../context/AccessContext';
import { runOrderToCashSync, type OtcSyncResult } from '../services/orderToCashSyncService';

const DEFAULT_START = '2026-06-01';
const today = () => new Date().toISOString().slice(0, 10);

export const OrderToCashSyncControl: React.FC<{ onSynced?: () => void }> = ({ onSynced }) => {
  const { profile } = useAccess();
  const [startDate, setStartDate] = useState(DEFAULT_START);
  const [endDate, setEndDate] = useState(today());
  const [running, setRunning] = useState<'dry_run' | 'sync' | null>(null);
  const [result, setResult] = useState<OtcSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = profile?.role === 'admin' || profile?.role === 'manager';
  if (!allowed) return null;

  const execute = async (mode: 'dry_run' | 'sync') => {
    setRunning(mode);
    setError(null);
    try {
      const next = await runOrderToCashSync({ mode, startDate, endDate, companyIds: [1, 2] });
      setResult(next);
      if (mode === 'sync') onSynced?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(null);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><DatabaseZap className="h-5 w-5 text-blue-600" />Data Sync Control</div>
          <p className="mt-1 text-xs text-slate-500">Authenticated Odoo → OTC snapshot sync. Dry Run performs diagnostics without writes.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-bold text-slate-500">From<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></label>
          <label className="text-[11px] font-bold text-slate-500">To<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" /></label>
          <button disabled={Boolean(running)} onClick={() => void execute('dry_run')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"><PlayCircle className="h-4 w-4" />Dry Run</button>
          <button disabled={Boolean(running)} onClick={() => void execute('sync')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${running === 'sync' ? 'animate-spin' : ''}`} />Sync Now</button>
        </div>
      </div>
      {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div> : null}
      {result ? <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><b>Status</b><br />{result.success ? 'Success' : 'Failed'}</div><div><b>Deliveries</b><br />{result.deliveries_written ?? result.writes_performed ?? 0}</div><div><b>Returns</b><br />{result.returns_written ?? 0}</div><div><b>Invoice Lines</b><br />{result.invoice_lines_written ?? 0}</div></div> : null}
    </section>
  );
};
