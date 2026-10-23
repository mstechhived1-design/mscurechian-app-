import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

/**
 * Normalizes common date-fns / standard tokens to dayjs-compatible tokens.
 * Handles yyyy -> YYYY, dd -> DD (day of month), etc.
 */
export const normalizeDayjsFormat = (formatStr: string): string => {
  if (!formatStr) return 'DD MMM YYYY';
  let normalized = formatStr;
  
  // yyyy -> YYYY 
  normalized = normalized.replace(/yyyy/g, 'YYYY');
  // yy -> YY (if not part of YYYY)
  normalized = normalized.replace(/(?<!Y)yy(?!Y)/g, 'YY');
  
  // If exactly 'dd', developer wants 2-digit day of month 'DD' (e.g. 19)
  if (normalized === 'dd') {
    return 'DD';
  }
  
  // Replace 'dd' with 'DD' if it's not part of ddd or dddd (e.g. 'dd MMM YYYY' -> 'DD MMM YYYY')
  normalized = normalized.replace(/(?<!d)dd(?!d)/g, 'DD');
  
  // 'PPPP' in date-fns is full localized date e.g. 'MMMM D, YYYY'
  normalized = normalized.replace(/PPPP/g, 'MMMM D, YYYY');

  return normalized;
};

/**
 * Safely format a date string or object, returning a fallback if invalid.
 * Prevents app crashes and normalizes token differences.
 */
export const safeFormat = (date: any, formatStr: string, fallback: string = '--'): string => {
  try {
    if (!date) return fallback;
    
    // Handle MongoDB $date object if present
    const dateToParse = (date && typeof date === 'object' && '$date' in date) ? date.$date : date;
    const dateObj = dayjs(dateToParse);
    
    if (!dateObj.isValid()) return fallback;
    
    const normalizedPattern = normalizeDayjsFormat(formatStr);
    return dateObj.format(normalizedPattern);
  } catch (error) {
    console.warn('[dateUtils] Error formatting date:', error);
    return fallback;
  }
};

/**
 * Formats appointment or transaction date + time consistently.
 */
export const formatTransactionDateTime = (
  date: any,
  time?: string,
  createdAt?: any
): { formattedDate: string; formattedTime: string; fullDateTime: string; monthYearKey: string } => {
  try {
    const dateToParse = (date && typeof date === 'object' && '$date' in date) ? date.$date : date;
    const dateObj = dayjs(dateToParse);
    const isValidDate = dateObj.isValid();

    let cleanTime = (time || '').trim();

    if (!cleanTime && createdAt) {
      const createdToParse = (createdAt && typeof createdAt === 'object' && '$date' in createdAt) ? createdAt.$date : createdAt;
      const createdObj = dayjs(createdToParse);
      if (createdObj.isValid()) {
        cleanTime = createdObj.format('hh:mm A');
      }
    }

    if (!cleanTime && isValidDate) {
      if (dateObj.hour() !== 0 || dateObj.minute() !== 0) {
        cleanTime = dateObj.format('hh:mm A');
      }
    }

    // Convert 24h format "14:30" to "02:30 PM" if needed
    if (cleanTime && /^\d{1,2}:\d{2}$/.test(cleanTime)) {
      const [h, m] = cleanTime.split(':');
      const hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      cleanTime = `${String(hour12).padStart(2, '0')}:${m} ${ampm}`;
    }

    const formattedDate = isValidDate ? dateObj.format('DD MMM YYYY') : '--';
    const monthYearKey = isValidDate ? dateObj.format('MMMM YYYY') : 'Recent';
    const fullDateTime = cleanTime ? `${formattedDate}, ${cleanTime}` : formattedDate;

    return {
      formattedDate,
      formattedTime: cleanTime || '',
      fullDateTime,
      monthYearKey,
    };
  } catch {
    return {
      formattedDate: '--',
      formattedTime: '',
      fullDateTime: '--',
      monthYearKey: 'Recent',
    };
  }
};

