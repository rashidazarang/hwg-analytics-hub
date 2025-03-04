
import React from 'react';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import { Claim } from '@/lib/types';
import { DateRange } from '@/lib/dateUtils';

type DashboardChartsProps = {
  dateRange: DateRange;
  dealershipFilter: string;
  claims?: Claim[]; // Make claims optional since we're not actually using it
};

const DashboardCharts: React.FC<DashboardChartsProps> = ({ 
  dateRange, 
  dealershipFilter
}) => {
  console.log('📊 DashboardCharts: Rendering with dateRange:', dateRange);
  console.log('📊 DashboardCharts: Rendering with dealershipFilter:', dealershipFilter);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <AgreementChart dateRange={dateRange} dealerFilter={dealershipFilter} />
      <ClaimChart dateRange={dateRange} dealershipFilter={dealershipFilter} />
    </div>
  );
};

export default DashboardCharts;
