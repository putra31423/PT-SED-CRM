const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Makassar";

export interface PeriodDates {
  startDate?: string;
  endDate?: string;
}

export interface BoundedPeriodDates {
  startDate: string;
  endDate: string;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function businessTimeZone(): string {
  return process.env.BUSINESS_TIME_ZONE?.trim() || DEFAULT_BUSINESS_TIME_ZONE;
}

function calendarDate(now: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: businessTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function asUtcDate({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDays(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
}

export function getBusinessToday(now = new Date()): string {
  return formatDate(asUtcDate(calendarDate(now)));
}

export function getBusinessYear(now = new Date()): number {
  return calendarDate(now).year;
}

/**
 * Returns inclusive date boundaries using the configured business timezone.
 * Calendar arithmetic is then performed in UTC so a server's own timezone
 * (local WITA versus Vercel UTC) cannot move a date across midnight.
 */
export function getPeriodDates(
  period = "this_month",
  now = new Date(),
): PeriodDates {
  const current = calendarDate(now);
  const today = asUtcDate(current);
  const todayText = formatDate(today);

  switch (period) {
    case "today":
      return { startDate: todayText, endDate: todayText };
    case "yesterday": {
      const yesterday = formatDate(shiftDays(today, -1));
      return { startDate: yesterday, endDate: yesterday };
    }
    case "this_week": {
      const weekStart = shiftDays(today, -today.getUTCDay());
      return { startDate: formatDate(weekStart), endDate: todayText };
    }
    case "this_month":
      return {
        startDate: formatDate(
          new Date(Date.UTC(current.year, current.month - 1, 1)),
        ),
        endDate: todayText,
      };
    case "last_month":
      return {
        startDate: formatDate(
          new Date(Date.UTC(current.year, current.month - 2, 1)),
        ),
        endDate: formatDate(
          new Date(Date.UTC(current.year, current.month - 1, 0)),
        ),
      };
    case "quarter": {
      const quarterStartMonth = Math.floor((current.month - 1) / 3) * 3;
      return {
        startDate: formatDate(
          new Date(Date.UTC(current.year, quarterStartMonth, 1)),
        ),
        endDate: todayText,
      };
    }
    case "year":
      return { startDate: `${current.year}-01-01`, endDate: todayText };
    case "all_time":
      return {};
    default:
      return getPeriodDates("this_month", now);
  }
}

export function getBoundedPeriodDates(
  period = "this_month",
  now = new Date(),
): BoundedPeriodDates {
  const selected = getPeriodDates(period, now);
  if (selected.startDate && selected.endDate) {
    return { startDate: selected.startDate, endDate: selected.endDate };
  }

  const fallback = getPeriodDates("this_month", now);
  return {
    startDate: fallback.startDate!,
    endDate: fallback.endDate!,
  };
}
