
import { atom, useAtom } from 'jotai';
import { PerformanceDataPoint } from './usePerformanceMetricsData';
import { TimeframeOption } from '@/components/filters/TimeframeFilter';
import { DateRange } from '@/lib/dateUtils';

// Define atom to store shared performance data
const performanceDataAtom = atom<{
  data: PerformanceDataPoint[];
  timeframe: TimeframeOption;
  dateRange: DateRange;
  dealerFilter?: string;
  averages: {
    pending: number;
    active: number;
    claimable: number;
    cancelled: number;
    void: number;
  };
}>({
  data: [],
  timeframe: 'month',
  dateRange: {
    from: new Date(),
    to: new Date()
  },
  dealerFilter: '',
  averages: {
    pending: 0,
    active: 0,
    claimable: 0,
    cancelled: 0,
    void: 0,
  }
});

export function useSharedPerformanceData() {
  const [performanceData, setPerformanceData] = useAtom(performanceDataAtom);

  const updatePerformanceData = (
    data: PerformanceDataPoint[],
    timeframe: TimeframeOption,
    dateRange: DateRange,
    dealerFilter: string = '',
    averages: {
      pending: number;
      active: number;
      claimable: number;
      cancelled: number;
      void: number;
    }
  ) => {
    setPerformanceData({
      data,
      timeframe,
      dateRange,
      dealerFilter,
      averages
    });
  };

  return {
    performanceData,
    updatePerformanceData
  };
}
