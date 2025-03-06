
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
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
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as PerformanceDataPoint;
    
    // Format the tooltip differently based on the datapoint type
    let formattedDate, tooltipContent;
    
    // Check if this is a month datapoint (for 6-month and year views)
    const isMonthView = format(dataPoint.rawDate, 'd') === '1';
    
    if (isMonthView) {
      // For monthly data, show the month and year
      formattedDate = format(dataPoint.rawDate, 'MMMM yyyy');
      tooltipContent = `Total Agreements: ${dataPoint.value.toLocaleString()}`;
    } else {
      // For daily data, show the specific date
      formattedDate = format(dataPoint.rawDate, 'MMM d, yyyy');
      tooltipContent = `Total Agreements: ${dataPoint.value.toLocaleString()}`;
    }
    
    return (
      <div className="bg-white p-3 shadow-md rounded-md border">
        <p className="font-medium">{formattedDate}</p>
        <p className="text-primary">{tooltipContent}</p>
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
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Calculate average once when data changes
  const averageValue = React.useMemo(() => {
    if (!data || data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / data.length);
  }, [data]);

  const handlePrevious = useCallback(() => {
    onPeriodChange(currentOffset - 1);
  }, [currentOffset, onPeriodChange]);

  const handleNext = useCallback(() => {
    if (currentOffset < 0) {
      onPeriodChange(currentOffset + 1);
    }
  }, [currentOffset, onPeriodChange]);

  // Handle resize for responsive chart
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

  const getTitleAndDateRange = useCallback(() => {
    if (data.length === 0) return { title: "No data available", dateRange: "" };
    
    const firstDate = data[0].rawDate;
    const lastDate = data[data.length - 1].rawDate;
    
    let title = "PROMEDIO DIARIO";
    let dateRange = "";
    
    switch (timeframe) {
      case 'week':
        title = "PROMEDIO";
        dateRange = `${format(firstDate, 'd')}–${format(lastDate, 'd')} de ${format(firstDate, 'MMM').toLowerCase()} de ${format(firstDate, 'yyyy')}`;
        break;
      case 'month':
        title = "PROMEDIO";
        dateRange = `${format(firstDate, 'd')} de ${format(firstDate, 'MMM').toLowerCase()}–${format(lastDate, 'd')} de ${format(lastDate, 'MMM').toLowerCase()} ${format(lastDate, 'yyyy')}`;
        break;
      case '6months':
        title = "PROMEDIO DIARIO";
        // Format: "Oct de 2024 - Mar de 2025"
        dateRange = `${format(firstDate, 'MMM').toLowerCase()} de ${format(firstDate, 'yyyy')}–${format(lastDate, 'MMM').toLowerCase()} de ${format(lastDate, 'yyyy')}`;
        break;
      case 'year':
        title = "PROMEDIO DIARIO";
        // Format: "Mar de 2024 - Mar de 2025"
        dateRange = `${format(firstDate, 'MMM').toLowerCase()} de ${format(firstDate, 'yyyy')}–${format(lastDate, 'MMM').toLowerCase()} de ${format(lastDate, 'yyyy')}`;
        break;
      default:
        title = "PROMEDIO";
        dateRange = "";
    }
    
    return { title, dateRange };
  }, [data, timeframe]);

  const { title, dateRange } = getTitleAndDateRange();

  return (
    <div className={cn("bg-white p-4 rounded-md shadow-sm border", className)} ref={containerRef}>
      <div className="flex flex-col mb-6">
        <h3 className="text-gray-500 font-normal text-lg">{title}</h3>
        <div className="flex items-baseline">
          <span className="text-5xl font-bold mr-2">{averageValue.toLocaleString()}</span>
          <span className="text-3xl text-gray-400 font-light">acuerdos</span>
        </div>
        <p className="text-lg text-gray-500 mt-1">{dateRange}</p>
      </div>
      
      <div className="h-[300px] w-full">
        {isLoading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 20,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12, fill: '#8E9196' }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#8E9196' }}
                tickFormatter={(value) => value === 0 ? '0' : value.toLocaleString()}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                name="Agreements" 
                fill="#F97316" // Orange color from the design
                radius={[4, 4, 0, 0]}
                maxBarSize={timeframe === 'week' ? 40 : timeframe === 'month' ? 15 : 25}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 mt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrevious}
          disabled={isLoading}
          className="border-gray-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleNext}
          disabled={isLoading || currentOffset >= 0}
          className="border-gray-200"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default InteractiveBarChart;
