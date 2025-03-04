import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

type ClaimChartProps = {
  dateRange: DateRange;
  dealershipFilter?: string;
};

// 🚀 Fetch claims from Supabase with dealership & date filtering
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

  console.log('✅ Fetched claims:', data);
  return data;
};

// 🔢 Process claims into the required format
const getClaimsByStatus = (claims: any[], dateRange: DateRange) => {
  if (!claims || claims.length === 0) {
    console.warn('⚠️ No claims data available.');
    return [];
  }

  const statusCounts = {
    OPEN: 0,
    PENDING: 0,
    DENIED: 0,
  };

  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  claims.forEach(claim => {
    const reportedDate = claim.ReportedDate ? new Date(claim.ReportedDate) : null;
    if (reportedDate && reportedDate >= startDate && reportedDate <= endDate) {
      if (claim.Cause && !claim.Closed) {
        statusCounts.DENIED += 1;
      } else if (claim.ReportedDate && !claim.Closed && !claim.Cause) {
        statusCounts.PENDING += 1;
      } else {
        statusCounts.OPEN += 1;
      }
    }
  });

  console.log('📊 Processed claims data:', statusCounts);

  return [
    { status: 'OPEN', count: statusCounts.OPEN },
    { status: 'PENDING', count: statusCounts.PENDING },
    { status: 'DENIED', count: statusCounts.DENIED },
  ];
};

// 📊 Claims Chart Component
const ClaimChart: React.FC<ClaimChartProps> = ({ dateRange, dealershipFilter }) => {
  const { data: claims = [], isFetching } = useQuery({
    queryKey: ['claims-data', dateRange, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10,
  });

  console.log('📊 Raw Claims Data:', claims);
  const data = getClaimsByStatus(claims, dateRange);
  console.log('📊 Processed Claims Data:', data);

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
                tick={{ fontSize: 12, fill: '#666' }}
              />

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

              <Bar dataKey="count" name="Claims" barSize={20} radius={[4, 4, 4, 4]}>
                {data.map((entry, index) => {
                  let fillColor = "#3b82f6"; // Default for OPEN
                  if (entry.status === 'PENDING') fillColor = "#f59e0b";
                  else if (entry.status === 'DENIED') fillColor = "#ef4444";
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
