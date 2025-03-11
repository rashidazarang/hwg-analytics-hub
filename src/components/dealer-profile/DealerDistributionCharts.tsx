import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgreementDistribution, ClaimsDistribution } from '@/hooks/useDealerProfileData';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DealerDistributionChartsProps {
  agreementDistribution: AgreementDistribution[];
  claimsDistribution: ClaimsDistribution[];
  isLoading: boolean;
}

// Color schemes for status types
const AGREEMENT_COLORS = {
  'ACTIVE': '#4caf50',
  'CLAIMABLE': '#2196f3',
  'PENDING': '#ff9800',
  'CANCELLED': '#f44336',
  'VOID': '#f44336',
  'EXPIRED': '#9e9e9e',
  'UNKNOWN': '#9e9e9e',
  // Fallback for any other status
  'DEFAULT': '#9e9e9e'
};

const CLAIMS_COLORS = {
  'OPEN': '#2196f3',
  'CLOSED': '#4caf50',
  'DEFAULT': '#9e9e9e'
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm">Count: <span className="font-medium">{payload[0].value}</span></p>
        <p className="text-sm">{payload[0].payload.percentage?.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

const DealerDistributionCharts: React.FC<DealerDistributionChartsProps> = ({ 
  agreementDistribution, 
  claimsDistribution, 
  isLoading 
}) => {
  // Format agreement data for charts
  const agreementData = agreementDistribution.map(item => ({
    name: item.status,
    value: item.count,
    percentage: item.percentage
  }));

  // Format claims data for charts
  const claimsData = claimsDistribution.map(item => ({
    name: item.status,
    value: item.count,
    percentage: item.percentage
  }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Agreement Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-[200px] h-[200px] bg-gray-100 rounded-full"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Claims Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-[200px] h-[200px] bg-gray-100 rounded-full"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If there's no data, show a message
  if (!agreementData.length && !claimsData.length) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Agreement Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>No agreement data available.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Claims Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>No claims data available.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Agreement Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Agreement Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {agreementData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agreementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {agreementData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={AGREEMENT_COLORS[entry.name as keyof typeof AGREEMENT_COLORS] || AGREEMENT_COLORS.DEFAULT} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>No agreement data available.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claims Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Claims Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {claimsData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={claimsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {claimsData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CLAIMS_COLORS[entry.name as keyof typeof CLAIMS_COLORS] || CLAIMS_COLORS.DEFAULT} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>No claims data available.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerDistributionCharts;