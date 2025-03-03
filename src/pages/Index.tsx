
import React, { useState } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import KPISection from '@/components/metrics/KPISection';
import DashboardCharts from '@/components/charts/DashboardCharts';
import DashboardTables from '@/components/tables/DashboardTables';
import { mockClaims, mockDealers } from '@/lib/mockData';
import DealershipSearch from '@/components/search/DealershipSearch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1), // Jan 1st of current year
    to: new Date()
  });
  const [dealershipFilter, setDealershipFilter] = useState<string>('');
  const [dealershipName, setDealershipName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('agreements');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleDateRangeChange = (range: DateRange) => {
    console.log("Date range changed in Index:", range);
    setDateRange(range);
  };

  const handleTabChange = (value: string) => {
    console.log("Tab changed to:", value);
    setActiveTab(value);
  };

  const handleDealershipSelect = (dealershipId: string, dealershipName: string) => {
    console.log(`Selected dealership: ${dealershipName} (${dealershipId})`);
    setDealershipFilter(dealershipId);
    setDealershipName(dealershipName);
  };

  // Create the subnavbar content with tabs on the left and dealership search on the right
  const subnavbarContent = (
    <div className="flex items-center justify-between">
      <div>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="agreements">Agreements</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="dealers">Dealers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <DealershipSearch 
        onDealershipSelect={handleDealershipSelect}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Dashboard 
          onDateRangeChange={handleDateRangeChange}
          kpiSection={<KPISection dateRange={dateRange} />}
          subnavbar={subnavbarContent}
        >
          <DashboardCharts 
            dateRange={dateRange}
            dealershipFilter={dealershipFilter}
            claims={mockClaims}
          />
          <DashboardTables
            activeTab={activeTab}
            dateRange={dateRange}
            dealerFilter={dealershipFilter}
            dealerName={dealershipName}
            searchQuery={searchTerm}
            claims={mockClaims}
            dealers={mockDealers}
          />
        </Dashboard>
      </main>
    </div>
  );
};

export default Index;
