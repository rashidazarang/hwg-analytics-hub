import { atom } from 'jotai';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';

// Global atom for shared date range across pages
// Use 'ytd' (365 days) as the default date range to show historical claims data
export const globalDateRangeAtom = atom<DateRange>(getPresetDateRange('ytd'));