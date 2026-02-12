import {
  format,
  isWeekend,
  isWithinInterval,
  eachDayOfInterval,
  sub,
} from 'date-fns';
import { WorkdayData, CalculationResult } from '../types/workdays';
import { HolidayDetail } from './holidayCalculations';

const DEFAULT_HOURS_PER_DAY = 8;

export function calculateWorkingDays(
  data: WorkdayData
): CalculationResult & { holidayDetails: HolidayDetail[] } {
  const hoursPerDay = data.hoursPerDay || DEFAULT_HOURS_PER_DAY;
  const startDate = sub(new Date(data.effectiveDate), { days: 364 });
  const totalDays = 365;

  // Generate all dates in the range
  const dateRange = eachDayOfInterval({
    start: startDate,
    end: new Date(data.effectiveDate),
  });

  // Calculate total working days (exclude weekends)
  const workingDays = dateRange.filter((date) => !isWeekend(date)).length;

  // Calculate holidays on working days
  const holidaysOnWorkdays = data.holidays.filter(
    (holiday) => !isWeekend(holiday)
  ).length;

  console.log('Total Working Days (All Non-Weekend Days):', workingDays); // Debug
  console.log('Holidays on Working Days:', holidaysOnWorkdays); // Debug

  // Calculate net working days
  const netWorkingDays = workingDays - holidaysOnWorkdays;

  // Initialize hour counters
  let sickHours = 0;
  let vacationHours = 0;
  let fmlaHours = 0;
  let otherHours = 0;

  // Process work logs
  if (data.workLogs) {
    console.log('Total logs:', data.workLogs.length); // Debug
    data.workLogs.forEach((log) => {
      //console.log('Processing Log:', log); // Debug

      if (log.status === 'Approved') {
        // Only process approved logs
        const typeLowerCase = log.type?.toLowerCase() || '';

        if (typeLowerCase.includes('fmla')) {
          // FMLA Time Off
          fmlaHours += log.hours;
        } else if (typeLowerCase.includes('sick')) {
          // Sick Leave
          sickHours += log.hours;
        } else if (typeLowerCase.includes('vacation')) {
          // Vacation
          vacationHours += log.hours;
        } else {
          // Any other type goes to "otherHours"
          otherHours += log.hours;
        }
      }
    });
  }

  console.log('Sick Hours:', sickHours); // Debug
  console.log('Vacation Hours:', vacationHours); // Debug
  console.log('FMLA Hours:', fmlaHours); // Debug
  console.log('Other Hours:', otherHours); // Debug

  return {
    totalDays,
    workingDays, // All working days
    netWorkingDays, // Working days minus holidays
    holidays: data.holidays.length,
    holidaysOnWorkdays,
    holidayHours: holidaysOnWorkdays * hoursPerDay,
    totalHoursWorked:
      netWorkingDays * hoursPerDay - (sickHours + vacationHours),
    sickHours,
    vacationHours,
    otherHours,
    fmlaHours,
    holidayDetails: [], // Placeholder
  };
}

// Function to validate if the provided input is a valid Date object
export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};
