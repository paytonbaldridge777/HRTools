import { CalendarBlock } from './types';

interface RawBlock {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words?: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

export function extractCalendarBlocks(blocks: RawBlock[]): CalendarBlock[] {
  return blocks
    .filter(block => {
      const text = block.text.trim();
      const isNumber = /^\d{1,2}$/.test(text);
      const day = parseInt(text, 10);
      return isNumber && day >= 1 && day <= 31 && block.confidence > 60;
    })
    .map(block => ({
      text: block.text.trim(),
      confidence: block.confidence,
      bbox: block.bbox,
      isHighlighted: isBlockHighlighted(block)
    }));
}

function isBlockHighlighted(block: RawBlock): boolean {
  // Check if the block or its words have a yellow background
  const hasHighlightedWords = block.words?.some(word => 
    word.confidence > 60 && hasYellowBackground(word)
  );

  return hasHighlightedWords || hasYellowBackground(block);
}

function hasYellowBackground(element: { bbox: { x0: number; y0: number; x1: number; y1: number } }): boolean {
  // In the TAMU calendar, holidays are highlighted in yellow
  // This is a simplified check - you might need to adjust based on the actual image
  const { x0, y0, x1, y1 } = element.bbox;
  
  // Check if the element's position corresponds to a highlighted cell
  // You might need to adjust these values based on the actual calendar layout
  return (x1 - x0 > 20) && (y1 - y0 > 20);
}