export interface WorkdayData {
  effectiveDate: Date;
  holidays: Date[];
  workLogs?: WorkLog[];
  hoursPerDay?: number;
}

export interface WorkLog {
  date: Date;
  hours: number;
  type: 'sick' | 'vacation' | 'other' | 'fmla';
  status: string;
  typeDescription?: string;
}

export interface CalculationResult {
  totalDays: number;
  workingDays: number;
  holidays: number;
  holidaysOnWorkdays: number;  // Added this field
  holidayHours: number;
  netWorkingDays: number;
  totalHoursWorked: number;
  sickHours: number;
  vacationHours: number;
  otherHours: number;
  fmlaHours: number;
}