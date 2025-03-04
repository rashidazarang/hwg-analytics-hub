
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
  
  const {
    data: claims = [],
    isFetching,
    isError
  } = useClaimsChartData(dateRange, dealershipFilter);

  const processedData = React.useMemo(() => 
    processClaimsForChart(claims), [claims]);

  useEffect(() => {
    if (processedData.length > 0) {
      setAnimatedData(processedData);
    } else {
      setAnimatedData([]);
    }
  }, [processedData]);

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
          {dealershipFilter && <span className=""></span>}
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
