
import React from 'react';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import { Claim } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';

type DashboardChartsProps = {
  dateRange: DateRange;
  dealershipFilter: string;
  claims: Claim[];
};

const DashboardCharts: React.FC<DashboardChartsProps> = ({ 
  dateRange, 
  dealershipFilter,
  claims 
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <AgreementChart dateRange={dateRange} dealerFilter={dealershipFilter} />
      <ClaimChart claims={claims} dateRange={dateRange} />
    </div>
  );
};

export default DashboardCharts;
