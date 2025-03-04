
import React from 'react';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import { DateRange } from '@/lib/dateUtils';

type DashboardChartsProps = {
  dateRange: DateRange;
  dealershipFilter: string;
};

const DashboardCharts: React.FC<DashboardChartsProps> = ({ 
  dateRange, 
  dealershipFilter
}) => {
  console.log('[DASHBOARD_CHARTS] Rendering with filters:', {
    dateRange,
    dealershipFilter
  });
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <AgreementChart dateRange={dateRange} dealerFilter={dealershipFilter} />
      <ClaimChart dateRange={dateRange} dealershipFilter={dealershipFilter} />
    </div>
  );
};

export default DashboardCharts;
