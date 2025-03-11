import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyRevenue } from '@/hooks/useDealerProfileData';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DealerRevenueChartProps {
  data: MonthlyRevenue[];
  isLoading: boolean;
}

const DealerRevenueChart: React.FC<DealerRevenueChartProps> = ({ data, isLoading }) => {
  // Format the data for the chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      totalRevenue: Number(item.total_revenue) || 0,
      fundedRevenue: Number(item.funded_revenue) || 0,
      expectedRevenue: Number(item.expected_revenue) || 0,
      agreements: Math.round(Number(item.total_revenue) / 2000) // Approximation for demo purposes
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
          <div className="w-full h-[250px] bg-gray-100 animate-pulse rounded-md"></div>
        </CardContent>
      </Card>
    );
  }

  // If there's no data or only one point, show a message
  if (!chartData.length || chartData.length === 1) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>Not enough data to display revenue trends.</p>
            <p className="text-sm mt-2">Try extending the date range to see more data points.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalRevenue = chartData.reduce((sum, item) => sum + item.totalRevenue, 0);
  const fundedRevenue = chartData.reduce((sum, item) => sum + item.fundedRevenue, 0);
  const expectedRevenue = chartData.reduce((sum, item) => sum + item.expectedRevenue, 0);
  const totalAgreements = chartData.reduce((sum, item) => sum + item.agreements, 0);

  // Format the currency for the tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Revenue Trends</CardTitle>
        <div className="flex flex-col text-sm">
          <div className="flex justify-between mb-1">
            <div className="text-muted-foreground">
              Total Revenue: <span className="font-medium text-foreground">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="text-muted-foreground">
              Total Agreements: <span className="font-medium text-foreground">{totalAgreements}</span>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="text-muted-foreground">
              Funded Revenue: <span className="font-medium text-foreground">{formatCurrency(fundedRevenue)}</span>
            </div>
            <div className="text-muted-foreground">
              Expected Revenue: <span className="font-medium text-foreground">{formatCurrency(expectedRevenue)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0070f3" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0070f3" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorFunded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff9800" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const labels = {
                    totalRevenue: 'Total Revenue',
                    fundedRevenue: 'Funded Revenue',
                    expectedRevenue: 'Expected Revenue'
                  };
                  return [formatTooltipValue(value), labels[name as keyof typeof labels] || name];
                }}
                contentStyle={{ 
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="totalRevenue" 
                name="Total Revenue"
                stroke="#0070f3" 
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
              <Area 
                type="monotone" 
                dataKey="fundedRevenue" 
                name="Funded Revenue"
                stroke="#4caf50" 
                fillOpacity={0.5}
                fill="url(#colorFunded)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
              <Area 
                type="monotone" 
                dataKey="expectedRevenue" 
                name="Expected Revenue"
                stroke="#ff9800" 
                fillOpacity={0.5}
                fill="url(#colorExpected)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart for agreement counts */}
        <div className="h-[150px] mt-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">Agreement Count by Month</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip
                formatter={(value: number) => [value, 'Agreements']}
                contentStyle={{ 
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
              />
              <Bar 
                dataKey="agreements" 
                fill="#4caf50" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealerRevenueChart;