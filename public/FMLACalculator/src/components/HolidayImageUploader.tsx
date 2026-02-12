import React, { useCallback, useState } from 'react';
import { ImagePlus, AlertCircle, Loader2 } from 'lucide-react';
import { processHolidayImage } from '../utils/imageProcessing';

interface HolidayImageUploaderProps {
  onHolidaysExtracted: (holidays: string) => void;
  onError: (error: string) => void;
}

export function HolidayImageUploader({ onHolidaysExtracted, onError }: HolidayImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const holidays = await processHolidayImage(file);
      onHolidaysExtracted(holidays);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  }, [onHolidaysExtracted, onError]);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <ImagePlus className="w-4 h-4 text-tamu-accent-blue" />
        <span className="text-sm font-medium text-tamu-accent-blue">Upload Calendar Image</span>
      </div>
      
      <div className="flex items-center justify-center w-full">
        <label className={`
          flex flex-col items-center justify-center w-full h-32 
          border-2 border-dashed rounded-lg cursor-pointer 
          ${isProcessing 
            ? 'border-tamu-accent-blue bg-tamu-accent-blue/5' 
            : 'border-tamu-grayDark bg-tamu-gray hover:bg-tamu-grayDark/10'
          } 
          transition-colors
        `}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
              <>
                <Loader2 className="w-8 h-8 mb-3 text-tamu-accent-blue animate-spin" />
                <p className="text-sm text-tamu-accent-blue">Processing calendar...</p>
              </>
            ) : (
              <>
                <ImagePlus className="w-8 h-8 mb-3 text-tamu-accent-blue" />
                <p className="mb-2 text-sm text-tamu-accent-blue">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-tamu-accent-blue/70">PNG, JPG, or JPEG (max 10MB)</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleImageUpload}
            disabled={isProcessing}
          />
        </label>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium">Tips for best results:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Use a clear, high-resolution image of the calendar</li>
              <li>Ensure holiday dates are clearly highlighted or marked</li>
              <li>Keep the calendar grid aligned and not skewed</li>
              <li>Include the full calendar page in the image</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}