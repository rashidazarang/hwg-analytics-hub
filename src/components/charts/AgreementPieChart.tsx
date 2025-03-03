
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AgreementChartData } from '@/hooks/useAgreementStatusData';

type AgreementPieChartProps = {
  data: AgreementChartData[];
  isLoading: boolean;
};

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#6366f1'];

export const AgreementPieChart: React.FC<AgreementPieChartProps> = ({ data, isLoading }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [animatedData, setAnimatedData] = useState<AgreementChartData[]>([]);
  
  // Update animated data when real data changes
  useEffect(() => {
    if (data.length > 0) {
      setAnimatedData(data);
    } else {
      setAnimatedData([]);
    }
  }, [data]);

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

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={animatedData}
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
          {animatedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]} 
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
            name.toUpperCase()
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
            <span className="text-xs font-medium">{value.toUpperCase()}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
