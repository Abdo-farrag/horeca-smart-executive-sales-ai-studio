import { describe, it, expect } from 'vitest';
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getCurrentMonthRange,
  getPreviousMonthRange,
  calculateEffectiveWindow,
  getPreviousComparableWindow,
  formatDateDisplay,
  formatDateRangeDisplay
} from '../dateFilters';

describe('Canonical Date Filter Logic Tests', () => {
  const referenceToday = '2026-08-10';
  const latestAvailableDataDate = '2026-08-09';

  it('1. Selected Period vs Effective Window vs Previous Comparable for Current Month', () => {
    // Current month range for Aug 2026
    const selected = getCurrentMonthRange(referenceToday);
    expect(selected.startDate).toBe('2026-08-01');
    expect(selected.endDate).toBe('2026-08-31');

    // Effective Data Window when latest available data is 2026-08-09
    const effective = calculateEffectiveWindow(selected.startDate, selected.endDate, latestAvailableDataDate);
    expect(effective.effectiveStartDate).toBe('2026-08-01');
    expect(effective.effectiveEndDate).toBe('2026-08-09');

    // Previous comparable window for MTD growth
    const prevComparable = getPreviousComparableWindow(effective.effectiveStartDate, effective.effectiveEndDate);
    expect(prevComparable.previousComparableStartDate).toBe('2026-07-01');
    expect(prevComparable.previousComparableEndDate).toBe('2026-07-09');
  });

  it('2. 30-day month handling (e.g. September 2026)', () => {
    const range = getCurrentMonthRange('2026-09-15');
    expect(range.startDate).toBe('2026-09-01');
    expect(range.endDate).toBe('2026-09-30');
    expect(getLastDayOfMonth('2026-09-01')).toBe('2026-09-30');
  });

  it('3. 31-day month handling (e.g. August 2026)', () => {
    const range = getCurrentMonthRange('2026-08-10');
    expect(range.startDate).toBe('2026-08-01');
    expect(range.endDate).toBe('2026-08-31');
    expect(getLastDayOfMonth('2026-08-01')).toBe('2026-08-31');
  });

  it('4. February non-leap year (e.g. Feb 2026)', () => {
    const range = getCurrentMonthRange('2026-02-14');
    expect(range.startDate).toBe('2026-02-01');
    expect(range.endDate).toBe('2026-02-28');
    expect(getLastDayOfMonth('2026-02-01')).toBe('2026-02-28');
  });

  it('5. Leap-year February (e.g. Feb 2024)', () => {
    const range = getCurrentMonthRange('2024-02-14');
    expect(range.startDate).toBe('2024-02-01');
    expect(range.endDate).toBe('2024-02-29');
    expect(getLastDayOfMonth('2024-02-01')).toBe('2024-02-29');
  });

  it('6. Month transition (e.g. from 2026-08-31 to 2026-09-01)', () => {
    const augustRange = getCurrentMonthRange('2026-08-31');
    expect(augustRange.startDate).toBe('2026-08-01');
    expect(augustRange.endDate).toBe('2026-08-31');

    const septemberRange = getCurrentMonthRange('2026-09-01');
    expect(septemberRange.startDate).toBe('2026-09-01');
    expect(septemberRange.endDate).toBe('2026-09-30');
  });

  it('7. Latest data catches up to today or end of month', () => {
    const selected = getCurrentMonthRange('2026-08-10');
    // When August 10 data arrives
    const effectiveDay10 = calculateEffectiveWindow(selected.startDate, selected.endDate, '2026-08-10');
    expect(effectiveDay10.effectiveStartDate).toBe('2026-08-01');
    expect(effectiveDay10.effectiveEndDate).toBe('2026-08-10');

    // When month is complete (data through Aug 31)
    const effectiveFull = calculateEffectiveWindow(selected.startDate, selected.endDate, '2026-08-31');
    expect(effectiveFull.effectiveStartDate).toBe('2026-08-01');
    expect(effectiveFull.effectiveEndDate).toBe('2026-08-31');

    const prevComparableFull = getPreviousComparableWindow(effectiveFull.effectiveStartDate, effectiveFull.effectiveEndDate);
    expect(prevComparableFull.previousComparableStartDate).toBe('2026-07-01');
    expect(prevComparableFull.previousComparableEndDate).toBe('2026-07-31');
  });

  it('8. Completed historical month (e.g. Previous Month selected in August)', () => {
    const selectedPrev = getPreviousMonthRange('2026-08-10');
    expect(selectedPrev.startDate).toBe('2026-07-01');
    expect(selectedPrev.endDate).toBe('2026-07-31');

    const effective = calculateEffectiveWindow(selectedPrev.startDate, selectedPrev.endDate, '2026-08-09');
    expect(effective.effectiveStartDate).toBe('2026-07-01');
    expect(effective.effectiveEndDate).toBe('2026-07-31');

    const prevComparable = getPreviousComparableWindow(effective.effectiveStartDate, effective.effectiveEndDate);
    expect(prevComparable.previousComparableStartDate).toBe('2026-06-01');
    expect(prevComparable.previousComparableEndDate).toBe('2026-06-30');
  });

  it('9. Custom dates preserve exact user selection and restrict query window if future', () => {
    const customStart = '2026-06-15';
    const customEnd = '2026-07-20';
    const effective = calculateEffectiveWindow(customStart, customEnd, '2026-08-09');
    expect(effective.effectiveStartDate).toBe('2026-06-15');
    expect(effective.effectiveEndDate).toBe('2026-07-20');

    // Future custom range extending past latest data
    const futureCustomStart = '2026-08-01';
    const futureCustomEnd = '2026-08-25';
    const effectiveFuture = calculateEffectiveWindow(futureCustomStart, futureCustomEnd, '2026-08-09');
    expect(effectiveFuture.effectiveStartDate).toBe('2026-08-01');
    expect(effectiveFuture.effectiveEndDate).toBe('2026-08-09');
  });

  it('10. Formatting displays correctly according to UI guidelines', () => {
    expect(formatDateDisplay('2026-08-09', true)).toBe('9 أغسطس 2026');
    expect(formatDateRangeDisplay('2026-08-01', '2026-08-31', true)).toBe('1 أغسطس – 31 أغسطس 2026');
    expect(formatDateRangeDisplay('2026-08-01', '2026-08-31', false)).toBe('Aug 1 – 31, 2026');
  });
});
