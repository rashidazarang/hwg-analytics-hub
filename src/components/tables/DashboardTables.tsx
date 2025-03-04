
import React, { useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import AgreementsTable from '@/components/tables/AgreementsTable';
import ClaimsTable from '@/components/tables/ClaimsTable';
import { Claim, Dealer } from '@/lib/mockData';
import { DateRange } from '@/lib/dateUtils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
    console.log("🔄 DashboardTables - Current dealer UUID filter:", dealerFilter);
    console.log("🔄 DashboardTables - Current dealer name:", dealerName);
  }, [dealerFilter, dealerName]);

  return (
    <Card className="shadow-sm animate-fade-in">
      {dealerName && (
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-medium text-muted-foreground">
            {dealerName ? `Data for: ${dealerName}` : 'All Dealerships'}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-4">
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
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DashboardTables;
