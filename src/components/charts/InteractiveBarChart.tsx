import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps, Legend } from 'recharts';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PerformanceDataPoint } from '@/hooks/usePerformanceMetricsData';
import { cn } from '@/lib/utils';
import { TimeframeOption } from '@/components/filters/TimeframeFilter';

interface InteractiveBarChartProps {
  data: PerformanceDataPoint[];
  timeframe: TimeframeOption;
  isLoading: boolean;
  onPeriodChange: (offset: number) => void;
  currentOffset: number;
  className?: string;
  // Add new props for drilldown functionality
  onDrilldown?: (date: Date, newTimeframe: TimeframeOption) => void;
  selectedDate?: Date; // For highlighting a selected bar
}

const CHART_COLORS = {
  pending: '#F8B427',   // Yellow/Orange
  active: '#4CAF50',    // Green
  claimable: '#8BC34A', // Light Green
  cancelled: '#FF6961', // Red
  void: '#FF8A65'       // Orange/Red
};

// Define CustomTooltip as a proper component with access to props
const CustomTooltip = ({ active, payload, label, externalTimeframe }: TooltipProps<number, string> & { externalTimeframe?: TimeframeOption }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as PerformanceDataPoint;
    
    let formattedDate, tooltipContent;
    
    // Detect if this is a month date point by checking if it's the first day of a month
    const isMonthView = format(dataPoint.rawDate, 'd') === '1';
    
    if (isMonthView) {
      formattedDate = format(dataPoint.rawDate, 'MMMM yyyy');
    } else {
      formattedDate = format(dataPoint.rawDate, 'MMM d, yyyy');
    }
    
    // Calculate totals to ensure tooltip displays exactly the same data as bars
    // Add defensive programming with null/undefined checks
    const pendingCount = dataPoint.pending || 0;
    const activeCount = dataPoint.active || 0;
    const claimableCount = dataPoint.claimable || 0;
    const cancelledCount = dataPoint.cancelled || 0;
    const voidCount = dataPoint.void || 0;
    
    // Calculate the sum of all status counts - this should match the total value
    const calculatedTotal = pendingCount + activeCount + claimableCount + cancelledCount + voidCount;
    
    // The displayed total should always be the sum of individual status counts
    const totalValue = calculatedTotal;
    
    // Verify that our calculated total matches the dataPoint value
    // This is especially important for Day view where we need accurate counts
    if (calculatedTotal !== (dataPoint.value || 0)) {
      console.warn("[PERFORMANCE] Mismatch detected: Tooltip total does not match total agreements count.");
      console.warn(`[PERFORMANCE] Calculated: ${calculatedTotal}, Provided: ${dataPoint.value || 0}`);
    }
    
    // Use the external timeframe prop or fallback to a default
    const currentTimeframe = externalTimeframe || 'month';
    
    // For Day view, show a slightly different UI to highlight the separate status counts
    const isDayView = currentTimeframe === 'day';
    
    tooltipContent = (
      <>
        <p className="text-primary font-medium">Total Agreements: {totalValue.toLocaleString()}</p>
        <div className="mt-2 text-sm space-y-1">
          <p className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.pending}}></span>
            Pending: {pendingCount.toLocaleString()}
          </p>
          <p className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.active}}></span>
            Active: {activeCount.toLocaleString()}
          </p>
          <p className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.claimable}}></span>
            Claimable: {claimableCount.toLocaleString()}
          </p>
          <p className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.cancelled}}></span>
            Cancelled: {cancelledCount.toLocaleString()}
          </p>
          <p className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.void}}></span>
            Void: {voidCount.toLocaleString()}
          </p>
        </div>
        {isDayView && (
          <div className="mt-2 text-xs text-gray-500">
            Each bar represents a different contract status
          </div>
        )}
        {!isDayView && (
          <div className="mt-2 text-xs text-gray-500">
            Click to view detailed breakdown
          </div>
        )}
      </>
    );
    
    return (
      <div className="bg-white p-4 shadow-md rounded-md border border-gray-100">
        <p className="font-semibold">{formattedDate}</p>
        {tooltipContent}
      </div>
    );
  }

  return null;
};

const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  data,
  timeframe,
  isLoading,
  onPeriodChange,
  currentOffset,
  className = '',
  onDrilldown,
  selectedDate,
}) => {
  const [chartWidth, setChartWidth] = React.useState<number>(0);
  const [animationKey, setAnimationKey] = useState<string>(`${timeframe}-${currentOffset}`);
  const [prevData, setPrevData] = useState<PerformanceDataPoint[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const averageValue = useMemo(() => {
    if (!data || data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / data.length);
  }, [data]);

  const handlePrevious = useCallback(() => {
    onPeriodChange(currentOffset - 1);
  }, [currentOffset, onPeriodChange]);

  const handleNext = useCallback(() => {
    onPeriodChange(currentOffset + 1);
  }, [currentOffset, onPeriodChange]);
  
  // Handle drilldown when clicking on a bar
  const handleBarClick = useCallback((data: any, index: number) => {
    if (!onDrilldown || !data || !data.activePayload || data.activePayload.length === 0) return;
    
    const dataPoint = data.activePayload[0].payload as PerformanceDataPoint;
    const date = dataPoint.rawDate;
    
    console.log('[PERFORMANCE] Bar clicked:', {
      date: date.toISOString(),
      timeframe: timeframe || 'month',
      dataPoint
    });
    
    // Use a safe timeframe value with a default
    const safeTimeframe = timeframe || 'month';
    
    // Determine which view to transition to based on current timeframe
    switch(safeTimeframe) {
      case 'year':
      case '6months':
        // Drill down to month view when clicking on a month in year/6months view
        console.log('[PERFORMANCE] Drilling down from year/6months to month view for:', format(date, 'MMM yyyy'));
        onDrilldown(date, 'month');
        break;
      case 'month':
        // Drill down to day view when clicking on a day in month view
        console.log('[PERFORMANCE] Drilling down from month view to day view for:', format(date, 'MMM d, yyyy'));
        onDrilldown(date, 'day');
        break;
      case 'week':
        // Drill down to day view when clicking on a day in week view
        console.log('[PERFORMANCE] Drilling down from week view to day view for:', format(date, 'MMM d, yyyy'));
        onDrilldown(date, 'day');
        break;
      // No drilldown from day view
      case 'day':
        console.log('[PERFORMANCE] Already at day view, no further drill down');
        break;
      default:
        console.log('[PERFORMANCE] Unknown timeframe:', safeTimeframe);
        break;
    }
  }, [timeframe, onDrilldown]);

  useEffect(() => {
    if (data && data.length > 0) {
      setIsTransitioning(true);
      setPrevData(data);
      
      const newKey = `${timeframe}-${currentOffset}-${Date.now()}`;
      setAnimationKey(newKey);
      
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
      
      return () => clearTimeout(timer);
    }
  }, [timeframe, currentOffset, data]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      if (containerRef.current) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  const getDateRange = useCallback(() => {
    if (data.length === 0) return { dateRange: "" };
    
    const firstDate = data[0].rawDate;
    const lastDate = data[data.length - 1].rawDate;
    
    let dateRange = "";
    
    // Use a safe timeframe value with a default
    const safeTimeframe = timeframe || 'month';
    
    switch (safeTimeframe) {
      case 'week':
        dateRange = `${format(firstDate, 'MMM d')} - ${format(lastDate, 'MMM d, yyyy')}`;
        break;
      case 'month':
        dateRange = `${format(firstDate, 'MMM d')} - ${format(lastDate, 'MMM d, yyyy')}`;
        break;
      case '6months':
        // Always show exact month range for 6 months view
        const firstMonth = firstDate.getMonth();
        const year = firstDate.getFullYear();
        
        // Check if we're showing Jan-Jun or Jul-Dec
        if (firstMonth === 0) { // January = first half of year
          dateRange = `Jan - Jun ${year}`;
        } else if (firstMonth === 6) { // July = second half of year
          dateRange = `Jul - Dec ${year}`;
        } else {
          // Fallback, though we should always have properly aligned date ranges now
          dateRange = `${format(firstDate, 'MMM')} - ${format(lastDate, 'MMM')} ${year}`;
        }
        break;
      case 'year':
        dateRange = `Jan - Dec ${format(firstDate, 'yyyy')}`;
        break;
      default:
        dateRange = "";
    }
    
    return { dateRange };
  }, [data, timeframe]);

  const { dateRange } = getDateRange();

  const CustomLegend = () => (
    <div className="flex flex-wrap justify-center items-center gap-4 mt-2 mb-4">
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.pending}}></span>
        <span className="text-sm text-gray-600">Pending</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.active}}></span>
        <span className="text-sm text-gray-600">Active</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.claimable}}></span>
        <span className="text-sm text-gray-600">Claimable</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.cancelled}}></span>
        <span className="text-sm text-gray-600">Cancelled</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-3 h-3 mr-2 rounded-sm" style={{backgroundColor: CHART_COLORS.void}}></span>
        <span className="text-sm text-gray-600">Void</span>
      </div>
    </div>
  );

  return (
    <div className={cn("bg-white p-5 rounded-xl shadow-sm border border-gray-100 chart-container", className)} ref={containerRef}>
      <div className="flex flex-col mb-2">
        <p className="text-lg text-gray-500 mt-1 font-medium">{dateRange}</p>
      </div>
      
      <CustomLegend />
      
      <div className="h-[300px] w-full">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" key={animationKey}>
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 20,
              }}
              className={cn("animate-fade-in", isTransitioning ? "opacity-100" : "")}
              onClick={handleBarClick}
              // BarChart defaults to vertical layout, which is what we want
              barCategoryGap={(timeframe || 'month') === 'day' ? '20%' : '10%'} // More space between categories for day view
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12, fill: '#8E9196' }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 5, right: 5 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#8E9196' }}
                tickFormatter={(value) => value === 0 ? '0' : value.toLocaleString()}
                domain={[0, 'auto']}
                width={30}
              />
              <Tooltip content={<CustomTooltip externalTimeframe={timeframe} />} cursor={{ fill: 'rgba(249, 115, 22, 0.1)' }} />
              
              {(timeframe || 'month') === 'day' ? (
                // For day view, display each status as a separate non-stacked bar
                // Each contract status has its own individual bar
                <>
                  <Legend />
                  <Bar 
                    dataKey="pending" 
                    name="Pending" 
                    fill={CHART_COLORS.pending}  
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                    animationDuration={600}
                    animationBegin={0}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="active" 
                    name="Active" 
                    fill={CHART_COLORS.active}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                    animationDuration={600}
                    animationBegin={100}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="claimable" 
                    name="Claimable" 
                    fill={CHART_COLORS.claimable}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                    animationDuration={600}
                    animationBegin={200}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="cancelled" 
                    name="Cancelled" 
                    fill={CHART_COLORS.cancelled}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                    animationDuration={600}
                    animationBegin={300}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="void" 
                    name="Void" 
                    fill={CHART_COLORS.void}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                    animationDuration={600}
                    animationBegin={400}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                </>
              ) : (
                // For other views, use stacked bars with all statuses clearly represented
                <>
                  <Bar 
                    dataKey="pending" 
                    name="Pending" 
                    stackId="a"
                    fill={CHART_COLORS.pending}  
                    radius={[0, 0, 0, 0]}
                    maxBarSize={(timeframe || 'month') === 'week' ? 45 : (timeframe || 'month') === 'month' ? 18 : 30}
                    animationDuration={600}
                    animationBegin={0}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="active"
                    name="Active" 
                    stackId="a" 
                    fill={CHART_COLORS.active}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={(timeframe || 'month') === 'week' ? 45 : (timeframe || 'month') === 'month' ? 18 : 30}
                    animationDuration={600}
                    animationBegin={100}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="claimable"
                    name="Claimable" 
                    stackId="a" 
                    fill={CHART_COLORS.claimable}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={(timeframe || 'month') === 'week' ? 45 : (timeframe || 'month') === 'month' ? 18 : 30}
                    animationDuration={600}
                    animationBegin={150}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="cancelled"
                    name="Cancelled" 
                    stackId="a" 
                    fill={CHART_COLORS.cancelled}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={(timeframe || 'month') === 'week' ? 45 : (timeframe || 'month') === 'month' ? 18 : 30}
                    animationDuration={600}
                    animationBegin={200}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                  <Bar 
                    dataKey="void"
                    name="Void" 
                    stackId="a" 
                    fill={CHART_COLORS.void}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={(timeframe || 'month') === 'week' ? 45 : (timeframe || 'month') === 'month' ? 18 : 30}
                    animationDuration={600}
                    animationBegin={250}
                    animationEasing="ease-in-out"
                    isAnimationActive={true}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrevious}
          disabled={isLoading}
          className="border-gray-200 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNext}
          disabled={isLoading}
          className="border-gray-200 hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default InteractiveBarChart;
