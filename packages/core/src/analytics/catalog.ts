import { readAnalyticsTable } from './client';
import { CatalogObject } from './types';

function normalizeCatalogObject(row: Record<string, unknown>): CatalogObject {
  return {
    objectName: String(row.object_name ?? ''),
    objectType: String(row.object_type ?? ''),
    domain: String(row.domain ?? ''),
    description: String(row.description ?? ''),
    status: String(row.status ?? ''),
    refreshFrequency: row.refresh_frequency ? String(row.refresh_frequency) : null,
    primaryKey: row.primary_key ? String(row.primary_key) : null,
    dateField: row.date_field ? String(row.date_field) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export const catalog = {
  async list(): Promise<CatalogObject[]> {
    return readAnalyticsTable('analytics_catalog', normalizeCatalogObject);
  },

  async get(objectName: string): Promise<CatalogObject | null> {
    const all = await this.list();
    const found = all.find((item) => item.objectName === objectName);
    return found || null;
  },

  async listByDomain(domain: string): Promise<CatalogObject[]> {
    const all = await this.list();
    return all.filter((item) => item.domain.toLowerCase() === domain.toLowerCase());
  },

  async listByStatus(status: string): Promise<CatalogObject[]> {
    const all = await this.list();
    return all.filter((item) => item.status.toLowerCase() === status.toLowerCase());
  },
};
