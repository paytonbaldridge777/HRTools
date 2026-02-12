export const MONTH_PATTERNS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
  'Jan\\.?', 'Feb\\.?', 'Mar\\.?', 'Apr\\.?', 'Jun\\.?',
  'Jul\\.?', 'Aug\\.?', 'Sep\\.?', 'Sept\\.?', 'Oct\\.?', 'Nov\\.?', 'Dec\\.?'
].join('|');

export const DATE_PATTERNS = [
  // Single date: "September 2, 2024"
  new RegExp(`(${MONTH_PATTERNS})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,.]?\\s+(\\d{4})`, 'gi'),
  
  // Date range: "November 28-29, 2024"
  new RegExp(`(${MONTH_PATTERNS})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[-–]\\s*(\\d{1,2})(?:st|nd|rd|th)?[,.]?\\s+(\\d{4})`, 'gi'),
  
  // Cross-month range: "December 24, 2024 - January 1, 2025"
  new RegExp(`(${MONTH_PATTERNS})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,.]?\\s+(\\d{4})\\s*[-–]\\s*(${MONTH_PATTERNS})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,.]?\\s+(\\d{4})`, 'gi')
];