import { AnalyticsError } from './errors';

export function toFiniteNumber(value: unknown, fieldName: string): number {
  if (value === null || value === undefined || value === '') {
    throw new AnalyticsError({
      message: `Required numeric field '${fieldName}' is null, undefined, or empty`,
      code: 'ANALYTICS_INVALID_NUMBER',
    });
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num)) {
    throw new AnalyticsError({
      message: `Field '${fieldName}' is not a finite number: ${String(value)}`,
      code: 'ANALYTICS_INVALID_NUMBER',
    });
  }

  return num;
}

export function toNullableFiniteNumber(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === '') {
    throw new AnalyticsError({
      message: `Optional numeric field '${fieldName}' received empty string`,
      code: 'ANALYTICS_INVALID_NUMBER',
    });
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(num)) {
    throw new AnalyticsError({
      message: `Field '${fieldName}' is not a finite number: ${String(value)}`,
      code: 'ANALYTICS_INVALID_NUMBER',
    });
  }

  return num;
}
