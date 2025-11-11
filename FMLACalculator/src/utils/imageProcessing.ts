import { extractDatesFromImage } from './imageProcessing/dateExtractor';

export async function processHolidayImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file (PNG, JPEG, etc.)');
  }

  try {
    return await extractDatesFromImage(file);
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
}