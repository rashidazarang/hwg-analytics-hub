
import React from 'react';
import { DateRange } from '@/lib/dateUtils';
import AgreementKPISection from './AgreementKPISection';
import ClaimKPISection from './ClaimKPISection';

type TabSwitchedKPISectionProps = {
  activeTab: string;
  dateRange: DateRange;
  dealerFilter?: string;
};

const TabSwitchedKPISection: React.FC<TabSwitchedKPISectionProps> = ({ 
  activeTab, 
  dateRange, 
  dealerFilter 
}) => {
  console.log('[KPI_SECTION] Rendering KPI section for active tab:', activeTab);
  
  return (
    <>
      {activeTab === 'agreements' && (
        <AgreementKPISection 
          dateRange={dateRange} 
          dealerFilter={dealerFilter} 
        />
      )}
      
      {activeTab === 'claims' && (
        <ClaimKPISection 
          dateRange={dateRange} 
          dealerFilter={dealerFilter} 
        />
      )}
    </>
  );
};

export default TabSwitchedKPISection;
