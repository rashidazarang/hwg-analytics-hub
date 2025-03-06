
import React, { useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import AgreementsTable from '@/components/tables/AgreementsTable';
import ClaimsTable from '@/components/tables/ClaimsTable';
import { DateRange } from '@/lib/dateUtils';

type DashboardTablesProps = {
  activeTab: string;
  dateRange: DateRange;
  dealerFilter: string; // This should be the UUID of the dealer
  dealerName?: string;  // This is the display name of the dealer
  searchQuery?: string;
};

const DashboardTables: React.FC<DashboardTablesProps> = ({
  activeTab,
  dateRange,
  dealerFilter, // This is the dealer UUID
  dealerName = '',
  searchQuery = '',
}) => {
  // Debug logging to verify props are correctly passed down
  useEffect(() => {
    console.log("🔄 DashboardTables - Current dealer UUID filter:", dealerFilter);
    console.log("🔄 DashboardTables - Current dealer name:", dealerName);
    console.log("🔄 DashboardTables - Current date range:", dateRange);
  }, [dealerFilter, dealerName, dateRange]);

  return (
    <div className="space-y-2 xs:space-y-4 mt-2 xs:mt-4">
      <Tabs value={activeTab} defaultValue={activeTab}>
        <TabsContent value="agreements" className="mt-0">
          <AgreementsTable 
            dateRange={dateRange} 
            dealerFilter={dealerFilter} // Passing UUID here
            dealerName={dealerName}     // Passing display name here
            searchQuery={searchQuery} 
          />
        </TabsContent>
        
        <TabsContent value="claims" className="mt-0">
          <ClaimsTable 
            dealerFilter={dealerFilter} // Passing UUID here
            searchQuery={searchQuery}
            dateRange={dateRange}       // Now passing dateRange to ClaimsTable
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardTables;
