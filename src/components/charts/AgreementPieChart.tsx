
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AgreementChartData } from '@/hooks/useAgreementStatusData';

type AgreementPieChartProps = {
  data: AgreementChartData[];
  isLoading: boolean;
};

// Updated color palette based on status
const STATUS_COLORS: Record<string, string> = {
  'PENDING': '#FEF7CD',    // Soft Yellow
  'ACTIVE': '#F2FCE2',     // Soft Green
  'VOID': '#8E9196',       // Neutral Gray
  'CLAIMABLE': '#0EA5E9',  // Ocean Blue
  'CANCELLED': '#ea384c',  // Red
};

// Default colors for fallback
const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#6366f1'];

export const AgreementPieChart: React.FC<AgreementPieChartProps> = ({ data, isLoading }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground">
        No agreement data available
      </div>
    );
  }

  // Get color for each data point based on its status
  const getColor = (entry: AgreementChartData, index: number) => {
    const statusColor = STATUS_COLORS[entry.rawStatus];
    return statusColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          innerRadius={40}
          fill="#8884d8"
          dataKey="value"
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
          animationDuration={500}
          animationBegin={0}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getColor(entry, index)} 
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
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value.toLocaleString()} Agreements`, 
            name
          ]}
          contentStyle={{
            borderRadius: '6px',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: '14px',
          }}
        />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center"
          iconSize={10}
          iconType="circle"
          formatter={(value) => (
            <span className="text-xs font-medium">
              {value.toUpperCase()}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
