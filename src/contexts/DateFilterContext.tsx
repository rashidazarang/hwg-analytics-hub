import { atom } from 'jotai';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';

// Global atom for shared date range across pages
export const globalDateRangeAtom = atom<DateRange>(getPresetDateRange('ytd'));