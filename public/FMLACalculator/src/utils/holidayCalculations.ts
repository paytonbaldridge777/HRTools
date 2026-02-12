import * as holidaysJson from '../static/holidays.json';

export interface HolidayDetail {
  formatted: string;
  name: string;
  date: string;
  isInRange: boolean;
  isWorkday: boolean;
}

export function formatHolidayDetails(
  holidayDates: Date[],
  startDate: Date,
  endDate: Date
): HolidayDetail[] {
  const holidayNameMap: Record<string, string> = {};

  Object.entries(holidaysJson).forEach(([year, yearHolidays]) => {
    Object.entries(yearHolidays).forEach(([name, dateOrRange]) => {
      if (typeof dateOrRange === 'string') {
        if (dateOrRange.includes('-')) {
          const [start, end] = dateOrRange
            .split('-')
            .map((d) => new Date(d.trim()));
          for (
            let dt = new Date(start);
            dt <= end;
            dt.setDate(dt.getDate() + 1)
          ) {
            holidayNameMap[new Date(dt).toISOString().split('T')[0]] = name;
          }
        } else {
          holidayNameMap[new Date(dateOrRange).toISOString().split('T')[0]] =
            name;
        }
      } else if (Array.isArray(dateOrRange)) {
        dateOrRange.forEach((range) => {
          if (range.includes('-')) {
            const [start, end] = range
              .split('-')
              .map((d) => new Date(d.trim()));
            for (
              let dt = new Date(start);
              dt <= end;
              dt.setDate(dt.getDate() + 1)
            ) {
              holidayNameMap[new Date(dt).toISOString().split('T')[0]] = name;
            }
          }
        });
      }
    });
  });

  console.log('Holiday Name Map:', holidayNameMap); // Debugging holiday names mapping

  const details = holidayDates.map((holidayDate) => {
    const formattedDate = holidayDate.toISOString().split('T')[0];
    const name = holidayNameMap[formattedDate] || 'Unknown Holiday';

    console.log('Mapping:', formattedDate, 'to', name); // Verify date-to-name matching

    return {
      formatted: `${name} - ${holidayDate.toLocaleDateString()}`,
      date: formattedDate,
      isInRange: holidayDate >= startDate && holidayDate <= endDate,
      isWorkday: holidayDate.getDay() !== 0 && holidayDate.getDay() !== 6,
    };
  });

  console.log('Final Holiday Details:', details); // Check final results

  return details;
}
