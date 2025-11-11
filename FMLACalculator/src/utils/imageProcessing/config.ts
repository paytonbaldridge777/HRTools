import { createWorker, createScheduler } from 'tesseract.js';

let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
let scheduler: Awaited<ReturnType<typeof createScheduler>> | null = null;

export async function initializeWorker(): Promise<void> {
  try {
    if (!worker) {
      scheduler = await createScheduler();
      worker = await createWorker({
        logger: m => console.debug('Tesseract:', m),
        errorHandler: e => console.error('Tesseract error:', e)
      });
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '6'
      });
      if (scheduler) {
        await scheduler.addWorker(worker);
      }
      console.log('Tesseract worker initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Tesseract worker:', error);
    throw new Error('Image processing initialization failed');
  }
}

export async function getWorker() {
  if (!worker) {
    await initializeWorker();
  }
  return worker;
}

export async function terminateWorker(): Promise<void> {
  try {
    if (scheduler) {
      await scheduler.terminate();
      scheduler = null;
    }
    if (worker) {
      await worker.terminate();
      worker = null;
    }
  } catch (error) {
    console.error('Error terminating worker:', error);
  }
}