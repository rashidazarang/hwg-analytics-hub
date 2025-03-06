
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
    <div className="mb-1 xs:mb-2 sm:mb-3">
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
    </div>
  );
};

export default TabSwitchedKPISection;
