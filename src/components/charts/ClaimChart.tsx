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

// Updated status mapper function with the new status logic - matching ClaimsTable.tsx exactly
function getClaimStatus(claim: any): string {
  if (claim.Closed && claim.ReportedDate) return 'CLOSED';
  if (claim.Closed && !claim.ReportedDate) return 'PENDING';
  if (claim.ReportedDate && !claim.Closed) return 'OPEN';
  return 'PENDING'; // Default to PENDING for any other cases
}

// Function to check if a claim is denied based on Correction field - matching ClaimsTable.tsx
function isClaimDenied(correction: string | null | undefined): boolean {
  if (!correction) return false;
  return /denied|not covered|rejected/i.test(correction);
}

const fetchClaimsData = async (dateRange: DateRange, dealershipFilter?: string) => {
  console.log('[CLAIMCHART_FETCH] Fetching claims with filters:', {
    dateRange,
    dealershipFilter,
    fromDate: dateRange.from.toISOString(),
    toDate: dateRange.to.toISOString()
  });

  try {
    // First get all claims matching our criteria WITHOUT the dealer filter
    // This query matches more closely the structure used in ClaimsTable
    let query = supabase
      .from("claims")
      .select(`
        id,
        ClaimID, 
        ReportedDate, 
        Closed,
        Cause,
        Correction,
        LastModified,
        agreements(DealerUUID, dealers(Payee))
      `)
      .gte('ReportedDate', dateRange.from.toISOString())
      .lte('ReportedDate', dateRange.to.toISOString());

    const { data: claims, error } = await query;

    if (error) {
      console.error('[CLAIMCHART_ERROR] Error fetching claims:', error);
      return [];
    }

    console.log(`[CLAIMCHART_RESULT] Fetched ${claims?.length || 0} claims before dealer filtering`);

    // If dealership filter is provided, filter the claims client-side
    let filteredClaims = claims || [];
    if (dealershipFilter && dealershipFilter.trim() !== '') {
      console.log('[CLAIMCHART_FILTER] Filtering by dealership UUID:', dealershipFilter);
      filteredClaims = filteredClaims.filter(claim => 
        claim.agreements?.DealerUUID === dealershipFilter
      );
      console.log('[CLAIMCHART_FILTER] Claims after dealer filtering:', filteredClaims.length);
    }

    // Also include PENDING claims which might not have a ReportedDate
    if (filteredClaims.length === 0 || dealershipFilter) {
      const pendingQuery = supabase
        .from("claims")
        .select(`
          id,
          ClaimID, 
          ReportedDate, 
          Closed,
          Cause,
          Correction,
          LastModified,
          agreements(DealerUUID, dealers(Payee))
        `)
        .is('ReportedDate', null)
        .is('Closed', null);
      
      const { data: pendingClaims, error: pendingError } = await pendingQuery;
      
      if (!pendingError && pendingClaims && pendingClaims.length > 0) {
        console.log(`[CLAIMCHART_PENDING] Found ${pendingClaims.length} pending claims`);
        
        // Filter by dealership if needed
        let filteredPendingClaims = pendingClaims;
        if (dealershipFilter && dealershipFilter.trim() !== '') {
          filteredPendingClaims = pendingClaims.filter(claim => 
            claim.agreements?.DealerUUID === dealershipFilter
          );
        }
        
        // Add the pending claims to our result set
        filteredClaims = [...filteredClaims, ...filteredPendingClaims];
      }
    }

    // Log a sample of the data to verify status determination
    if (filteredClaims.length > 0) {
      const sampleClaim = filteredClaims[0];
      console.log('[CLAIMCHART_SAMPLE] Sample claim status:', {
        claim: sampleClaim.ClaimID,
        hasClosed: !!sampleClaim.Closed,
        hasReportedDate: !!sampleClaim.ReportedDate,
        correction: sampleClaim.Correction,
        status: getClaimStatus(sampleClaim)
      });
    }

    return filteredClaims;
  } catch (error) {
    console.error('[CLAIMCHART_ERROR] Error in fetchClaimsData:', error);
    return [];
  }
};

const ClaimChart: React.FC<ClaimChartProps> = ({ dateRange, dealershipFilter }) => {
  const { data: claims = [], isFetching, isError } = useQuery({
    queryKey: ['claims-chart', dateRange.from, dateRange.to, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10,
  });

  const processedData = React.useMemo(() => {
    console.log('[CLAIMCHART_PROCESS] Processing claims data:', claims.length);
    
    const statusCounts = {
      OPEN: 0,
      PENDING: 0,
      CLOSED: 0
    };

    claims.forEach(claim => {
      const status = getClaimStatus(claim);
      statusCounts[status as keyof typeof statusCounts]++;
    });

    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));

    console.log('[CLAIMCHART_PROCESSED] Processed claim counts:', chartData);
    return chartData;
  }, [claims]);

  console.log('[CLAIMCHART_RENDER] Rendering chart with data:', processedData);

  if (isError) {
    return (
      <Card className="h-full card-hover-effect">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Claims Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px] text-destructive">
            Error loading claims data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Claims Status Distribution
          {dealershipFilter && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Filtered by dealership)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isFetching ? (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            Loading claims data...
          </div>
        ) : processedData.every(d => d.count === 0) ? (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            No claims data available for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              layout="vertical"
              data={processedData}
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
              <Tooltip
                contentStyle={{
                  borderRadius: '6px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '14px',
                }}
                formatter={(value: number) => [`${value} Claims`, 'Count']}
              />
              <Bar dataKey="count" barSize={20} radius={[4, 4, 4, 4]}>
                {processedData.map((entry, index) => {
                  const colors = {
                    OPEN: '#3b82f6',    // Blue
                    CLOSED: '#10b981',  // Green
                    PENDING: '#9ca3af'  // Gray
                  };
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={colors[entry.status as keyof typeof colors] || '#cccccc'} 
                    />
                  );
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
