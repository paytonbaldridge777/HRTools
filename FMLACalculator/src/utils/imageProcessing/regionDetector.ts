import { CalendarBlock, CalendarRegion } from './types';

export function detectCalendarRegions(blocks: CalendarBlock[]): CalendarRegion[] {
  const regions: CalendarRegion[] = [];
  const currentYear = new Date().getFullYear();
  
  // Sort blocks by vertical position
  const sortedBlocks = [...blocks].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  
  // Group blocks into rows based on vertical position
  const rows = groupBlocksIntoRows(sortedBlocks);
  
  // Create regions for each month
  rows.forEach((row, index) => {
    if (index < 12) { // Maximum 12 months
      regions.push({
        month: index,
        year: currentYear,
        startY: Math.min(...row.map(block => block.bbox.y0)),
        endY: Math.max(...row.map(block => block.bbox.y1))
      });
    }
  });

  return regions;
}

function groupBlocksIntoRows(blocks: CalendarBlock[]): CalendarBlock[][] {
  const rows: CalendarBlock[][] = [];
  let currentRow: CalendarBlock[] = [];
  let lastY = -1;
  
  blocks.forEach(block => {
    if (lastY === -1 || Math.abs(block.bbox.y0 - lastY) < 20) {
      currentRow.push(block);
    } else {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [block];
    }
    lastY = block.bbox.y0;
  });
  
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  return rows;
}