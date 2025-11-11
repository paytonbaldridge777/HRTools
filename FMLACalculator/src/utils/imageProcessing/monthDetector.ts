import { CalendarBlock } from './types';

interface MonthRegion {
  month: number;
  top: number;
  bottom: number;
}

export function detectMonthRegions(blocks: CalendarBlock[]): MonthRegion[] {
  // Sort blocks by vertical position
  const sortedBlocks = [...blocks].sort((a, b) => a.bbox.y0 - b.bbox.y0);

  // Group blocks into rows based on vertical position
  const rows = groupBlocksIntoRows(sortedBlocks);

  // Create month regions
  // For FY2025 calendar, starting from September 2024
  const monthOrder = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]; // Sep to Aug
  
  return rows.map((row, index) => {
    const month = monthOrder[index % 12];
    const top = Math.min(...row.map(block => block.bbox.y0));
    const bottom = Math.max(...row.map(block => block.bbox.y1));

    return { month, top, bottom };
  });
}

function groupBlocksIntoRows(blocks: CalendarBlock[]): CalendarBlock[][] {
  const rows: CalendarBlock[][] = [];
  let currentRow: CalendarBlock[] = [];
  let lastY = -1;

  for (const block of blocks) {
    const blockMiddle = (block.bbox.y0 + block.bbox.y1) / 2;
    
    if (lastY === -1 || Math.abs(blockMiddle - lastY) < 30) {
      currentRow.push(block);
    } else {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [block];
    }
    lastY = blockMiddle;
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}