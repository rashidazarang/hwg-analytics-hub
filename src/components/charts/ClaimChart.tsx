import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Claim } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';

type ClaimChartProps = {
  claims: Claim[];
  dateRange: DateRange;
};

// Function to group claims by status
const getClaimsByStatus = (claims: Claim[], dateRange: DateRange) => {
  if (!claims || claims.length === 0) return [];

  return [
    {
      status: 'OPEN',
      count: claims.filter(claim => !claim?.Closed && !claim?.Cause).length,
    },
    {
      status: 'PENDING',
      count: claims.filter(claim => claim?.ReportedDate && !claim?.Closed && !claim?.Cause).length,
    },
    {
      status: 'DENIED',
      count: claims.filter(claim => claim?.Cause && !claim?.Closed).length,
    },
  ];
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const fetchClaimsData = async (dateRange: DateRange, dealerFilter?: string) => {
  let query = supabase
    .from("claims")
    .select("id, ReportedDate, Closed, Cause, agreements(DealerUUID, dealers(Payee))");

  if (dealerFilter) {
    query = query.eq("agreements.dealers.DealerUUID", dealerFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("❌ Error fetching claims:", error);
    return [];
  }

  return data;
};

const ClaimChart: React.FC<ClaimChartProps> = ({ dateRange, dealershipFilter }) => {
  const { data: claims = [], isFetching } = useQuery({
    queryKey: ['claims-data', dateRange, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const data = getClaimsByStatus(claims, dateRange);

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Claims Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            
            {/* Y-Axis: Claim Statuses */}
            <YAxis 
              dataKey="status"
              type="category"
              axisLine={false}
              tickLine={false}
              width={100}
              tick={{ fontSize: 12, fill: '#666' }}
            />

            {/* X-Axis: Claim Counts */}
            <XAxis 
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
              domain={[0, 'auto']}
            />

            <Tooltip
              contentStyle={{
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '14px',
              }}
              formatter={(value) => [value, 'Claims']}
            />

            <Legend 
              layout="horizontal"
              verticalAlign="top"
              align="center"
              iconSize={10}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-medium">{value.toUpperCase()}</span>
              )}
            />

            {/* Horizontal Bars for Each Claim Status */}
<Bar dataKey="OPEN" fill="#3b82f6" name="OPEN" barSize={20} radius={[4, 4, 4, 4]} />
<Bar dataKey="PENDING" fill="#f59e0b" name="PENDING" barSize={20} radius={[4, 4, 4, 4]} />
<Bar dataKey="DENIED" fill="#ef4444" name="DENIED" barSize={20} radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ClaimChart;
