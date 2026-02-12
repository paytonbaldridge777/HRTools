import { format } from 'date-fns';
import { CalendarDate } from './types';

export function formatCalendarDates(dates: CalendarDate[]): string {
  if (dates.length === 0) {
    return '';
  }

  return dates
    .filter(date => date.isHighlighted && date.confidence > 60)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ date }) => format(date, 'MMM. d, yyyy'))
    .join('\n');
}