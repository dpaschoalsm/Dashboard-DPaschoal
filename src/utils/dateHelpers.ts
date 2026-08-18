import { PeriodData } from '../types';

export interface ParsedDateInfo {
  year: number;
  month: number; // 0 to 11
  day: number;
  dateObj: Date;
  rawStr: string;
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES_PT = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  fev: 1,
  feb: 1,
  mar: 2,
  abr: 3,
  apr: 3,
  mai: 4,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  aug: 7,
  set: 8,
  sep: 8,
  out: 9,
  oct: 9,
  nov: 10,
  dez: 11,
  dec: 11,
};

/**
 * Parses a date string like "18/08", "08/07", "18-Aug", "08/07 a 05/08" into a Date object
 */
export function parsePeriodDate(dateStr: string, defaultYear = 2026): ParsedDateInfo | null {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // If it's a range like "08/07 a 05/08", take the end date or start date
  const rangeMatch = str.match(/(\d{1,2})[/-](\d{1,2})/);

  // Check format "DD/MM" or "DD/MM/YYYY"
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    let year = defaultYear;
    if (ddmmyyyy[3]) {
      year = parseInt(ddmmyyyy[3], 10);
      if (year < 100) year += 2000;
    }
    const d = new Date(year, month, day);
    return { year, month, day, dateObj: d, rawStr: str };
  }

  // Check format "18-Aug" or "06-jul" or "18/ago"
  const namedMonthMatch = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,4})/i);
  if (namedMonthMatch) {
    const day = parseInt(namedMonthMatch[1], 10);
    const key = namedMonthMatch[2].toLowerCase().slice(0, 3);
    const month = MONTH_MAP[key] ?? 7; // default Aug
    const d = new Date(defaultYear, month, day);
    return { year: defaultYear, month, day, dateObj: d, rawStr: str };
  }

  // Fallback regex for any DD/MM inside string
  if (rangeMatch) {
    const day = parseInt(rangeMatch[1], 10);
    const month = parseInt(rangeMatch[2], 10) - 1;
    const d = new Date(defaultYear, month, day);
    return { year: defaultYear, month, day, dateObj: d, rawStr: str };
  }

  return null;
}

/**
 * Formats a Date object to "ter., 1 de set." style like in hotel booking UI
 */
export function formatHotelDate(date: Date): string {
  const weekday = WEEKDAY_NAMES_PT[date.getDay()];
  const day = date.getDate();
  const monthName = MONTH_NAMES_PT[date.getMonth()].toLowerCase();
  const shortMonth = monthName.slice(0, 3) + '.';
  return `${weekday}, ${day} de ${shortMonth}`;
}

export function formatShortDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES_PT[monthIndex] || '';
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isBetweenDates(target: Date, start: Date, end: Date): boolean {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const min = Math.min(s, e);
  const max = Math.max(s, e);
  return t >= min && t <= max;
}

/**
 * Creates mapping from periodId to Date object, and vice versa
 */
export function mapPeriodsToDates(periods: PeriodData[]) {
  const periodDateList: { period: PeriodData; parsed: ParsedDateInfo; date: Date }[] = [];

  periods.forEach((p) => {
    const parsed = parsePeriodDate(p.data);
    if (parsed) {
      periodDateList.push({
        period: p,
        parsed,
        date: parsed.dateObj,
      });
    }
  });

  return periodDateList;
}
