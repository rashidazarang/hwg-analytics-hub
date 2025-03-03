
import React, { useState, useEffect } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import DashboardTabs from '@/components/navigation/DashboardTabs';
import KPISection from '@/components/metrics/KPISection';
import DashboardCharts from '@/components/charts/DashboardCharts';
import DashboardTables from '@/components/tables/DashboardTables';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { mockClaims, mockDealers, calculateKPIs } from '@/lib/mockData';
import { useQueryClient } from '@tanstack/react-query';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));
  const [activeTab, setActiveTab] = useState('agreements');
  const [dealershipFilter, setDealershipFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>('');
  const queryClient = useQueryClient();
  
  const kpis = calculateKPIs([], mockClaims, mockDealers, dateRange);
  
  const agreementsQueryKey = [
    "agreements-data",
    dateRange?.from?.toISOString() || "null",
    dateRange?.to?.toISOString() || "null",
  ];

  useEffect(() => {
    console.log("🛠️ Debugging React Query on Index.tsx...");
    console.log("📆 Current Date Range:", dateRange);
    console.log("🔑 Query Key:", agreementsQueryKey);

    setTimeout(() => {
      const cacheData = queryClient.getQueryData(agreementsQueryKey);
      console.log("📥 Agreements in React Query Cache:", cacheData);
      console.log("📏 Cache Size:", cacheData && Array.isArray(cacheData) ? cacheData.length : 0);
    }, 2000);
  }, [queryClient, dateRange]);
  
  useEffect(() => {
    setDealershipFilter('');
    setSearchTerm('');
    setSelectedDealershipId('');
  }, [activeTab]);

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed to:", range);

    const normalizedRange = {
      from: range.from instanceof Date ? range.from : new Date(range.from),
      to: range.to instanceof Date ? range.to : new Date(range.to),
    };

    setDateRange(normalizedRange);

    console.log("♻️ Invalidating query with key:", agreementsQueryKey);

    queryClient.invalidateQueries({ 
      queryKey: agreementsQueryKey,
      exact: true
    });

    queryClient.invalidateQueries({
      queryKey: ['agreement-status-distribution'],
      exact: false
    });

    setTimeout(() => {
      const dataAfterInvalidation = queryClient.getQueryData(agreementsQueryKey);
      console.log("🗑️ Cache after invalidation:", dataAfterInvalidation);
    }, 500);
  };

  const handleDealershipSelect = (dealershipId: string, dealershipName: string) => {
    setSelectedDealershipId(dealershipId);
    setDealershipFilter(dealershipName);
    
    queryClient.invalidateQueries({
      queryKey: ['agreement-status-distribution'],
      exact: false
    });
  };

  // Subnavbar component with search and tabs
  const subnavbar = (
    <DashboardTabs
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      onDealershipSelect={handleDealershipSelect}
    />
  );

  // KPI metrics section
  const kpiSection = <KPISection kpis={kpis} />;

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={kpiSection}
      subnavbar={subnavbar}
    >
      {/* Charts Section */}
      <DashboardCharts 
        dateRange={dateRange} 
        dealershipFilter={dealershipFilter}
        claims={mockClaims}
      />
      
      {/* Data Tables Section */}
      <DashboardTables
        activeTab={activeTab}
        dateRange={dateRange}
        dealerFilter={dealershipFilter}
        claims={mockClaims}
        dealers={mockDealers}
      />
    </Dashboard>
  );
};

export default Index;
