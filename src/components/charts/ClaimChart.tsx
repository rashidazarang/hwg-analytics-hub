
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useClaimsChartData } from '@/hooks/useClaimsChartData';
import { ClaimChartContent } from './ClaimChartContent';
import { processClaimsForChart } from '@/utils/processClaimsData';

type ClaimChartProps = {
  dateRange: DateRange;
  dealershipFilter?: string;
};

const ClaimChart: React.FC<ClaimChartProps> = ({
  dateRange,
  dealershipFilter
}) => {
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  
  // Use the shared claims data hook via useClaimsChartData
  // This now gets ALL claims through the updated fetching logic 
  const {
    data: claimsData,
    isLoading: isFetching,
    isError
  } = useClaimsChartData(dateRange, dealershipFilter);

  // Process the data for the chart
  const processedData = React.useMemo(() => 
    processClaimsForChart(claimsData?.data || []), [claimsData?.data]);

  useEffect(() => {
    if (processedData.length > 0) {
      setAnimatedData(processedData);
    } else {
      setAnimatedData([]);
    }
  }, [processedData]);

  console.log('[CLAIMCHART_RENDER] Rendering chart with data:', processedData);
  console.log('[CLAIMCHART_FILTERS] Using filters:', { dateRange, dealershipFilter });
  console.log('[CLAIMCHART_DATA] Claims count:', claimsData?.data?.length || 0, 'Total:', claimsData?.count || 0);
  console.log('[CLAIMCHART_DATA] Status breakdown:', claimsData?.statusBreakdown || {});

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
          {dealershipFilter && <span className="text-sm ml-2 text-muted-foreground">(Filtered)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ClaimChartContent 
          data={animatedData} 
          isLoading={isFetching} 
        />
      </CardContent>
    </Card>
  );
};

export default ClaimChart;
