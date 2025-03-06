
import { atom, useAtom } from 'jotai';
import { PerformanceDataPoint } from './usePerformanceMetricsData';
import { TimeframeOption } from '@/components/filters/TimeframeFilter';

// Define atom to store shared performance data
const performanceDataAtom = atom<{
  data: PerformanceDataPoint[];
  timeframe: TimeframeOption;
  averages: {
    pending: number;
    active: number;
    cancelled: number;
  };
}>({
  data: [],
  timeframe: 'month',
  averages: {
    pending: 0,
    active: 0,
    cancelled: 0,
  }
});

export function useSharedPerformanceData() {
  const [performanceData, setPerformanceData] = useAtom(performanceDataAtom);

  const updatePerformanceData = (
    data: PerformanceDataPoint[],
    timeframe: TimeframeOption,
    averages: {
      pending: number;
      active: number;
      cancelled: number;
    }
  ) => {
    setPerformanceData({
      data,
      timeframe,
      averages
    });
  };

  return {
    performanceData,
    updatePerformanceData
  };
}
