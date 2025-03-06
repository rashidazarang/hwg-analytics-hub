
import React, { useState, useRef, useEffect } from 'react';
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
    return (
      <div className="bg-white p-3 shadow-md rounded-md border">
        <p className="font-medium">{format(dataPoint.rawDate, 'MMM d, yyyy')}</p>
        <p className="text-primary">{`Total Agreements: ${dataPoint.value}`}</p>
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

  const handlePrevious = () => {
    onPeriodChange(currentOffset - 1);
  };

  const handleNext = () => {
    onPeriodChange(currentOffset + 1);
  };

  // Update chart width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Generate chart title based on timeframe
  const getChartTitle = () => {
    if (data.length === 0) return "No data available";
    
    const firstDate = data[0].rawDate;
    const lastDate = data[data.length - 1].rawDate;
    
    switch (timeframe) {
      case 'week':
        return `Week of ${format(firstDate, 'MMM d, yyyy')}`;
      case 'month':
        return format(firstDate, 'MMMM yyyy');
      case '6months':
        return `${format(firstDate, 'MMM yyyy')} - ${format(lastDate, 'MMM yyyy')}`;
      case 'year':
        return `${format(firstDate, 'MMM yyyy')} - ${format(lastDate, 'MMM yyyy')}`;
      default:
        return "Agreements Over Time";
    }
  };

  return (
    <div className={cn("bg-white p-4 rounded-md shadow-sm border", className)} ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{getChartTitle()}</h3>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevious}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNext}
            disabled={isLoading || currentOffset >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                name="Agreements" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
                barSize={timeframe === 'week' ? 30 : timeframe === 'month' ? 40 : 50}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No data available for this period
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveBarChart;
