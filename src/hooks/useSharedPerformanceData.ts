import { atom, useAtom } from 'jotai';
import { PerformanceDataPoint } from './usePerformanceMetricsData';
import { TimeframeOption } from '@/components/filters/TimeframeFilter';
import { DateRange } from '@/lib/dateUtils';
import { useCallback } from 'react';

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
    // Validate that the data matches the averages before updating
    if (data && data.length > 0) {
      const sumPending = data.reduce((sum, point) => sum + (point.pending || 0), 0);
      const sumActive = data.reduce((sum, point) => sum + (point.active || 0), 0);
      const sumClaimable = data.reduce((sum, point) => sum + (point.claimable || 0), 0);
      const sumCancelled = data.reduce((sum, point) => sum + (point.cancelled || 0), 0);
      const sumVoid = data.reduce((sum, point) => sum + (point.void || 0), 0);
      
      console.log('[PERFORMANCE_DEBUG] updatePerformanceData validation:', {
        dataPointSums: {
          pending: sumPending,
          active: sumActive, 
          claimable: sumClaimable,
          cancelled: sumCancelled,
          void: sumVoid
        },
        providedAverages: averages,
        matchCheck: {
          pending: Math.abs(sumPending - averages.pending) <= 1 ? 'OK' : `MISMATCH (${sumPending} vs ${averages.pending})`,
          active: Math.abs(sumActive - averages.active) <= 1 ? 'OK' : `MISMATCH (${sumActive} vs ${averages.active})`,
          claimable: Math.abs(sumClaimable - averages.claimable) <= 1 ? 'OK' : `MISMATCH (${sumClaimable} vs ${averages.claimable})`,
          cancelled: Math.abs(sumCancelled - averages.cancelled) <= 1 ? 'OK' : `MISMATCH (${sumCancelled} vs ${averages.cancelled})`,
          void: Math.abs(sumVoid - averages.void) <= 1 ? 'OK' : `MISMATCH (${sumVoid} vs ${averages.void})`
        }
      });
    }
    
    setPerformanceData({
      data,
      timeframe,
      dateRange,
      dealerFilter,
      averages
    });
  };
  
  // Add validation function to check data consistency
  const validatePerformanceData = useCallback((data: PerformanceDataPoint[]) => {
    if (!data || data.length === 0) return true;
    
    // Calculate totals from all data points
    const totals = data.reduce((sums, point) => {
      return {
        pending: sums.pending + (point.pending || 0),
        active: sums.active + (point.active || 0),
        claimable: sums.claimable + (point.claimable || 0),
        cancelled: sums.cancelled + (point.cancelled || 0),
        void: sums.void + (point.void || 0)
      };
    }, { pending: 0, active: 0, claimable: 0, cancelled: 0, void: 0 });
    
    // Calculate overall total
    const calculatedTotal = totals.pending + totals.active + totals.claimable + totals.cancelled + totals.void;
    
    // Sum the pre-calculated values
    const reportedTotal = data.reduce((sum, point) => sum + (point.value || 0), 0);
    
    console.log('[PERFORMANCE_DEBUG] Data validation:', {
      calculatedTotal,
      reportedTotal,
      match: calculatedTotal === reportedTotal ? 'YES' : 'NO',
      totals
    });
    
    return calculatedTotal === reportedTotal;
  }, []);

  return {
    performanceData,
    updatePerformanceData,
    validatePerformanceData
  };
}