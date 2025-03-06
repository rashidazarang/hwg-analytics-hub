
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8 w-full overflow-hidden">
      {activeTab === 'agreements' && (
        <>
          <div className="w-full min-w-0 overflow-hidden">
            <AgreementChart 
              dateRange={dateRange} 
              dealerFilter={dealershipFilter} 
            />
          </div>
          <div className="w-full min-w-0 overflow-hidden">
            <AgreementBarChart
              dateRange={dateRange}
              dealerFilter={dealershipFilter}
            />
          </div>
        </>
      )}
      
      {activeTab === 'claims' && (
        <>
          <div className="w-full min-w-0 overflow-hidden">
            <ClaimPieChart
              dateRange={dateRange}
              dealershipFilter={dealershipFilter}
            />
          </div>
          <div className="w-full min-w-0 overflow-hidden">
            <ClaimChart 
              dateRange={dateRange} 
              dealershipFilter={dealershipFilter} 
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TabSwitchedDashboardCharts;
