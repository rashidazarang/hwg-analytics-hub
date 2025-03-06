
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AgreementChartData } from '@/hooks/useAgreementStatusData';
import { ChartLegend } from './ChartLegend';

type AgreementPieChartProps = {
  data: AgreementChartData[];
  isLoading: boolean;
};

// Define colors for the agreement statuses to match the image
export const AGREEMENT_STATUS_COLORS = {
  'ACTIVE': '#0ea5e9',    // Blue
  'PENDING': '#3b82f6',   // Light blue
  'CANCELLED': '#ef4444', // Red
  'OTHER': '#6b7280',     // Gray
};

export const AgreementPieChart: React.FC<AgreementPieChartProps> = ({ data, isLoading }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [animatedData, setAnimatedData] = useState<AgreementChartData[]>([]);
  
  // Update animated data when real data changes
  useEffect(() => {
    if (data && data.length > 0) {
      setAnimatedData(data);
    } else {
      setAnimatedData([]);
    }
  }, [data]);

  // Logging to help debug
  useEffect(() => {
    console.log('🥧 PieChart data updated:', data);
  }, [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Custom tooltip to display detailed status information
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as AgreementChartData;
      
      if (item.isGrouped && item.groupedStatuses) {
        // Display individual statuses for "Other" category
        return (
          <div className="bg-white p-3 rounded-md shadow-md border border-gray-100">
            <p className="text-sm font-medium mb-1">Other Status Types:</p>
            {item.groupedStatuses.map((status, idx) => (
              <p key={idx} className="text-xs">
                {status.status.toUpperCase()}: {status.count.toLocaleString()} Agreements
              </p>
            ))}
          </div>
        );
      }
      
      // Regular tooltip for non-grouped statuses
      return (
        <div className="bg-white p-3 rounded-md shadow-md border border-gray-100">
          <p className="text-sm font-medium">
            {item.name}: {item.value.toLocaleString()} Agreements
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground">
        No agreement data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[240px]">
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={animatedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            innerRadius={45}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            animationDuration={800}
            animationBegin={0}
          >
            {animatedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || AGREEMENT_STATUS_COLORS[entry.name as keyof typeof AGREEMENT_STATUS_COLORS] || '#8884d8'} 
                stroke={activeIndex === index ? '#fff' : 'transparent'}
                strokeWidth={activeIndex === index ? 2 : 0}
                style={{
                  filter: activeIndex === index ? 'drop-shadow(0 0 6px rgba(0,0,0,0.2))' : 'none',
                  transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'transform 0.3s, filter 0.3s',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-2">
        <ChartLegend statusColors={AGREEMENT_STATUS_COLORS} />
      </div>
    </div>
  );
};
