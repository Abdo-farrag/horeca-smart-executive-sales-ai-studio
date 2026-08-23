import { describe, it, expect } from 'vitest';
import { assertIsoDate, assertDateRange, normalizeMonthStart } from '../validation';
import { toFiniteNumber, toNullableFiniteNumber } from '../normalizers';
import { AnalyticsError } from '../errors';

describe('Validation Tests', () => {
  it('1. Valid ISO date is accepted', () => {
    expect(() => assertIsoDate('2026-07-01', 'startDate')).not.toThrow();
  });

  it('2. Invalid date format is rejected', () => {
    expect(() => assertIsoDate('2026/07/01', 'startDate')).toThrow(AnalyticsError);
    expect(() => assertIsoDate('01-07-2026', 'startDate')).toThrow(AnalyticsError);
    expect(() => assertIsoDate('invalid-date', 'startDate')).toThrow(AnalyticsError);
  });

  it('3. Impossible date such as 2026-02-31 is rejected', () => {
    expect(() => assertIsoDate('2026-02-31', 'startDate')).toThrow(AnalyticsError);
  });

  it('4. End date before start date is rejected', () => {
    expect(() => assertDateRange('2026-07-31', '2026-07-01')).toThrow(AnalyticsError);
    expect(() => assertDateRange('2026-07-01', '2026-07-31')).not.toThrow();
  });

  it('5. Numeric string is converted to a finite number', () => {
    expect(toFiniteNumber('123.45', 'sales')).toBe(123.45);
    expect(toFiniteNumber(500, 'sales')).toBe(500);
  });

  it('6. null, undefined, NaN, and nonnumeric strings are rejected for required numeric fields', () => {
    expect(() => toFiniteNumber(null, 'sales')).toThrow(AnalyticsError);
    expect(() => toFiniteNumber(undefined, 'sales')).toThrow(AnalyticsError);
    expect(() => toFiniteNumber(NaN, 'sales')).toThrow(AnalyticsError);
    expect(() => toFiniteNumber('abc', 'sales')).toThrow(AnalyticsError);
    expect(() => toFiniteNumber('', 'sales')).toThrow(AnalyticsError);
  });

  it('7. Optional numeric values may be normalized to null only when explicitly allowed', () => {
    expect(toNullableFiniteNumber(null, 'rate')).toBeNull();
    expect(toNullableFiniteNumber(undefined, 'rate')).toBeNull();
    expect(toNullableFiniteNumber('88.5', 'rate')).toBe(88.5);
    expect(() => toNullableFiniteNumber('invalid', 'rate')).toThrow(AnalyticsError);
  });
});
