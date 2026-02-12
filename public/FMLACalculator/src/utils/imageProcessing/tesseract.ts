import { createWorker } from 'tesseract.js';

export async function extractTextFromImage(file: File): Promise<string> {
  try {
    const worker = await createWorker('eng');
    
    // Read the image file
    const imageData = await createImageData(file);
    
    // Recognize text
    const { data: { text } } = await worker.recognize(imageData);
    
    await worker.terminate();
    
    return text;
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to extract text from image. Please ensure the image is clear and contains readable text.');
  }
}

async function createImageData(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}