
import React, { useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import AgreementsTable from '@/components/tables/AgreementsTable';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import { Claim, Dealer } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';

type DashboardTablesProps = {
  activeTab: string;
  dateRange: DateRange;
  dealerFilter: string; // This should be the UUID of the dealer
  dealerName?: string;  // This is the display name of the dealer
  searchQuery?: string;
  claims: Claim[];
  dealers: Dealer[];
};

const DashboardTables: React.FC<DashboardTablesProps> = ({
  activeTab,
  dateRange,
  dealerFilter, // This is the dealer UUID
  dealerName = '',
  searchQuery = '',
  claims,
  dealers
}) => {
  // Debug logging to verify props are correctly passed down
  useEffect(() => {
    console.log("DashboardTables - Current dealer UUID filter:", dealerFilter);
    console.log("DashboardTables - Current dealer name:", dealerName);
  }, [dealerFilter, dealerName]);

  return (
    <div className="space-y-6 mt-6">
      <Tabs value={activeTab} defaultValue={activeTab}>
        <TabsContent value="agreements" className="mt-0">
          <AgreementsTable 
            dateRange={dateRange} 
            dealerFilter={dealerFilter} // Passing UUID here
            dealerName={dealerName}
            searchQuery={searchQuery} 
          />
        </TabsContent>
        
        <TabsContent value="claims" className="mt-0">
          <ClaimsTable 
            claims={claims} 
            dealerFilter={dealerFilter} // Passing UUID here
            dealerName={dealerName}
            searchQuery={searchQuery}
          />
        </TabsContent>
        
        <TabsContent value="dealers" className="mt-0">
          <DealersTable 
            dealers={dealers} 
            dealerFilter={dealerFilter} // Passing UUID here
            dealerName={dealerName}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardTables;
