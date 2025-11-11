export interface CalendarDate {
  date: Date;
  isHighlighted: boolean;
  confidence: number;
}

export interface CalendarBlock {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  isHighlighted: boolean;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ProcessedCalendar {
  dates: CalendarDate[];
  text: string;
}

export interface CalendarRegion {
  month: number;
  year: number;
  startY: number;
  endY: number;
}