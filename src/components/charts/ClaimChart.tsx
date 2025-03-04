
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

// 1) Fetch claims data, but select the 'Correction' field
const fetchClaimsData = async (dateRange: DateRange, dealershipFilter?: string) => {
  console.log('🔍 Fetching claims data...', { dateRange, dealershipFilter });

  let query = supabase
    .from('claims')
    .select(`
      id,
      ReportedDate,
      Closed,
      Correction,
      LastModified,
      agreements!inner(DealerUUID, dealers!inner(Payee))
    `)
    .order('LastModified', { ascending: false });

  if (dealershipFilter) {
    query = query.eq('agreements.DealerUUID', dealershipFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ Error fetching claims:', error);
    return [];
  }

  console.log('✅ Raw fetched claims:', JSON.stringify(data, null, 2));
  return data;
};

// 2) Simple check for "denied" text
function isClaimDenied(correction: string | null | undefined): boolean {
  if (!correction) return false;
  return /denied|not covered|rejected/i.test(correction);
}

// 3) Process data => only OPEN, DENIED, CLOSED
const getClaimsByStatus = (claims: any[], dateRange: DateRange) => {
  if (!claims || claims.length === 0) {
    console.warn('⚠️ No claims data available, returning zero-count for all statuses.');
    return [
      { status: 'OPEN', count: 0 },
      { status: 'DENIED', count: 0 },
      { status: 'CLOSED', count: 0 },
    ];
  }

  const statusCounts = {
    OPEN: 0,
    DENIED: 0,
    CLOSED: 0,
  };

  // Fix: Use the proper DateRange property names (from and to)
  const startDate = new Date(dateRange.from);
  const endDate = new Date(dateRange.to);

  claims.forEach((claim) => {
    const reportedDate = claim.ReportedDate ? new Date(claim.ReportedDate) : null;
    if (reportedDate && reportedDate >= startDate && reportedDate <= endDate) {
      if (claim.Closed) {
        statusCounts.CLOSED += 1;
      } else if (isClaimDenied(claim.Correction)) {
        statusCounts.DENIED += 1;
      } else {
        statusCounts.OPEN += 1;
      }
    }
  });

  console.log('📊 Processed claims data:', JSON.stringify(statusCounts, null, 2));

  return [
    { status: 'OPEN', count: statusCounts.OPEN },
    { status: 'DENIED', count: statusCounts.DENIED },
    { status: 'CLOSED', count: statusCounts.CLOSED },
  ];
};

const ClaimChart: React.FC<ClaimChartProps> = ({ dateRange, dealershipFilter }) => {
  // 4) Use React Query to fetch claims by dateRange/dealership
  const { data: claims = [], isFetching } = useQuery({
    queryKey: ['claims-data', dateRange, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10,
  });

  console.log('📊 Raw Claims Data:', claims);

  // For debugging, attach to window object
  if (typeof window !== 'undefined') {
    (window as any).claimsData = claims;
  }

  // Always build an array with OPEN, DENIED, CLOSED
  const data = getClaimsByStatus(claims, dateRange);
  console.log('📊 Data sent to chart:', JSON.stringify(data, null, 2));
  
  // For debugging, attach to window object
  if (typeof window !== 'undefined') {
    (window as any).claimsChartData = data;
  }

  // 5) Check if all counts are zero => no data scenario
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

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
        ) : totalCount === 0 ? (
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
                width={90}
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
                  <span className="text-xs font-medium">{value}</span>
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '14px',
                }}
                formatter={(value: number, name: string) => [`${value} Claims`, name]}
              />
              <Bar dataKey="count" name="Claims" barSize={20} radius={[4, 4, 4, 4]}>
                {data.map((entry, index) => {
                  // Using the first 3 colors of the Agreement palette:
                  // #3b82f6 (blue), #10b981 (green), #ef4444 (red)
                  // Match them to OPEN, CLOSED, DENIED in any order you like:
                  const statusColors: Record<string, string> = {
                    OPEN: '#3b82f6',    // Blue
                    DENIED: '#ef4444',  // Red
                    CLOSED: '#10b981',  // Green
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
