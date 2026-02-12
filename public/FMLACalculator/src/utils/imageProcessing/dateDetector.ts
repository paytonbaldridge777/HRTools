import { CalendarBlock, CalendarDate } from './types';
import { detectMonthRegions } from './monthDetector';

export async function findHighlightedDates(blocks: CalendarBlock[]): Promise<CalendarDate[]> {
  const dates: CalendarDate[] = [];
  const monthRegions = detectMonthRegions(blocks);

  for (const block of blocks) {
    if (!block.isHighlighted) continue;

    const month = findMonthForBlock(block, monthRegions);
    if (month === null) continue;

    const day = parseInt(block.text, 10);
    if (isNaN(day) || day < 1 || day > 31) continue;

    // Use 2024 as the base year since we're processing FY2025 calendar
    const date = new Date(2024, month, day);
    
    dates.push({
      date,
      isHighlighted: true,
      confidence: block.confidence
    });
  }

  return dates;
}

function findMonthForBlock(
  block: CalendarBlock,
  monthRegions: Array<{ month: number; top: number; bottom: number }>
): number | null {
  const blockMiddle = (block.bbox.y0 + block.bbox.y1) / 2;

  const matchingRegion = monthRegions.find(
    region => blockMiddle >= region.top && blockMiddle <= region.bottom
  );

  return matchingRegion ? matchingRegion.month : null;
}