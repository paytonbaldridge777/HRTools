import React, { useState, useEffect } from 'react';
import { Calculator, Info, Calendar } from 'lucide-react';
import { WorkdayData, CalculationResult } from '../types/workdays';
import { calculateWorkingDays } from '../utils/dateCalculations';
import { filterWorkLogs } from '../utils/excelProcessing';
import { ExcelUploader } from './ExcelUploader';
import { TimeOffFilters } from './TimeOffFilters';
import { CalculationResults } from './CalculationResults';
import { useAppStore } from '../store/useAppStore';
import holidaysJson from '../static/holidays.json';
import { APP_VERSION } from '../config/version';
import { eachDayOfInterval, isWithinInterval } from 'date-fns';
import { DateRangeSelector } from './DateRangeSelector';
import { formatHolidayDetails } from '../utils/holidayCalculations';
export function WorkdaysCalculator() {
  const {
    effectiveDate,
    workLogs,
    selectedFilters,
    setEffectiveDate,
    setWorkLogs,
    setSelectedFilters,
  } = useAppStore();

  const [hireDate, setHireDate] = useState<string | null>(
    localStorage.getItem('hireDate')
  );
  const [holidays, setHolidays] = useState(holidaysJson); // Initialize with static holidays
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [is12MonthsWorked, setIs12MonthsWorked] = useState<boolean | null>(
    null
  );
  const [is1250HoursWorked, setIs1250HoursWorked] = useState<boolean | null>(
    null
  );

  // Load updated holidays from local storage on mount
  useEffect(() => {
    const savedHolidays = localStorage.getItem('holidays');
    if (savedHolidays) {
      setHolidays(JSON.parse(savedHolidays));
      console.log('SavedLocal: ', savedHolidays);
    } else {
      // Default to the JSON file if no holidays exist in local storage
      setHolidays(holidaysJson);
      console.log('Set Default: ', holidaysJson);
    }
  }, []);

  useEffect(() => {
    if (hireDate) {
      localStorage.setItem('hireDate', hireDate);
    }
  }, [hireDate]);

  const filterLogsByYear = (
    logs: WorkdayData['workLogs'],
    effectiveDate: Date
  ) => {
    const oneYearAgo = new Date(effectiveDate);
    oneYearAgo.setFullYear(effectiveDate.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0); // Ensure start of the day
    effectiveDate.setHours(23, 59, 59, 999); // Ensure end of the day

    const filteredLogs = logs.filter((log) => {
      const logDate = new Date(log.date);
      if (isNaN(logDate.getTime())) {
        console.warn('Invalid date format detected:', log.date);
        return false;
      }

      const isWithinRange = logDate >= oneYearAgo && logDate <= effectiveDate;
      if (!isWithinRange) {
        console.log('Excluded Log (outside range):', log.date);
      }
      return isWithinRange;
    });

    console.log('Filtered logs:', filteredLogs); // Debug filtered logs clearly
    return filteredLogs;
  };

  const extractHolidaysInRange = (effectiveDate: Date): Date[] => {
    const startDate = new Date(effectiveDate);
    startDate.setFullYear(startDate.getFullYear() - 1); // Set to one year back
    startDate.setHours(0, 0, 0, 0);

    const holidayDates: Date[] = [];

    for (const yearHolidays of Object.values(holidays)) {
      for (const dateOrRange of Object.values(yearHolidays)) {
        if (typeof dateOrRange === 'string') {
          if (dateOrRange.includes('-')) {
            // Handle range
            const [start, end] = dateOrRange
              .split('-')
              .map((d) => new Date(d.trim()));
            console.log('Start Date =', start, 'End Date =', end); // Debugging range
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              console.warn('Invalid range detected:', dateOrRange); // Invalid range warning
              continue;
            }
            const datesInRange = eachDayOfInterval({ start, end }).filter(
              (date) =>
                isWithinInterval(date, { start: startDate, end: effectiveDate })
            );
            console.log('Dates in Range:', datesInRange); // Debugging range dates
            holidayDates.push(...datesInRange);
          } else {
            // Handle single date
            const holidayDate = new Date(dateOrRange);
            console.log('Single Date =', holidayDate); // Debugging single date
            if (isNaN(holidayDate.getTime())) {
              console.warn('Invalid single date detected:', dateOrRange); // Invalid single date warning
              continue;
            }
            if (
              isWithinInterval(holidayDate, {
                start: startDate,
                end: effectiveDate,
              })
            ) {
              holidayDates.push(holidayDate);
            }
          }
        } else if (Array.isArray(dateOrRange)) {
          // Handle array of ranges
          dateOrRange.forEach((range) => {
            if (range.includes('-')) {
              const [start, end] = range
                .split('-')
                .map((d) => new Date(d.trim()));
              console.log('Start Date =', start, 'End Date =', end); // Debugging range
              if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.warn('Invalid range detected in array:', range); // Invalid range warning
                return;
              }
              const datesInRange = eachDayOfInterval({ start, end }).filter(
                (date) =>
                  isWithinInterval(date, {
                    start: startDate,
                    end: effectiveDate,
                  })
              );
              console.log('Dates in Range from Array:', datesInRange); // Debugging array ranges
              holidayDates.push(...datesInRange);
            }
          });
        }
      }
    }

    console.log('Extracted Holidays:', holidayDates); // Final debugging log
    return holidayDates;
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!effectiveDate || !hireDate) {
        throw new Error('Please select both hire date and effective date.');
      }

      const effectiveDateObj = new Date(effectiveDate);
      const hireDateObj = new Date(hireDate);

      // Check 12 months eligibility
      const monthsWorked =
        (effectiveDateObj.getFullYear() - hireDateObj.getFullYear()) * 12 +
        effectiveDateObj.getMonth() -
        hireDateObj.getMonth();

      const workedFor12Months = monthsWorked >= 12;
      setIs12MonthsWorked(workedFor12Months);

      // Extract holidays within range
      const holidaysInRange = extractHolidaysInRange(effectiveDateObj);

      // First filter by the past year
      const logsWithinYear = filterLogsByYear(workLogs, effectiveDateObj);

      // Then filter logs by selected types (vacation, sick, etc.)
      const filteredLogs = filterWorkLogs(logsWithinYear, selectedFilters);

      const calculationResult = calculateWorkingDays({
        effectiveDate: effectiveDateObj,
        holidays: holidaysInRange,
        workLogs: filteredLogs,
      });

      // Explicitly add holiday details
      calculationResult.holidayDetails = formatHolidayDetails(
        holidaysInRange,
        new Date(
          effectiveDateObj.getFullYear() - 1,
          effectiveDateObj.getMonth(),
          effectiveDateObj.getDate()
        ),
        effectiveDateObj
      );

      // Check 1,250 hours eligibility
      const worked1250Hours = calculationResult.totalHoursWorked >= 1250;
      setIs1250HoursWorked(worked1250Hours);

      setResult(calculationResult);

      if (!workedFor12Months || !worked1250Hours) {
        setError(
          `Eligibility failed: ${
            !workedFor12Months ? 'Less than 12 months worked. ' : ''
          }${!worked1250Hours ? 'Less than 1,250 hours worked.' : ''}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-tamu-gray dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-tamu-maroon dark:text-red-400 flex items-center justify-center gap-2">
            <Calculator className="text-tamu-maroon dark:text-red-400" />
            FMLA Calculator
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-tamu-accent-blue dark:text-blue-400">
              Calculate working days for the past year from effective date
            </p>
            <span className="text-sm text-tamu-accent-blue/60 dark:text-blue-400/60 flex items-center gap-1">
              <Info size={14} />v{APP_VERSION}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6 mb-6">
          <h2 className="text-lg font-semibold text-tamu-maroon dark:text-red-400">Criteria</h2>
          <div className="flex gap-4">
            <div
              className={`p-4 flex-1 rounded-lg text-white text-center ${
                is12MonthsWorked === null
                  ? 'bg-gray-300 dark:bg-gray-600'
                  : is12MonthsWorked
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-red-500 dark:bg-red-600'
              }`}
            >
              12 Months Worked:{' '}
              {is12MonthsWorked === null
                ? ''
                : is12MonthsWorked
                ? 'Passed'
                : 'Failed'}
            </div>
            <div
              className={`p-4 flex-1 rounded-lg text-white text-center ${
                is1250HoursWorked === null
                  ? 'bg-gray-300 dark:bg-gray-600'
                  : is1250HoursWorked
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-red-500 dark:bg-red-600'
              }`}
            >
              1,250 Hours Worked:{' '}
              {is1250HoursWorked === null
                ? ''
                : is1250HoursWorked
                ? 'Passed'
                : 'Failed'}
            </div>
          </div>
        </div>

        <form onSubmit={handleCalculate} className="space-y-6">
          <h2 className="text-lg font-semibold text-tamu-maroon dark:text-red-400">Dates</h2>
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              {/* <label className="block">
                <span className="text-sm font-medium text-tamu-accent-blue">
                  Hire Date
                </span>
                <input
                  type="date"
                  value={hireDate || ''}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full px-4 py-2 mt-1 border rounded-lg border-tamu-grayDark focus:outline-none focus:ring-2 focus:ring-tamu-maroon"
                />
              </label> */}

              <DateRangeSelector
                effectiveDate={effectiveDate}
                hireDate={hireDate}
                onEffectiveDateChange={setEffectiveDate}
                onHireDateChange={setHireDate}
              />
            </div>
          </div>

          <ExcelUploader onWorkLogsProcessed={setWorkLogs} />

          <TimeOffFilters
            selectedFilters={selectedFilters}
            onFilterChange={setSelectedFilters}
          />

          {error && (
            <div className="bg-tamu-accent-red/10 dark:bg-red-900/20 border border-tamu-accent-red dark:border-red-700 text-tamu-accent-red dark:text-red-400 px-4 py-3 rounded-lg relative">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-tamu-maroon dark:bg-red-700 text-tamu-white py-3 px-6 rounded-lg hover:bg-tamu-maroonDark dark:hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator />
            Calculate Working Days
          </button>
        </form>

        {result && <CalculationResults result={result} />}
      </div>
    </div>
  );
}
