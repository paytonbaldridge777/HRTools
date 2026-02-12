import { processCalendarImage } from './calendarProcessor';

export async function extractDatesFromImage(file: File): Promise<string> {
  try {
    // Process the calendar image and extract highlighted dates
    const dates = await processCalendarImage(file);
    
    if (!dates) {
      throw new Error(
        'No holidays found in the calendar. Please ensure dates are clearly highlighted.'
      );
    }

    return dates;
  } catch (error) {
    console.error('Date extraction error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract dates from calendar image.');
  }
}