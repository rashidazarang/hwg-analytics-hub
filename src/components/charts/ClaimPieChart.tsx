
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useClaimsChartData } from '@/hooks/useClaimsChartData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { processClaimsForChart } from '@/utils/processClaimsData';
import { ChartLegend } from './ChartLegend';

// Define the colors for the chart to match the image
export const CLAIM_STATUS_COLORS = {
  OPEN: '#10b981',
  PENDING: '#f59e0b',
  CLOSED: '#ef4444'
};

type ClaimPieChartProps = {
  dateRange: DateRange;
  dealershipFilter?: string;
};

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 rounded-md shadow-md border border-gray-100">
        <p className="text-sm font-medium">
          {data.status}: {data.count.toLocaleString()} Claims ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const ClaimPieChart: React.FC<ClaimPieChartProps> = ({
  dateRange,
  dealershipFilter
}) => {
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // Use the shared claims data hook via useClaimsChartData
  // This now gets ALL claims through the updated fetching logic 
  const {
    data: claimsData,
    isLoading: isFetching,
    isError
  } = useClaimsChartData(dateRange, dealershipFilter);

  // Process the data for the chart
  const processedData = React.useMemo(() => 
    processClaimsForChart(claimsData?.data || []), [claimsData?.data]);

  useEffect(() => {
    if (processedData.length > 0) {
      setAnimatedData(processedData);
    } else {
      setAnimatedData([]);
    }
  }, [processedData]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  if (isError) {
    return (
      <Card className="h-full card-hover-effect">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Claims Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px] text-destructive">
            Error loading claims data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Claims Status Distribution
          {dealershipFilter && <span className="text-sm ml-2 text-muted-foreground">(Filtered)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[240px]">
          {isFetching ? (
            <div className="flex items-center justify-center h-[85%]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : animatedData.length === 0 ? (
            <div className="flex items-center justify-center h-[85%] text-muted-foreground">
              No claims data available for the selected filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={animatedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  dataKey="count"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  animationDuration={500}
                  animationBegin={0}
                >
                  {animatedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CLAIM_STATUS_COLORS[entry.status as keyof typeof CLAIM_STATUS_COLORS] || '#777'} 
                      stroke={activeIndex === index ? '#fff' : 'transparent'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                      className="transition-all duration-200"
                      style={{
                        filter: activeIndex === index ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none',
                        transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                        transition: 'transform 0.2s, filter 0.2s',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ChartLegend statusColors={CLAIM_STATUS_COLORS} />
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimPieChart;
