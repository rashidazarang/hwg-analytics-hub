
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Claim, getClaimsTimeline } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';

type ClaimChartProps = {
  claims: Claim[];
  dateRange: DateRange;
};

const ClaimChart: React.FC<ClaimChartProps> = ({ claims, dateRange }) => {
  const data = getClaimsTimeline(claims, dateRange);

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Claims Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value}
              domain={[0, 'auto']}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '14px',
              }}
              formatter={(value, name) => {
                if (name === 'amount') {
                  return [`$${Number(value).toLocaleString()}`, 'Amount'];
                }
                return [value, 'Count'];
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right"
              iconSize={10}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-medium">
                  {value === 'reported' ? 'Claims Count' : 'Claims Amount'}
                </span>
              )}
            />
            <Bar 
              yAxisId="left" 
              dataKey="reported" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]} 
              barSize={20}
              animationDuration={1000}
              animationBegin={0}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="amount" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={{ r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              animationDuration={1500}
              animationBegin={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ClaimChart;
