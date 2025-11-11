import * as XLSX from 'xlsx';
import { WorkLog } from '../types/workdays';

// WE need to ensure dates are in proper format
export function excelDateToJSDate(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30); // Excel starts counting from 1900-01-01 (with a leap year bug)
  const jsDate = new Date(excelEpoch.getTime() + serial * 86400000);
  return jsDate;
}

export async function processWorkLogsExcel(file: File): Promise<WorkLog[]> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = (event) => {
      try {
        const binaryData = event.target?.result as string;
        const workbook = XLSX.read(binaryData, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Parse all rows as arrays
        const allRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }); // Array of arrays
        console.log('All Rows:', allRows); // Debugging raw rows

        if (allRows.length < 2) {
          throw new Error(
            'File does not contain enough rows for headers and data.'
          );
        }

        // Use the second row as the header
        const headerRow = allRows[1] as string[]; // Explicitly define type as string[]
        const dataRows = allRows.slice(2); // Data starts after the second row

        // Map the data rows into objects using the header row
        const parsedRows = dataRows.map((row) => {
          const rowData: Record<string, any> = {};
          headerRow.forEach((header, index) => {
            rowData[header] = row[index];
          });
          return rowData;
        });

        console.log('Parsed Rows:', parsedRows); // Debugging parsed rows

        // Process the work logs
        const workLogs: WorkLog[] = parsedRows.map((row) => {
          const type = row['Type'] || ''; // Ensure no undefined Type

          return {
            date: excelDateToJSDate(row['Date']), // Convert date to Date object
            type: type.includes('FMLA')
              ? 'fmla'
              : type.toLowerCase().includes('sick')
              ? 'sick'
              : type.toLowerCase().includes('vacation')
              ? 'vacation'
              : 'other',
            hours: parseFloat(row['Requested']) || 0, // Handle missing or invalid hours
            status: row['Status'] || 'Unknown', // Fallback to 'Unknown' if status is missing
            comment: row['Comment'] || '', // Handle missing comments
          };
        });

        console.log('Processed Work Logs:', workLogs); // Debugging processed work logs
        resolve(workLogs);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);

    reader.readAsBinaryString(file);
  });
}

export function filterWorkLogs(
  workLogs: WorkLog[],
  filters: string[]
): WorkLog[] {
  if (filters.includes('all')) return workLogs;

  return workLogs.filter((log) =>
    filters.some((filter) => log.type === filter)
  );
}
