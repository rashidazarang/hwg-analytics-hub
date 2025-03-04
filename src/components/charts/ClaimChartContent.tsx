
import React, { useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartLegend } from './ChartLegend';

// Define the colors for the chart
export const CLAIM_STATUS_COLORS = {
  OPEN: '#10b981',
  PENDING: '#f59e0b',
  CLOSED: '#ef4444'
};

interface ClaimChartContentProps {
  data: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  isLoading: boolean;
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 rounded-md shadow-md border border-gray-100">
        <p className="text-sm font-medium">
          {data.status.toUpperCase()}: {data.count.toLocaleString()} Claims
        </p>
      </div>
    );
  }
  return null;
};

export const ClaimChartContent: React.FC<ClaimChartContentProps> = ({ data, isLoading }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onBarEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onBarLeave = () => {
    setActiveIndex(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground">
        No claims data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[240px]">
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 20
          }}
          barSize={20}
          barGap={8}
          barCategoryGap={12}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={true}
            vertical={false}
            stroke="#f0f0f0"
          />
          <YAxis
            dataKey="status"
            type="category"
            axisLine={false}
            tickLine={false}
            hide={true}
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={false}
            domain={[0, 'auto']}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              fill: 'rgba(0, 0, 0, 0.05)'
            }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 4, 4]}
            onMouseEnter={onBarEnter}
            onMouseLeave={onBarLeave}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-in-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CLAIM_STATUS_COLORS[entry.status as keyof typeof CLAIM_STATUS_COLORS] || '#777'}
                stroke={activeIndex === index ? 'rgba(255,255,255,0.3)' : 'transparent'}
                strokeWidth={activeIndex === index ? 2 : 0}
                className="transition-all duration-200"
                style={{
                  filter: activeIndex === index ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none',
                  opacity: activeIndex === null || activeIndex === index ? 1 : 0.7,
                  transition: 'opacity 0.3s, filter 0.3s'
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend statusColors={CLAIM_STATUS_COLORS} />
    </div>
  );
};
