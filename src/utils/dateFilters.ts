/**
 * Canonical Date Filter Logic and Helper Functions
 */

export type PeriodMode = 'current_month' | 'previous_month' | 'custom';

// Format Date object to YYYY-MM-DD
export function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD string into a Date object at local start of day
export function parseDateIso(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Get first day of calendar month for a given date or date string (YYYY-MM-01)
export function getFirstDayOfMonth(dateOrStr: Date | string): string {
  const d = typeof dateOrStr === 'string' ? parseDateIso(dateOrStr) : new Date(dateOrStr);
  return formatDateIso(new Date(d.getFullYear(), d.getMonth(), 1));
}

// Get last day of calendar month for a given date or date string (YYYY-MM-DD)
export function getLastDayOfMonth(dateOrStr: Date | string): string {
  const d = typeof dateOrStr === 'string' ? parseDateIso(dateOrStr) : new Date(dateOrStr);
  // Setting day 0 of next month gets the last day of current month
  return formatDateIso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

// Get full current month range given a reference date (default = today/2026-08-10)
export function getCurrentMonthRange(referenceDate: Date | string = '2026-08-10'): {
  startDate: string;
  endDate: string;
} {
  const start = getFirstDayOfMonth(referenceDate);
  const end = getLastDayOfMonth(referenceDate);
  return { startDate: start, endDate: end };
}

// Get full previous calendar month range given a reference date
export function getPreviousMonthRange(referenceDate: Date | string = '2026-08-10'): {
  startDate: string;
  endDate: string;
} {
  const ref = typeof referenceDate === 'string' ? parseDateIso(referenceDate) : new Date(referenceDate);
  const prevMonthDate = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const start = getFirstDayOfMonth(prevMonthDate);
  const end = getLastDayOfMonth(prevMonthDate);
  return { startDate: start, endDate: end };
}

// Calculate effective available data window given selected start/end and latest available data date
export function calculateEffectiveWindow(
  selectedStartDate: string,
  selectedEndDate: string,
  latestAvailableDataDate: string
): {
  effectiveStartDate: string;
  effectiveEndDate: string;
} {
  const effectiveStartDate = selectedStartDate;
  // min(selectedEndDate, latestAvailableDataDate)
  const effectiveEndDate = selectedEndDate <= latestAvailableDataDate ? selectedEndDate : latestAvailableDataDate;

  return {
    effectiveStartDate,
    effectiveEndDate
  };
}

// Calculate previous comparable period for MTD growth comparisons
export function getPreviousComparableWindow(
  effectiveStartDate: string,
  effectiveEndDate: string
): {
  previousComparableStartDate: string;
  previousComparableEndDate: string;
} {
  const start = parseDateIso(effectiveStartDate);
  const end = parseDateIso(effectiveEndDate);

  // Previous month start
  const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const prevStartStr = formatDateIso(prevStart);

  // Previous month end - same day of month as effectiveEndDate, capped at last day of previous month
  const targetDay = end.getDate();
  const prevMonthLastDay = new Date(start.getFullYear(), start.getMonth(), 0).getDate(); // last day of prev month
  const cappedDay = Math.min(targetDay, prevMonthLastDay);

  const prevEnd = new Date(start.getFullYear(), start.getMonth() - 1, cappedDay);
  const prevEndStr = formatDateIso(prevEnd);

  return {
    previousComparableStartDate: prevStartStr,
    previousComparableEndDate: prevEndStr
  };
}

// Arabic Month Names
const ARABIC_MONTHS: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير',
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليو',
  8: 'أغسطس',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر'
};

const ENGLISH_MONTHS: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec'
};

// Format ISO date string into readable Arabic or English text
export function formatDateDisplay(dateStr: string, isAr: boolean = true): string {
  if (!dateStr) return '';
  const d = parseDateIso(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  if (isAr) {
    return `${day} ${ARABIC_MONTHS[month]} ${year}`;
  }
  return `${ENGLISH_MONTHS[month]} ${day}, ${year}`;
}

// Format Date Range into readable text (e.g. "1 أغسطس – 31 أغسطس 2026")
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
  } else {
    if (startMonth === endMonth && start.getFullYear() === endYear) {
      return `${ENGLISH_MONTHS[startMonth]} ${startDay} – ${endDay}, ${endYear}`;
    }
    return `${formatDateDisplay(startDateStr, false)} – ${formatDateDisplay(endDateStr, false)}`;
  }
}
