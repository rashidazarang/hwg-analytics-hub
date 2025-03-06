
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import AgreementPieChart from '@/components/charts/AgreementPieChart';
import ClaimPieChart from '@/components/charts/ClaimPieChart';
import { useAgreementStatusData } from '@/hooks/useAgreementStatusData';
import { useClaimsChartData } from '@/hooks/useClaimsChartData';

interface DashboardChartsProps {
  dateRange: DateRange;
  dealerFilter: string;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ dateRange, dealerFilter }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="card-hover-effect">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Agreements Status</CardTitle>
        </CardHeader>
        <CardContent>
          <AgreementPieChart 
            dateRange={dateRange} 
            dealershipFilter={dealerFilter} 
          />
        </CardContent>
      </Card>

      <Card className="card-hover-effect">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Claims Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimPieChart 
            dateRange={dateRange} 
            dealershipFilter={dealerFilter} 
          />
        </CardContent>
      </Card>

      <Card className="card-hover-effect">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Monthly Agreement Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <InteractiveBarChart 
            dateRange={dateRange} 
            dealerFilter={dealerFilter} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Import the InteractiveBarChart component from the pre-existing components
import InteractiveBarChart from '@/components/charts/InteractiveBarChart';

export default DashboardCharts;
