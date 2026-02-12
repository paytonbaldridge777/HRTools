import React from 'react';

interface FormFieldProps {
  label: string;
  type: 'text' | 'number' | 'select';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  options?: { value: string | number; label: string }[];
}

export function FormField({
  label,
  type,
  value,
  onChange,
  placeholder,
  step,
  options,
}: FormFieldProps) {
  // Ensure value is converted to string for the input/select
  const stringValue = value?.toString() || '';

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {type === 'select' ? (
        <select
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className="input-field"
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value.toString()}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          className="input-field"
        />
      )}
    </div>
  );
}