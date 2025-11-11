import { CalculationResult } from '../types/workdays';
import { formatHolidayDetails } from '../utils/holidayCalculations';

interface CalculationResultsProps {
  result: CalculationResult & { holidayDetails: HolidayDetail[] };
}

export function CalculationResults({ result }: CalculationResultsProps) {
  console.log('Result Passed to UI:', result.holidayDetails); // Should log 15
  return (
    <div className="mt-8 bg-tamu-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-tamu-maroon">Results</h2>

      {/* Debug Information */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">
          Holiday Calculation Details
        </h3>
        <div className="space-y-4">
          <div className="space-y-1 text-blue-700">
            <p>Total Holidays in Range: {result.holidays}</p>
            <p>Total Days: {result.totalDays}</p>
            <p>Working Days: {result.workingDays}</p>
            <p>Holidays on Working Days: {result.holidaysOnWorkdays}</p>
            <p>Net Working Days: {result.netWorkingDays}</p>
            <p>Total Holiday Hours: {result.holidayHours}</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h4 className="font-medium text-blue-800 mb-2">Holiday Details:</h4>
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-3 py-2 text-left text-blue-700">Date</th>
              <th className="px-3 py-2 text-left text-blue-700">Holiday</th>
              <th className="px-3 py-2 text-left text-blue-700">Type</th>
            </tr>
          </thead>
          <tbody>
            {result.holidayDetails.map((holiday, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="px-3 py-2 text-blue-900">{holiday.date}</td>
                <td className="px-3 py-2 text-blue-900">
                  {holiday.formatted.split(' - ')[0]}
                </td>
                <td
                  className={`px-3 py-2 font-medium ${
                    holiday.isInRange
                      ? holiday.isWorkday
                        ? 'text-green-600'
                        : 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {!holiday.isInRange
                    ? 'Outside Range'
                    : holiday.isWorkday
                    ? 'Working Day'
                    : 'Weekend'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-tamu-gray rounded-lg">
          <h3 className="font-medium text-tamu-accent-blue">
            Total Hours Worked
          </h3>
          <p className="text-2xl font-bold text-tamu-maroon">
            {result.totalHoursWorked.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-tamu-gray rounded-lg">
          <h3 className="font-medium text-tamu-accent-blue">Holiday Hours</h3>
          <p className="text-2xl font-bold text-tamu-accent-orange">
            {result.holidayHours.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-tamu-gray rounded-lg">
          <h3 className="font-medium text-tamu-accent-blue">Sick Hours</h3>
          <p className="text-2xl font-bold text-tamu-accent-red">
            {result.sickHours.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-tamu-gray rounded-lg">
          <h3 className="font-medium text-tamu-accent-blue">Vacation Hours</h3>
          <p className="text-2xl font-bold text-tamu-accent-green">
            {result.vacationHours.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-tamu-gray rounded-lg">
          <h3 className="font-medium text-tamu-accent-blue">FMLA Hours</h3>
          <p className="text-2xl font-bold text-tamu-accent-blue">
            {result.fmlaHours.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-tamu-gray rounded-lg">
          <h3 className="font-medium text-tamu-accent-blue">Other Hours</h3>
          <p className="text-2xl font-bold text-tamu-accent-yellow">
            {result.otherHours.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-tamu-gray rounded-lg col-span-full">
          <h3 className="font-medium text-tamu-accent-blue">
            Total Days in Range
          </h3>
          <p className="text-2xl font-bold text-tamu-maroon">
            {result.totalDays}
          </p>
        </div>
      </div>
    </div>
  );
}
