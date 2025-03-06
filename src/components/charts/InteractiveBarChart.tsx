import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
    
    let formattedDate, tooltipContent;
    
    const isMonthView = format(dataPoint.rawDate, 'd') === '1';
    
    if (isMonthView) {
      formattedDate = format(dataPoint.rawDate, 'MMMM yyyy');
      tooltipContent = `Total Agreements: ${dataPoint.value.toLocaleString()}`;
    } else {
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
  const [chartWidth, setChartWidth] = React.useState<number>(0);
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
    
    switch (timeframe) {
      case 'week':
        dateRange = `${format(firstDate, 'MMM d')} - ${format(lastDate, 'MMM d, yyyy')}`;
        break;
      case 'month':
        dateRange = `${format(firstDate, 'MMM d')} - ${format(lastDate, 'MMM d, yyyy')}`;
        break;
      case '6months':
        dateRange = `${format(firstDate, 'MMM yyyy')} - ${format(lastDate, 'MMM yyyy')}`;
        break;
      case 'year':
        dateRange = `${format(firstDate, 'MMM yyyy')} - ${format(lastDate, 'MMM yyyy')}`;
        break;
      default:
        dateRange = "";
    }
    
    return { dateRange };
  }, [data, timeframe]);

  const { dateRange } = getDateRange();

  return (
    <div className={cn("bg-white p-4 rounded-md shadow-sm border", className)} ref={containerRef}>
      <div className="flex flex-col mb-6">
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
                right: 10,
                left: 10,
                bottom: 20,
              }}
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
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                name="Agreements" 
                fill="#F97316"
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
          disabled={isLoading || (currentOffset >= 1)}
          className="border-gray-200"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default InteractiveBarChart;
