import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

export async function processHolidaysPdf(file: File): Promise<Date[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const holidays: Date[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join(' ');
    
    // Simple date extraction (can be enhanced based on PDF format)
    const dateRegex = /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g;
    const matches = text.match(dateRegex);
    
    if (matches) {
      matches.forEach(match => {
        const date = new Date(match);
        if (!isNaN(date.getTime())) {
          holidays.push(date);
        }
      });
    }
  }

  return holidays;
}

export async function processVacationExcel(file: File): Promise<Date[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  const vacationDays: Date[] = [];
  
  data.forEach((row: any) => {
    // Assuming the Excel has a column named 'Date' or similar
    const dateValue = row['Date'] || row['date'] || row[Object.keys(row)[0]];
    if (dateValue) {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        vacationDays.push(date);
      }
    }
  });

  return vacationDays;
}