import { AnalyticsError } from './errors';

export function assertIsoDate(value: string, fieldName: string): void {
  if (typeof value !== 'string') {
    throw new AnalyticsError({
      message: `Invalid date for '${fieldName}': expected string, got ${typeof value}`,
      code: 'ANALYTICS_INVALID_INPUT',
    });
  }

  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(value)) {
    throw new AnalyticsError({
      message: `Invalid date format for '${fieldName}': '${value}'. Must be YYYY-MM-DD`,
      code: 'ANALYTICS_INVALID_INPUT',
    });
  }

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AnalyticsError({
      message: `Impossible or non-existent date for '${fieldName}': '${value}'`,
      code: 'ANALYTICS_INVALID_INPUT',
    });
  }
}

export function assertDateRange(startDate: string, endDate: string): void {
  assertIsoDate(startDate, 'startDate');
  assertIsoDate(endDate, 'endDate');

  if (endDate < startDate) {
    throw new AnalyticsError({
      message: `End date '${endDate}' cannot be earlier than start date '${startDate}'`,
      code: 'ANALYTICS_INVALID_INPUT',
    });
  }
}

export function normalizeMonthStart(value: string, fieldName: string): string {
  if (typeof value !== 'string' || !value) {
    throw new AnalyticsError({
      message: `Invalid month for '${fieldName}': expected non-empty string`,
      code: 'ANALYTICS_INVALID_INPUT',
    });
  }

  let formatted = value.trim();
  if (/^\d{4}-\d{2}$/.test(formatted)) {
    formatted = `${formatted}-01`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
    formatted = `${formatted.slice(0, 7)}-01`;
  } else {
    throw new AnalyticsError({
      message: `Invalid month format for '${fieldName}': '${value}'. Expected YYYY-MM or YYYY-MM-DD`,
      code: 'ANALYTICS_INVALID_INPUT',
    });
  }

  assertIsoDate(formatted, fieldName);
  return formatted;
}
