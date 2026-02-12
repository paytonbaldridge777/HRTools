import React from 'react';
import { Filter } from 'lucide-react';
import { TimeOffFilter } from '../types/workdays';

interface TimeOffFiltersProps {
  selectedFilters: TimeOffFilter[];
  onFilterChange: (filters: TimeOffFilter[]) => void;
}

export function TimeOffFilters({ selectedFilters, onFilterChange }: TimeOffFiltersProps) {
  const handleCheckboxChange = (filter: TimeOffFilter) => {
    if (filter === 'all') {
      onFilterChange(['all']);
    } else {
      const newFilters = selectedFilters.includes(filter)
        ? selectedFilters.filter(f => f !== filter)
        : [...selectedFilters.filter(f => f !== 'all'), filter];
      onFilterChange(newFilters.length ? newFilters : ['all']);
    }
  };

  return (
    <div className="bg-tamu-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-tamu-maroon">
        <Filter className="text-tamu-maroon" />
        Time Off Filters
      </h2>
      <div className="space-y-2">
        {(['all', 'sick', 'vacation'] as TimeOffFilter[]).map((filter) => (
          <label key={filter} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedFilters.includes(filter)}
              onChange={() => handleCheckboxChange(filter)}
              className="rounded border-tamu-grayDark text-tamu-maroon focus:ring-tamu-maroon"
            />
            <span className="text-sm font-medium text-tamu-accent-blue capitalize">{filter}</span>
          </label>
        ))}
      </div>
    </div>
  );
}