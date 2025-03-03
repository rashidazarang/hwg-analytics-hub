
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DateRange } from '@/lib/dateUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AgreementChartProps = {
  dateRange: DateRange;
};

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#6366f1'];
const STATUS_LABELS: Record<string, string> = {
  'ACTIVE': 'Active',
  'EXPIRED': 'Expired',
  'CANCELLED': 'Cancelled',
  'PENDING': 'Pending',
  'TERMINATED': 'Terminated',
  'Unknown': 'Unknown'
};

const AgreementChart: React.FC<AgreementChartProps> = ({ dateRange }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Fetch status data from Supabase based on date range
  const { data: statusData = [], isLoading } = useQuery({
    queryKey: ['agreement-status-distribution', dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      console.log('📊 Fetching agreement status distribution data...');
      
      try {
        // Get date range for filtering
        const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
        const toDate = dateRange.to?.toISOString() || "2025-12-31T23:59:59.999Z";

        // Query all agreements in date range to count by status
        const { data, error } = await supabase
          .from('agreements')
          .select('AgreementStatus')
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);

        if (error) {
          console.error('❌ Error fetching agreement status distribution:', error);
          return [];
        }

        // Count by status
        const statusCounts: Record<string, number> = {};
        
        data.forEach(agreement => {
          const status = agreement.AgreementStatus || 'Unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Convert to chart data format
        const chartData = Object.entries(statusCounts).map(([status, count]) => ({
          name: STATUS_LABELS[status] || status,
          value: count,
          rawStatus: status
        }));

        // Sort data by count (descending)
        chartData.sort((a, b) => b.value - a.value);
        
        console.log('📊 Agreement status distribution:', chartData);
        return chartData;
      } catch (error) {
        console.error('❌ Error processing agreement status data:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

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
        {isLoading ? (
          <div className="flex items-center justify-center h-[240px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : statusData.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            No agreement data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
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
                {statusData.map((entry, index) => (
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
        )}
      </CardContent>
    </Card>
  );
};

export default AgreementChart;
