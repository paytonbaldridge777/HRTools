import { getWorker } from './config';
import { loadImage, validateImageFile } from './imageLoader';
import { extractCalendarBlocks } from './blockExtractor';
import { findHighlightedDates } from './dateDetector';
import { formatCalendarDates } from './dateFormatter';

export async function processCalendarImage(file: File): Promise<string> {
  try {
    validateImageFile(file);
    
    const worker = await getWorker();
    if (!worker) {
      throw new Error('Image processing system not initialized');
    }

    const image = await loadImage(file);
    
    // Process the image with optimized settings for calendar detection
    const { data } = await worker.recognize(image, {
      rectangle: { left: 0, top: 0, width: image.width, height: image.height },
    });

    if (!data.blocks || data.blocks.length === 0) {
      throw new Error('No calendar data detected in the image');
    }

    const blocks = extractCalendarBlocks(data.blocks);
    if (blocks.length === 0) {
      throw new Error('No valid calendar dates found in the image');
    }

    const highlightedDates = await findHighlightedDates(blocks);
    if (highlightedDates.length === 0) {
      throw new Error('No highlighted dates found in the calendar');
    }

    const formattedDates = formatCalendarDates(highlightedDates);
    if (!formattedDates) {
      throw new Error('Failed to format the detected dates');
    }

    return formattedDates;
  } catch (error) {
    console.error('Calendar processing error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process calendar image');
  }
}