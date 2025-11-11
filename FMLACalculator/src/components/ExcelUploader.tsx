import React from 'react';
import { Upload } from 'lucide-react';
import { WorkLog } from '../types/workdays';
import { processWorkLogsExcel } from '../utils/excelProcessing';

interface ExcelUploaderProps {
  onWorkLogsProcessed: (workLogs: WorkLog[]) => void;
}

export function ExcelUploader({ onWorkLogsProcessed }: ExcelUploaderProps) {
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workLogs = await processWorkLogsExcel(file);
      //console.log("Raw Rows from File:", file);
      onWorkLogsProcessed(workLogs);
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert(
        'Error processing Excel file. Please ensure it matches the expected format.'
      );
    }
  };

  return (
    <div className="bg-tamu-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-tamu-maroon">
        <Upload className="text-tamu-maroon" />
        Time Off Report
      </h2>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-tamu-accent-blue">
          Upload "Time Off" WorkDay Report as Excel File
        </label>
        <p className="text-sm text-tamu-accent-blue/80">
          Excel file should contain work hours in column D with status in column
          G
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="w-full px-4 py-2 rounded-lg border border-tamu-grayDark focus:outline-none focus:ring-2 focus:ring-tamu-maroon"
        />
      </div>
    </div>
  );
}
