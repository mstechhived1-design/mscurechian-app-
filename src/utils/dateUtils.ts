import { format, isValid } from 'date-fns';

/**
 * Safely format a date string or object, returning a fallback if invalid.
 * Prevents app crashes from date-fns format() on invalid dates.
 */
export const safeFormat = (date: any, formatStr: string, fallback: string = '--'): string => {
  try {
    if (!date) return fallback;
    
    // Handle MongoDB $date object if present
    const dateToParse = date?.$date || date;
    const dateObj = new Date(dateToParse);
    
    if (!isValid(dateObj)) return fallback;
    
    return format(dateObj, formatStr);
  } catch (error) {
    console.warn('[dateUtils] Error formatting date:', error);
    return fallback;
  }
};
