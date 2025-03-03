
import React, { useState } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import AuthNav from '@/components/navigation/AuthNav';
import { DateRange } from '@/lib/dateUtils';
import KPISection from '@/components/metrics/KPISection';
import DashboardCharts from '@/components/charts/DashboardCharts';
import DashboardTables from '@/components/tables/DashboardTables';
import { mockClaims, mockDealers } from '@/lib/mockData';
import DealershipSearch from '@/components/search/DealershipSearch';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1), // Jan 1st of current year
    to: new Date()
  });
  const [dealershipFilter, setDealershipFilter] = useState<string>('');
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
  };

  // Create the subnavbar content with the dealership search
  const subnavbarContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <DealershipSearch 
          onDealershipSelect={handleDealershipSelect}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-2 px-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold">Dealer Management System</h1>
        <AuthNav />
      </header>
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
            claims={mockClaims}
            dealers={mockDealers}
          />
        </Dashboard>
      </main>
    </div>
  );
};

export default Index;
