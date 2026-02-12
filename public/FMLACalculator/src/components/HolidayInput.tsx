import React from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { HolidayImageUploader } from './HolidayImageUploader';
import holidays from '../static/holidays.json';

interface HolidayInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function HolidayInput({ value, onChange }: HolidayInputProps) {
  const handleTextChange = (newValue: string) => {
    onChange(newValue);
  };

  const clearHolidays = () => {
    onChange('');
  };

  const addExampleHoliday = () => {
    const example =
      'Sept. 2, 2024\nNov. 28-29, 2024\nDec. 24, 2024 - Jan. 1, 2025';
    onChange(value ? `${value}\n${example}` : example);
  };

  const handleHolidaysExtracted = (holidays: string) => {
    if (holidays) {
      onChange(value ? `${value}\n${holidays}` : holidays);
    }
  };

  const handleError = (error: string) => {
    console.error('Holiday image processing error:', error);
  };

  return (
    <div className="bg-tamu-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-tamu-maroon">
        <Calendar className="text-tamu-maroon" />
        Holidays
      </h2>
      <div className="space-y-4">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">Year</th>
              <th className="border border-gray-300 px-4 py-2">Holiday</th>
              <th className="border border-gray-300 px-4 py-2">Date(s)</th>
              {/* <th className="border border-gray-300 px-4 py-2">Actions</th> */}
            </tr>
          </thead>
          <tbody>
            {Object.entries(holidays).map(([year, holidaySet]) =>
              Object.entries(holidaySet).map(([holiday, date]) => (
                <tr key={`${year}-${holiday}`}>
                  <td className="border border-gray-300 px-4 py-2">{year}</td>
                  <td className="border border-gray-300 px-4 py-2">
                    {holiday}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {Array.isArray(date) ? date.join(', ') : date}
                  </td>
                  {/* For not let's not allow deletion of dates */}
                  {/* <td className="border border-gray-300 px-4 py-2">
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded"
                      onClick={() => {
                        console.log(`Deleting holiday: ${holiday}`);
                      }}
                    >
                      Delete
                    </button>
                  </td> */}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addExampleHoliday}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-tamu-accent-blue hover:bg-tamu-gray rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Example
          </button>
          <button
            type="button"
            onClick={clearHolidays}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>

        <HolidayImageUploader
          onHolidaysExtracted={handleHolidaysExtracted}
          onError={handleError}
        />
      </div>
    </div>
  );
}
