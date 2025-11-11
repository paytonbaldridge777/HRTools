import { getWorker } from './config';
import { loadImage, validateImageFile } from './imageLoader';

export async function extractTextFromImage(file: File): Promise<string> {
  try {
    validateImageFile(file);
    
    const worker = await getWorker();
    if (!worker) {
      throw new Error('Image processing system not initialized.');
    }

    const image = await loadImage(file);
    const { data: { text } } = await worker.recognize(image);

    if (!text.trim()) {
      throw new Error('No text found in the image. Please ensure the image contains readable text.');
    }

    console.log('Successfully extracted text from image');
    return text;
  } catch (error) {
    console.error('Text extraction error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract text from image.');
  }
}