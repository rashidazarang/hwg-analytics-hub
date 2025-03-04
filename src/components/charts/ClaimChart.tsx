import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

type ClaimChartProps = {
  dateRange: DateRange;
  dealershipFilter?: string;
};

// Fetch claims data
const fetchClaimsData = async (dateRange: DateRange, dealershipFilter?: string) => {
  console.log('🔍 Fetching claims data...', { dateRange, dealershipFilter });

  let query = supabase
    .from("claims")
    .select(`
      id, ReportedDate, Closed, Cause, LastModified,
      agreements!inner(DealerUUID, dealers!inner(Payee))
    `)
    .order("LastModified", { ascending: false });

  if (dealershipFilter) {
    query = query.eq("agreements.DealerUUID", dealershipFilter);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("❌ Error fetching claims:", error);
    return [];
  }

  console.log('✅ Raw fetched claims:', JSON.stringify(data, null, 2));
  return data;
};

// Process data
const getClaimsByStatus = (claims: any[], dateRange: DateRange) => {
  if (!claims || claims.length === 0) {
    console.warn('⚠️ No claims data available, returning zero-count for all statuses.');
    return [
      { status: 'OPEN', count: 0 },
      { status: 'PENDING', count: 0 },
      { status: 'DENIED', count: 0 },
      { status: 'CLOSED', count: 0 },
    ];
  }

  const statusCounts = {
    OPEN: 0,
    PENDING: 0,
    DENIED: 0,
    CLOSED: 0,
  };

  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  claims.forEach(claim => {
    const reportedDate = claim.ReportedDate ? new Date(claim.ReportedDate) : null;
    if (reportedDate && reportedDate >= startDate && reportedDate <= endDate) {
      if (claim.Closed) {
        statusCounts.CLOSED += 1;
      } else if (claim.Cause && !claim.Closed) {
        statusCounts.DENIED += 1;
      } else if (claim.ReportedDate && !claim.Closed) {
        statusCounts.PENDING += 1;
      } else {
        statusCounts.OPEN += 1;
      }
    }
  });

  console.log('📊 Processed claims data:', JSON.stringify(statusCounts, null, 2));
  return [
    { status: 'OPEN', count: statusCounts.OPEN },
    { status: 'PENDING', count: statusCounts.PENDING },
    { status: 'DENIED', count: statusCounts.DENIED },
    { status: 'CLOSED', count: statusCounts.CLOSED },
  ];
};

const ClaimChart: React.FC<ClaimChartProps> = ({ dateRange, dealershipFilter }) => {
  const { data: claims = [], isFetching } = useQuery({
    queryKey: ['claims-data', dateRange, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10,
  });

  console.log('📊 Raw Claims Data:', claims);

  // Always attempt to process the claims — even if empty.
  const data = getClaimsByStatus(claims, dateRange);
  console.log('📊 Data sent to chart:', JSON.stringify(data, null, 2));

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Claims Status Distribution
          {dealershipFilter && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Filtered by: {dealershipFilter || 'Loading...'})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isFetching ? (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            Loading claims data...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            {/* If getClaimsByStatus returns [] for some reason, you'll see this */}
            No claims data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <YAxis
                dataKey="status"
                type="category"
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Legend
                layout="horizontal"
                verticalAlign="top"
                align="center"
                iconSize={10}
                iconType="circle"
                formatter={(value) =>
                  <span className="text-xs font-medium">
                    {value ? value.charAt(0) + value.slice(1).toLowerCase() : ''}
                  </span>
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '14px',
                }}
                formatter={(value, name) => [
                  `${value || 0} Claims`, 
                  name ? name.charAt(0) + name.slice(1).toLowerCase() : 'Unknown'
                ]}
              />
              <Bar dataKey="count" name="Claims" barSize={20} radius={[4, 4, 4, 4]}>
                {data.map((entry, index) => {
                  const statusColors: Record<string, string> = {
                    OPEN: '#3b82f6',   
                    PENDING: '#f59e0b',
                    DENIED: '#ef4444', 
                    CLOSED: '#10b981',
                  };
                  const fillColor = statusColors[entry.status] || '#cccccc';
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimChart;
