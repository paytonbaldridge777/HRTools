import { isValid, isDate } from 'date-fns';

export function isValidDate(date: unknown): date is Date {
  return isDate(date) && isValid(date);
}

export function validateDateComponents(
  date: Date,
  { year, month, day }: { year?: number; month?: number; day?: number }
): boolean {
  if (!isValidDate(date)) return false;

  return (
    (year === undefined || date.getUTCFullYear() === year) &&
    (month === undefined || date.getUTCMonth() === month) &&
    (day === undefined || date.getUTCDate() === day)
  );
}