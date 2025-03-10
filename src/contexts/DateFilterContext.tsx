import { atom } from 'jotai';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';

// Global atom for shared date range across pages
// Use 'mtd' (30 days) as the default date range instead of 'ytd' (full year)
export const globalDateRangeAtom = atom<DateRange>(getPresetDateRange('mtd'));