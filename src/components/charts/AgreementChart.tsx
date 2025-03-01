
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Agreement, getAgreementStatusDistribution } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';

type AgreementChartProps = {
  agreements: Agreement[];
  dateRange: DateRange;
};

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#6366f1'];

const AgreementChart: React.FC<AgreementChartProps> = ({ agreements, dateRange }) => {
  const data = getAgreementStatusDistribution(agreements, dateRange);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Agreement Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
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
                `${value} Agreements`, 
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
                <span className="text-xs font-medium">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AgreementChart;
