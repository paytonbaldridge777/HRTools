import React, { useState, useEffect } from 'react';
import initialHolidays from '../static/holidays.json';

const HolidayManager = () => {
  const [holidays, setHolidays] = useState(initialHolidays);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Initialize holidays from local storage or JSON file
  useEffect(() => {
    const savedHolidays = localStorage.getItem('holidays');
    if (savedHolidays) {
      setHolidays(JSON.parse(savedHolidays));
    } else {
      // Populate local storage with default holidays if not already saved
      localStorage.setItem('holidays', JSON.stringify(initialHolidays));
      setHolidays(initialHolidays);
    }
  }, []);

  // Save holidays to local storage
  const saveHolidaysToLocalStorage = (updatedHolidays: typeof holidays) => {
    localStorage.setItem('holidays', JSON.stringify(updatedHolidays));
    console.log('Holidays updated in local storage.');
  };

  // Add a new holiday
  const addHoliday = () => {
    if (!newHolidayName || !newHolidayDate) {
      alert('Please fill out both the holiday name and date(s).');
      return;
    }

    const fiscalYear = determineFiscalYear(newHolidayDate);
    if (!fiscalYear) {
      alert('Invalid date format. Please enter a valid date or date range.');
      return;
    }

    const updatedHolidays = {
      ...holidays,
      [fiscalYear]: {
        ...(holidays[fiscalYear] || {}),
        [newHolidayName]: newHolidayDate,
      },
    };

    setHolidays(updatedHolidays);
    saveHolidaysToLocalStorage(updatedHolidays);

    // Reset input fields
    setNewHolidayName('');
    setNewHolidayDate('');
  };

  // Delete a holiday
  const deleteHoliday = (year: string, holidayName: string) => {
    const updatedHolidays = { ...holidays };
    delete updatedHolidays[year][holidayName];
    if (Object.keys(updatedHolidays[year]).length === 0) {
      delete updatedHolidays[year]; // Remove empty fiscal year
    }

    setHolidays(updatedHolidays);
    saveHolidaysToLocalStorage(updatedHolidays);
  };

  // Update a holiday
  const updateHoliday = (
    year: string,
    holidayName: string,
    newDate: string
  ) => {
    const updatedHolidays = {
      ...holidays,
      [year]: {
        ...holidays[year],
        [holidayName]: newDate,
      },
    };

    setHolidays(updatedHolidays);
    saveHolidaysToLocalStorage(updatedHolidays);
  };

  // Reset holidays to initial JSON file
  const resetHolidays = () => {
    setHolidays(initialHolidays);
    saveHolidaysToLocalStorage(initialHolidays);
    alert('Holidays reset to default TAMU holidays.');
  };

  // Determine Fiscal Year from a single date or date range
  const determineFiscalYear = (dateString: string): string | null => {
    try {
      const [start] = dateString.includes('-')
        ? dateString.split('-').map((d) => new Date(d.trim()))
        : [new Date(dateString.trim())];

      if (isNaN(start.getTime())) {
        return null;
      }

      const fiscalStartYear =
        start.getMonth() >= 9 ? start.getFullYear() + 1 : start.getFullYear();
      return `FY${fiscalStartYear}`;
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-tamu-gray">
      <div className="max-w-4xl mx-auto p-6 min-h-screen bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              className="bg-tamu-accent-blue text-white px-4 py-2 rounded-lg"
              onClick={resetHolidays}
            >
              Reset Holidays
            </button>
            <span className="text-sm text-gray-600">
              Resets dates to default TAMU holidays.
            </span>
          </div>
        </div>
        {Object.entries(holidays).map(([year, holidaySet]) => (
          <div key={year} className="mb-6">
            <h2 className="text-xl font-semibold mb-2">{year}</h2>
            <table className="table-auto w-full border-collapse border border-gray-300 mb-4">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2">Holiday</th>
                  <th className="border border-gray-300 px-4 py-2">Date(s)</th>
                  <th className="border border-gray-300 px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(holidaySet).map(([holiday, date]) => (
                  <tr key={`${year}-${holiday}`}>
                    <td className="border border-gray-300 px-4 py-2">
                      {holiday}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        className="w-full px-2 py-1 border border-gray-300"
                        value={date}
                        onChange={(e) =>
                          setHolidays((prev) => ({
                            ...prev,
                            [year]: {
                              ...prev[year],
                              [holiday]: e.target.value,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        className="bg-tamu-accent-red text-white px-2 py-1 rounded mr-2"
                        onClick={() => deleteHoliday(year, holiday)}
                      >
                        Delete
                      </button>
                      <button
                        className="bg-tamu-accent-blue text-white px-2 py-1 rounded"
                        onClick={() =>
                          updateHoliday(year, holiday, holidays[year][holiday])
                        }
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-4">
          <h3 className="text-md font-semibold text-tamu-maroon mb-2">
            Add New Holiday
          </h3>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Holiday Name"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="w-1/3 px-4 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Date(s) (e.g., 2024/07/07 or 2024/07/07-2024/07/10)"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-2/3 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={addHoliday}
              className="bg-tamu-maroon text-white px-4 py-2 rounded-lg"
            >
              Add Holiday
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayManager;
