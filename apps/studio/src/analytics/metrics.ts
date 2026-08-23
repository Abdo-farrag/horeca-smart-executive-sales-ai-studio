import { readAnalyticsTable } from './client';
import { MetricItem } from './types';

function normalizeMetricItem(row: Record<string, unknown>): MetricItem {
  return {
    metricCode: String(row.metric_code ?? ''),
    metricNameAr: String(row.metric_name_ar ?? ''),
    metricNameEn: String(row.metric_name_en ?? ''),
    domain: String(row.domain ?? ''),
    description: String(row.description ?? ''),
    status: String(row.status ?? ''),
    calculationFormula: row.calculation_formula ? String(row.calculation_formula) : null,
    unit: row.unit ? String(row.unit) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export const metrics = {
  async list(): Promise<MetricItem[]> {
    return readAnalyticsTable('business_metrics_dictionary', normalizeMetricItem);
  },

  async get(metricCode: string): Promise<MetricItem | null> {
    const all = await this.list();
    const found = all.find((item) => item.metricCode === metricCode);
    return found || null;
  },

  async listByStatus(status: string): Promise<MetricItem[]> {
    const all = await this.list();
    return all.filter((item) => item.status.toLowerCase() === status.toLowerCase());
  },
};
