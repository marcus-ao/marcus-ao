const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateOnlyParts = {
  day: number;
  month: number;
  year: number;
};

function createUtcDate({ day, month, year }: DateOnlyParts): Date {
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCFullYear(year);
  return value;
}

function createLocalDate({ day, month, year }: DateOnlyParts): Date {
  const value = new Date(year, month - 1, day);
  value.setFullYear(year);
  return value;
}

function getDateOnlyParts(match: RegExpExecArray): DateOnlyParts | null {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = createUtcDate({ day, month, year });

  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

export function toPostTimestamp(date?: string): number {
  return toPostDate(date)?.getTime() || 0;
}

export function toPostDate(date?: string): Date | null {
  if (!date) return null;

  const trimmed = date.trim();
  const dateOnlyMatch = dateOnlyPattern.exec(trimmed);

  if (dateOnlyMatch) {
    const dateOnlyParts = getDateOnlyParts(dateOnlyMatch);
    return dateOnlyParts ? createUtcDate(dateOnlyParts) : null;
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function formatPostDate(
  date: string | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!date) return '';

  const trimmed = date.trim();
  const dateOnlyMatch = dateOnlyPattern.exec(trimmed);
  const dateOnlyParts = dateOnlyMatch ? getDateOnlyParts(dateOnlyMatch) : null;

  if (dateOnlyMatch && !dateOnlyParts) {
    return trimmed;
  }

  const value = dateOnlyParts ? createLocalDate(dateOnlyParts) : new Date(trimmed);

  if (Number.isNaN(value.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat(locale, options).format(value);
}
