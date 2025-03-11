import React, { useState, useCallback, useEffect, useMemo } from 'react';
import TimeframeFilter, { TimeframeOption } from '@/components/filters/TimeframeFilter';
import InteractiveBarChart from '@/components/charts/InteractiveBarChart';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import KPICard from '@/components/metrics/KPICard';
import { DateRange } from '@/lib/dateUtils';
import { useSharedPerformanceData } from '@/hooks/useSharedPerformanceData';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from '@/components/layout/Dashboard';
import DealershipSearch from '@/components/search/DealershipSearch';
import { FileSignature, AlertTriangle, Clock, BarChart, CircleDollarSign, CheckSquare, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

// Custom KPI Section specifically for Performance page that shows all status types separately
const PerformanceKPISection: React.FC = () => {
  const { performanceData } = useSharedPerformanceData();
  
  // Check if we have any data yet
  const hasData = performanceData.data && performanceData.data.length > 0;
  
  // Get the totals from averages that are passed from usePerformanceMetricsData
  // This ensures values directly match the SQL query totals
  const totalPending = hasData ? performanceData.averages.pending : 0;
  const totalActive = hasData ? performanceData.averages.active : 0;
  const totalClaimable = hasData ? performanceData.averages.claimable : 0;
  const totalCancelled = hasData ? performanceData.averages.cancelled : 0;
  const totalVoid = hasData ? performanceData.averages.void : 0;
  const totalContracts = totalPending + totalActive + totalClaimable + totalCancelled + totalVoid;
  
  // Log the values for debugging
  console.log("[PERFORMANCE] KPI Totals:", {
    totalPending,
    totalActive,
    totalClaimable,
    totalCancelled,
    totalVoid,
    totalContracts,
    // Log this to compare with direct SQL results
    source: "Using direct values from performanceData.averages (not summing data points)"
  });
  
  // Show loading state if we don't have data yet
  const isLoading = !hasData;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 w-full mb-6 animate-fade-in">
      <KPICard
        title="Total Contracts"
        value={isLoading ? "..." : totalContracts.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Total contracts in selected period`}
        icon={CircleDollarSign}
        color="primary"
      />
      <KPICard
        title="Pending"
        value={isLoading ? "..." : totalPending.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Pending contracts`}
        icon={Clock}
        color="warning"
      />
      <KPICard
        title="Active"
        value={isLoading ? "..." : totalActive.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Active contracts`}
        icon={FileSignature}
        color="success"
      />
      <KPICard
        title="Claimable"
        value={isLoading ? "..." : totalClaimable.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Claimable contracts`}
        icon={CheckSquare}
        color="success"
      />
      <KPICard
        title="Cancelled"
        value={isLoading ? "..." : totalCancelled.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Cancelled contracts`}
        icon={AlertTriangle}
        color="destructive"
      />
      <KPICard
        title="Void"
        value={isLoading ? "..." : totalVoid.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Void contracts`}
        icon={XCircle}
        color="destructive"
      />
    </div>
  );
};

const PerformanceMetrics: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [dealerFilter, setDealerFilter] = useState<string>('');
  const [dealerName, setDealerName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  const { updatePerformanceData } = useSharedPerformanceData();
  const queryClient = useQueryClient();

  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    console.log(`[PERFORMANCE] Changing timeframe to ${newTimeframe}`);
    setTimeframe(newTimeframe);
    setPeriodOffset(0);
    
    // Clear selected date when manually changing timeframe
    if (selectedDate) {
      setSelectedDate(undefined);
    }
    
    // Invalidate cache to ensure fresh data with new timeframe
    queryClient.invalidateQueries(["performance-metrics"]);
    console.log('[PERFORMANCE] Invalidated query cache after timeframe change');
  }, [selectedDate, queryClient]);

  const handlePeriodChange = useCallback((newOffset: number) => {
    console.log(`[PERFORMANCE] Changing period offset to ${newOffset}`);
    setPeriodOffset(newOffset);
    
    // Invalidate cache for new period
    queryClient.invalidateQueries(["performance-metrics"]);
    console.log('[PERFORMANCE] Invalidated query cache after period change');
  }, [queryClient]);

  const handleDealershipSelect = useCallback((dealershipId: string, dealershipName: string) => {
    console.log(`[PERFORMANCE] Selected dealership: ID='${dealershipId}', Name='${dealershipName}'`);
    setDealerFilter(dealershipId);
    setDealerName(dealershipName);
    
    // Invalidate cache for new dealer filter
    queryClient.invalidateQueries(["performance-metrics"]);
    console.log('[PERFORMANCE] Invalidated query cache after dealer change');
  }, [queryClient]);

  // This is a dummy function that won't be used since we're removing the DateRangeFilter
  const handleDateRangeChange = useCallback((range: DateRange) => {
    console.log("[PERFORMANCE_DEBUG] Applying date range change:", range);
    // Apply the date range by adapting the timeframe and period as needed
    setSelectedDate(range.from);
    
    // Invalidate cache to ensure fresh data with new date range
    queryClient.invalidateQueries(["performance-metrics"]);
    console.log('[PERFORMANCE_DEBUG] Invalidated query cache after date range change');
  }, [queryClient]);

  // Use the new interface for fetching performance metrics data
  const { data, loading, error, startDate, endDate } = usePerformanceMetricsData({
    timeframe,
    offsetPeriods: periodOffset,
    dealerFilter,
    specificDate: selectedDate
  });

  // Use this key to track when data changes and needs to be processed for KPIs
  const statusFetchKey = useMemo(() => 
    `${timeframe}-${periodOffset}-${dealerFilter}-${data?.length || 0}-${selectedDate?.toISOString() || ''}`,
    [timeframe, periodOffset, dealerFilter, data?.length, selectedDate]
  );

  useEffect(() => {
    // Add error logging
    if (error) {
      console.error("[PERFORMANCE] Error occurred while fetching data:", error);
    }
        
    // Skip if loading or no data
    if (loading || !data) {
      return;
    }
        
    // Check for empty data
    if (data.length === 0) {
      console.log("[PERFORMANCE] No data returned for the selected period");
      // Update KPIs with empty data to reset previous values
      updatePerformanceData(
        [], 
        timeframe, 
        { from: startDate, to: endDate }, 
        dealerFilter,
        { pending: 0, active: 0, claimable: 0, cancelled: 0, void: 0 }
      );
      return;
    }
  
    // ADD THIS VERIFICATION CODE RIGHT HERE
    // Verify data consistency before calculating totals
    const verifyDataConsistency = () => {
      if (!data || data.length === 0) return true;
      
      // Calculate totals from data points
      const sumPending = data.reduce((sum, point) => sum + (point.pending || 0), 0);
      const sumActive = data.reduce((sum, point) => sum + (point.active || 0), 0);
      const sumClaimable = data.reduce((sum, point) => sum + (point.claimable || 0), 0);
      const sumCancelled = data.reduce((sum, point) => sum + (point.cancelled || 0), 0);
      const sumVoid = data.reduce((sum, point) => sum + (point.void || 0), 0);
      
      // Calculate total from value field
      const totalFromValues = data.reduce((sum, point) => sum + (point.value || 0), 0);
      
      // Calculate expected total
      const calculatedTotal = sumPending + sumActive + sumClaimable + sumCancelled + sumVoid;
      
      console.log('[PERFORMANCE_DEBUG] Data consistency check:', {
        dataPointTotals: {
          pending: sumPending,
          active: sumActive,
          claimable: sumClaimable,
          cancelled: sumCancelled,
          void: sumVoid,
          calculated: calculatedTotal
        },
        valueTotal: totalFromValues,
        match: calculatedTotal === totalFromValues ? 'YES' : 'NO ⚠️',
        dataPointCount: data.length
      });
      
      // Return true if consistent, false if inconsistent
      return calculatedTotal === totalFromValues;
    };
  
    // Call verification function
    const isDataConsistent = verifyDataConsistency();
    if (!isDataConsistent) {
      console.warn('[PERFORMANCE_DEBUG] ⚠️ Data inconsistency detected - chart values may not match KPIs!');
    }

    // Calculate totals from SQL data to display in KPI cards
    const calculateTotals = async () => {
      try {
        // Make a direct SQL query to get the actual totals from the database
        const { data: sqlTotals, error: sqlError } = await supabase.rpc('count_agreements_by_status', {
          from_date: startDate.toISOString(),
          to_date: endDate.toISOString(),
          dealer_uuid: dealerFilter || null
        });

        if (sqlError) {
          console.error("[PERFORMANCE] Error fetching SQL status totals:", sqlError);
          // Fall back to summing data points if SQL query fails
          const totalPending = data.reduce((sum, point) => sum + (point.pending || 0), 0);
          const totalActive = data.reduce((sum, point) => sum + (point.active || 0), 0);
          const totalClaimable = data.reduce((sum, point) => sum + (point.claimable || 0), 0);
          const totalCancelled = data.reduce((sum, point) => sum + (point.cancelled || 0), 0);
          const totalVoid = data.reduce((sum, point) => sum + (point.void || 0), 0);
          
          console.log("[PERFORMANCE] Using fallback values from data points:", { 
            totalPending, 
            totalActive,
            totalClaimable,
            totalCancelled,
            totalVoid,
            totalDataPoints: data.length,
            totalSum: totalPending + totalActive + totalClaimable + totalCancelled + totalVoid,
            source: "Fallback calculation from data points (SQL query failed)"
          });
          
          return {
            pending: totalPending || 0,
            active: totalActive || 0,
            claimable: totalClaimable || 0,
            cancelled: totalCancelled || 0,
            void: totalVoid || 0
          };
        }
        
        // Process SQL results
        if (sqlTotals && Array.isArray(sqlTotals)) {
          const pendingCount = Number(sqlTotals.find(s => s.status === 'PENDING')?.count) || 0;
          const activeCount = Number(sqlTotals.find(s => s.status === 'ACTIVE')?.count) || 0;
          const claimableCount = Number(sqlTotals.find(s => s.status === 'CLAIMABLE')?.count) || 0;
          const cancelledCount = Number(sqlTotals.find(s => s.status === 'CANCELLED')?.count) || 0;
          const voidCount = Number(sqlTotals.find(s => s.status === 'VOID')?.count) || 0;
          
          // Calculate the total
          const totalCount = pendingCount + activeCount + claimableCount + cancelledCount + voidCount;
          
          // Log the SQL-based totals for debugging comparison
          console.log("[PERFORMANCE] Status totals from direct SQL:", { 
            pendingCount, 
            activeCount,
            claimableCount,
            cancelledCount,
            voidCount,
            totalCount,
            source: "Direct SQL query via count_agreements_by_status",
            sqlResults: sqlTotals 
          });
          
          // Return the exact SQL totals
          return {
            pending: pendingCount,
            active: activeCount,
            claimable: claimableCount,
            cancelled: cancelledCount,
            void: voidCount
          };
        } else {
          console.error("[PERFORMANCE] SQL totals not in expected format:", sqlTotals);
          // Fall back to summing if SQL results are not valid
          const totalPending = data.reduce((sum, point) => sum + (point.pending || 0), 0);
          const totalActive = data.reduce((sum, point) => sum + (point.active || 0), 0);
          const totalClaimable = data.reduce((sum, point) => sum + (point.claimable || 0), 0);
          const totalCancelled = data.reduce((sum, point) => sum + (point.cancelled || 0), 0);
          const totalVoid = data.reduce((sum, point) => sum + (point.void || 0), 0);
          
          console.log("[PERFORMANCE] Using fallback values due to invalid SQL results:", { 
            totalPending, 
            totalActive,
            totalClaimable,
            totalCancelled,
            totalVoid,
            source: "Fallback calculation (invalid SQL result format)"
          });
          
          return {
            pending: totalPending || 0,
            active: totalActive || 0,
            claimable: totalClaimable || 0,
            cancelled: totalCancelled || 0,
            void: totalVoid || 0
          };
        }
      } catch (err) {
        console.error("[PERFORMANCE] Error calculating totals:", err);
        // Return zero values if calculation fails
        return {
          pending: 0,
          active: 0,
          claimable: 0,
          cancelled: 0,
          void: 0
        };
      }
    };
    
    // Update shared performance data with exact totals from SQL
    const updateKPIs = async () => {
      const statusTotals = await calculateTotals();
      const dateRangeForKPI = {
        from: startDate || new Date(),
        to: endDate || new Date()
      };
      
      // Log the actual update for debugging
      console.log(`[PERFORMANCE] Updating performance data for timeframe: ${timeframe}`, {
        statusTotals,
        dateRange: dateRangeForKPI,
        dataPoints: data.length
      });
      
      updatePerformanceData(
        data, 
        timeframe, 
        dateRangeForKPI, 
        dealerFilter,
        statusTotals
      );
    };
    
    updateKPIs();
    
  }, [statusFetchKey, startDate, endDate, data, updatePerformanceData, loading, dealerFilter, error, timeframe]);

  const timeframeSubnavbar = (
    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 w-full">
      <div className="sm:flex-1 flex justify-start">
        <div className="w-full sm:w-auto max-w-xs">
          <DealershipSearch 
            onDealershipSelect={handleDealershipSelect}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
      </div>
      <div className="flex justify-center items-center">
        <TimeframeFilter 
          selected={timeframe} 
          onChange={handleTimeframeChange}
        />
      </div>
    </div>
  );

  // Custom Dashboard component that doesn't show the DateRangeFilter
  return (
    <Dashboard
      onDateRangeChange={handleDateRangeChange}
      kpiSection={<PerformanceKPISection />}
      pageTitle="Performance Metrics"
      subnavbar={timeframeSubnavbar}
      hideDefaultDateFilter={true} // This prop will indicate to hide the DateRangeFilter
    >
      <div className="w-full">
        <InteractiveBarChart 
          data={data}
          timeframe={timeframe}
          isLoading={loading}
          onPeriodChange={handlePeriodChange}
          currentOffset={periodOffset}
          className="w-full"
          selectedDate={selectedDate}
          onDrilldown={(date, newTimeframe) => {
            console.log(`[PERFORMANCE] Drill down to ${newTimeframe} view for date: ${date.toISOString()}`);
            setTimeframe(newTimeframe);
            setSelectedDate(date);
            setPeriodOffset(0); // Reset period offset when drilling down
            
            // Invalidate cache for the drill down
            queryClient.invalidateQueries(["performance-metrics"]);
            console.log('[PERFORMANCE] Invalidated query cache after drill down');
          }}
        />
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mt-4">
            <p>Error loading data: {error.message}</p>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default PerformanceMetrics;