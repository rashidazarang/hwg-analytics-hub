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

// Custom KPI Section specifically for Performance page that shows all status types separately
const PerformanceKPISection: React.FC = () => {
  const { performanceData } = useSharedPerformanceData();
  
  // Check if we have any data yet
  const hasData = performanceData.data && performanceData.data.length > 0;
  
  // Get the summed totals rather than averages
  const totalPending = hasData ? performanceData.data.reduce((sum, point) => sum + point.pending, 0) : 0;
  const totalActive = hasData ? performanceData.data.reduce((sum, point) => sum + point.active, 0) : 0;
  const totalClaimable = hasData ? performanceData.data.reduce((sum, point) => sum + point.claimable, 0) : 0;
  const totalCancelled = hasData ? performanceData.data.reduce((sum, point) => sum + point.cancelled, 0) : 0;
  const totalVoid = hasData ? performanceData.data.reduce((sum, point) => sum + point.void, 0) : 0;
  const totalContracts = totalPending + totalActive + totalClaimable + totalCancelled + totalVoid;
  
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

  const handleTimeframeChange = useCallback((newTimeframe: TimeframeOption) => {
    console.log(`[PERFORMANCE] Changing timeframe to ${newTimeframe}`);
    setTimeframe(newTimeframe);
    setPeriodOffset(0);
    
    // Clear selected date when manually changing timeframe
    if (selectedDate) {
      setSelectedDate(undefined);
    }
  }, [selectedDate]);

  const handlePeriodChange = useCallback((newOffset: number) => {
    console.log(`[PERFORMANCE] Changing period offset to ${newOffset}`);
    setPeriodOffset(newOffset);
  }, []);

  const handleDealershipSelect = useCallback((dealershipId: string, dealershipName: string) => {
    console.log(`[PERFORMANCE] Selected dealership: ID='${dealershipId}', Name='${dealershipName}'`);
    setDealerFilter(dealershipId);
    setDealerName(dealershipName);
  }, []);

  // This is a dummy function that won't be used since we're removing the DateRangeFilter
  const handleDateRangeChange = useCallback((range: DateRange) => {
    console.log("[PERFORMANCE] Date range change called but ignored", range);
    // Intentionally not setting the date range as we're using timeframe selection instead
  }, []);

  // Use the new interface for fetching performance metrics data
  const { data, loading, error, startDate, endDate } = usePerformanceMetricsData({
    timeframe,
    offsetPeriods: periodOffset,
    dealerFilter,
    specificDate: selectedDate
  });

  // Use this key to track when data changes and needs to be processed for KPIs
  const statusFetchKey = useMemo(() => 
    `${timeframe}-${periodOffset}-${dealerFilter}-${data.length}`,
    [timeframe, periodOffset, dealerFilter, data.length]
  );

  useEffect(() => {
    if (loading || data.length === 0) {
      return;
    }

    // Calculate totals from data points to display in KPI cards
    // We want exact values, not averages, to match the chart
    const calculateTotals = () => {
      // Sum all status counts across all data points
      // This will match exactly what is shown in the chart
      const totalPending = data.reduce((sum, point) => sum + (point.pending || 0), 0);
      const totalActive = data.reduce((sum, point) => sum + (point.active || 0), 0);
      const totalClaimable = data.reduce((sum, point) => sum + (point.claimable || 0), 0);
      const totalCancelled = data.reduce((sum, point) => sum + (point.cancelled || 0), 0);
      const totalVoid = data.reduce((sum, point) => sum + (point.void || 0), 0);
      
      // Log the totals for debugging
      console.log("[PERFORMANCE] Status totals for KPI calculations:", { 
        totalPending, 
        totalActive,
        totalClaimable,
        totalCancelled,
        totalVoid,
        totalDataPoints: data.length,
        totalSum: totalPending + totalActive + totalClaimable + totalCancelled + totalVoid
      });
      
      // Return the exact totals, not averages, so KPIs match chart data exactly
      return {
        pending: totalPending,
        active: totalActive,
        claimable: totalClaimable,
        cancelled: totalCancelled,
        void: totalVoid
      };
    };
    
    // Update shared performance data with exact totals
    const statusTotals = calculateTotals();
    const dateRangeForKPI = {
      from: startDate,
      to: endDate
    };
    
    updatePerformanceData(
      data, 
      timeframe, 
      dateRangeForKPI, 
      dealerFilter,
      statusTotals
    );
    
  }, [statusFetchKey, startDate, endDate, data, updatePerformanceData, loading, dealerFilter]);

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