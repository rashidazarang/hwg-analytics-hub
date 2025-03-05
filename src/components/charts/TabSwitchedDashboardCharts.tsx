
import React from 'react';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {activeTab === 'agreements' && (
        <AgreementChart 
          dateRange={dateRange} 
          dealerFilter={dealershipFilter} 
        />
      )}
      
      {activeTab === 'claims' && (
        <ClaimChart 
          dateRange={dateRange} 
          dealershipFilter={dealershipFilter} 
        />
      )}
    </div>
  );
};

export default TabSwitchedDashboardCharts;
