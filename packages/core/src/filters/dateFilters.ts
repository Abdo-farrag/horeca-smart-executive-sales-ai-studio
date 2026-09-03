/**
 * Canonical Date Filter Logic and Helper Functions
 */

export type { PeriodMode } from '../contracts/appTypes';

const CAIRO_TIME_ZONE = 'Africa/Cairo';

// Format Date object to YYYY-MM-DD in the runtime's local calendar.
export function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Resolve a real instant to its Cairo calendar date, avoiding host/browser timezone drift.
export function formatCairoDateIso(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

// Parse YYYY-MM-DD string into a Date object at local start of day
export function parseDateIso(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function normalizeCalendarReference(referenceDate: Date | string): string {
  return typeof referenceDate === 'string' ? referenceDate : formatCairoDateIso(referenceDate);
}

// Get first day of calendar month for a given date or date string (YYYY-MM-01)
export function getFirstDayOfMonth(dateOrStr: Date | string): string {
  const d = parseDateIso(normalizeCalendarReference(dateOrStr));
  return formatDateIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

// Get last day of calendar month for a given date or date string (YYYY-MM-DD)
export function getLastDayOfMonth(dateOrStr: Date | string): string {
  const d = parseDateIso(normalizeCalendarReference(dateOrStr));
  return formatDateIso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// Get full current calendar month. Runtime default is today's Cairo calendar date.
export function getCurrentMonthRange(referenceDate: Date | string = new Date()): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: getFirstDayOfMonth(referenceDate),
    endDate: getLastDayOfMonth(referenceDate)
  };
}

// Get full previous calendar month. Runtime default is today's Cairo calendar date.
export function getPreviousMonthRange(referenceDate: Date | string = new Date()): {
  startDate: string;
  endDate: string;
} {
  const ref = parseDateIso(normalizeCalendarReference(referenceDate));
  const prevMonthDate = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return {
    startDate: getFirstDayOfMonth(prevMonthDate),
    endDate: getLastDayOfMonth(prevMonthDate)
  };
}

// Calculate effective available data window given selected start/end and latest available data date
export function calculateEffectiveWindow(
  selectedStartDate: string,
  selectedEndDate: string,
  latestAvailableDataDate?: string | null
): {
  effectiveStartDate: string;
  effectiveEndDate: string;
} {
  const effectiveStartDate = selectedStartDate;
  const effectiveEndDate = latestAvailableDataDate
    ? (selectedEndDate <= latestAvailableDataDate ? selectedEndDate : latestAvailableDataDate)
    : selectedEndDate;

  return { effectiveStartDate, effectiveEndDate };
}

// Calculate previous comparable period for MTD growth comparisons.
// Calendar-month semantics: same elapsed day span in the previous calendar month.
export function getPreviousComparableWindow(
  effectiveStartDate: string,
  effectiveEndDate: string
): {
  previousComparableStartDate: string;
  previousComparableEndDate: string;
} {
  const start = parseDateIso(effectiveStartDate);
  const end = parseDateIso(effectiveEndDate);
  const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, start.getDate());
  const prevMonthLastDay = new Date(start.getFullYear(), start.getMonth(), 0).getDate();
  const targetDay = Math.min(end.getDate(), prevMonthLastDay);
  const prevEnd = new Date(start.getFullYear(), start.getMonth() - 1, targetDay);

  return {
    previousComparableStartDate: formatDateIso(prevStart),
    previousComparableEndDate: formatDateIso(prevEnd)
  };
}

const ARABIC_MONTHS: Record<number, string> = {
  1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل', 5: 'مايو', 6: 'يونيو',
  7: 'يوليو', 8: 'أغسطس', 9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر'
};

const ENGLISH_MONTHS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
};

export function formatDateDisplay(dateStr: string, isAr: boolean = true): string {
  if (!dateStr) return '';
  const d = parseDateIso(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return isAr ? `${day} ${ARABIC_MONTHS[month]} ${year}` : `${ENGLISH_MONTHS[month]} ${day}, ${year}`;
}

export function formatDateRangeDisplay(startDateStr: string, endDateStr: string, isAr: boolean = true): string {
  if (!startDateStr || !endDateStr) return '';
  const start = parseDateIso(startDateStr);
  const end = parseDateIso(endDateStr);
  const startDay = start.getDate();
  const startMonth = start.getMonth() + 1;
  const endDay = end.getDate();
  const endMonth = end.getMonth() + 1;
  const endYear = end.getFullYear();

  if (isAr) {
    if (startMonth === endMonth && start.getFullYear() === endYear) {
      return `${startDay} ${ARABIC_MONTHS[startMonth]} – ${endDay} ${ARABIC_MONTHS[endMonth]} ${endYear}`;
    }
    return `${formatDateDisplay(startDateStr, true)} – ${formatDateDisplay(endDateStr, true)}`;
  }
  if (startMonth === endMonth && start.getFullYear() === endYear) {
    return `${ENGLISH_MONTHS[startMonth]} ${startDay} – ${endDay}, ${endYear}`;
  }
  return `${formatDateDisplay(startDateStr, false)} – ${formatDateDisplay(endDateStr, false)}`;
}
