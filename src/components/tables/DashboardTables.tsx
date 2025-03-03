
import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import AgreementsTable from '@/components/tables/AgreementsTable';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import { Claim, Dealer } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';

type DashboardTablesProps = {
  activeTab: string;
  dateRange: DateRange;
  dealerFilter: string;
  searchQuery?: string;
  claims: Claim[];
  dealers: Dealer[];
};

const DashboardTables: React.FC<DashboardTablesProps> = ({
  activeTab,
  dateRange,
  dealerFilter,
  searchQuery = '',
  claims,
  dealers
}) => {
  return (
    <div className="space-y-6 mt-6">
      <Tabs value={activeTab} defaultValue={activeTab}>
        <TabsContent value="agreements" className="mt-0">
          <AgreementsTable 
            dateRange={dateRange} 
            dealerFilter={dealerFilter}
            searchQuery={searchQuery} 
          />
        </TabsContent>
        
        <TabsContent value="claims" className="mt-0">
          <ClaimsTable 
            claims={claims} 
            dealerFilter={dealerFilter}
            searchQuery={searchQuery}
          />
        </TabsContent>
        
        <TabsContent value="dealers" className="mt-0">
          <DealersTable 
            dealers={dealers} 
            dealerFilter={dealerFilter}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardTables;
