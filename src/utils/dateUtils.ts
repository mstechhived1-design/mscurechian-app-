import dayjs from 'dayjs';

/**
 * Safely format a date string or object, returning a fallback if invalid.
 * Prevents app crashes from dayjs format() on invalid dates.
 */
export const safeFormat = (date: any, formatStr: string, fallback: string = '--'): string => {
  try {
    if (!date) return fallback;
    
    // Handle MongoDB $date object if present
    const dateToParse = date?.$date || date;
    const dateObj = dayjs(dateToParse);
    
    if (!dateObj.isValid()) return fallback;
    
    return dateObj.format(formatStr);
  } catch (error) {
    console.warn('[dateUtils] Error formatting date:', error);
    return fallback;
  }
};
