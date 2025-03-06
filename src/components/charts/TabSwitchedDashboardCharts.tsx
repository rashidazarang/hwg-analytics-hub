
import React from 'react';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import AgreementBarChart from '@/components/charts/AgreementBarChart';
import ClaimPieChart from '@/components/charts/ClaimPieChart';
import { DateRange } from '@/lib/dateUtils';

type TabSwitchedDashboardChartsProps = {
  activeTab: string;
  dateRange: DateRange;
  dealershipFilter: string;
};

const TabSwitchedDashboardCharts: React.FC<TabSwitchedDashboardChartsProps> = ({ 
  activeTab, 
  dateRange, 
  dealershipFilter
}) => {
  console.log('[DASHBOARD_CHARTS] Rendering charts for active tab:', activeTab);
  
  return (
    <div className="grid grid-cols-1 gap-3 xs:gap-4 lg:grid-cols-2 lg:gap-6 mb-4 lg:mb-8">
      {activeTab === 'agreements' && (
        <>
          <AgreementChart 
            dateRange={dateRange} 
            dealerFilter={dealershipFilter} 
          />
          <AgreementBarChart
            dateRange={dateRange}
            dealerFilter={dealershipFilter}
          />
        </>
      )}
      
      {activeTab === 'claims' && (
        <>
          <ClaimPieChart
            dateRange={dateRange}
            dealershipFilter={dealershipFilter}
          />
          <ClaimChart 
            dateRange={dateRange} 
            dealershipFilter={dealershipFilter} 
          />
        </>
      )}
    </div>
  );
};

export default TabSwitchedDashboardCharts;
