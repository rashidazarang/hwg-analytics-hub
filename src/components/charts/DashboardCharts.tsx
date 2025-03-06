
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { AgreementPieChart } from '@/components/charts/AgreementPieChart';
import ClaimPieChart from '@/components/charts/ClaimPieChart';
import { useAgreementStatusData } from '@/hooks/useAgreementStatusData';
import { useClaimsChartData } from '@/hooks/useClaimsChartData';
import InteractiveBarChart from '@/components/charts/InteractiveBarChart';
import { usePerformanceMetricsData } from '@/hooks/usePerformanceMetricsData';
import { TimeframeOption } from '@/components/filters/TimeframeFilter';

interface DashboardChartsProps {
  dateRange: DateRange;
  dealerFilter: string;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ dateRange, dealerFilter }) => {
  // Get agreement data
  const { data: agreementData, isLoading: isAgreementLoading } = useAgreementStatusData(dateRange, dealerFilter);
  
  // Get claims data
  const { data: claimsData, isLoading: isClaimsLoading } = useClaimsChartData(dateRange, dealerFilter);
  
  // For the interactive bar chart
  const timeframe: TimeframeOption = 'month';
  const [currentOffset, setCurrentOffset] = React.useState(0);
  
  // Get performance metrics data for the bar chart
  const { data: performanceData, loading: isPerformanceLoading } = usePerformanceMetricsData(
    timeframe,
    currentOffset
  );
  
  const handlePeriodChange = (offset: number) => {
    setCurrentOffset(offset);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-xl bg-white hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-800">Agreements Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <AgreementPieChart 
            data={agreementData || []} 
            isLoading={isAgreementLoading} 
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-xl bg-white hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-800">Claims Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ClaimPieChart 
            dateRange={dateRange} 
            dealershipFilter={dealerFilter} 
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-xl bg-white hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-2 border-b bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-800">Monthly Agreement Growth</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <InteractiveBarChart 
            data={performanceData} 
            timeframe={timeframe}
            isLoading={isPerformanceLoading}
            onPeriodChange={handlePeriodChange}
            currentOffset={currentOffset}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCharts;
