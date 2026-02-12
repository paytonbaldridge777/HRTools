import React from 'react';
import { Calendar } from 'lucide-react';
import { format, sub } from 'date-fns';

interface DateRangeSelectorProps {
  effectiveDate: string;
  hireDate: string | null;
  onEffectiveDateChange: (date: string) => void;
  onHireDateChange: (date: string) => void;
}

export function DateRangeSelector({
  effectiveDate,
  hireDate,
  onEffectiveDateChange,
  onHireDateChange,
}: DateRangeSelectorProps) {
  const startDate = effectiveDate
    ? format(sub(new Date(effectiveDate), { days: 364 }), 'yyyy-MM-dd')
    : '';

  return (
    <div className="bg-tamu-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-tamu-maroon">
        <Calendar className="text-tamu-maroon" />
        Dates
      </h2>
      <div>
        <label className="block text-sm font-medium text-tamu-accent-blue">
          Select Hire Date
        </label>
        <input
          type="date"
          value={hireDate || ''}
          onChange={(e) => onHireDateChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border-tamu-grayDark shadow-sm focus:border-tamu-maroon focus:ring-tamu-maroon"
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-tamu-accent-blue">
          Select Effective Date
        </label>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => onEffectiveDateChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border-tamu-grayDark shadow-sm focus:border-tamu-maroon focus:ring-tamu-maroon"
        />
        {effectiveDate && (
          <p className="mt-2 text-sm text-tamu-accent-blue">
            Date Range: {startDate} to {effectiveDate}
          </p>
        )}
      </div>
    </div>
  );
}
