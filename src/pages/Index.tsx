
import React, { useState, useEffect } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import AgreementsTable from '@/components/tables/AgreementsTable';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { Users, FileSignature, FileCheck, TrendingUp, Search } from 'lucide-react';
import { 
  mockClaims, 
  mockDealers, 
  calculateKPIs 
} from '@/lib/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';

const Index = () => {
  // Set default date range to YTD (Year-to-Date)
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));
  const [activeTab, setActiveTab] = useState('agreements');
  const [dealershipFilter, setDealershipFilter] = useState('');
  const queryClient = useQueryClient();
  
  // Calculate KPIs based on the selected date range
  const kpis = calculateKPIs([], mockClaims, mockDealers, dateRange);
  
  // Create the query key (must match AgreementsTable)
  const agreementsQueryKey = [
    "agreements-data",
    dateRange?.from?.toISOString() || "null",
    dateRange?.to?.toISOString() || "null",
  ];

  // Log React Query cache for debugging
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

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed to:", range);

    // Normalize the date range
    const normalizedRange = {
      from: range.from instanceof Date ? range.from : new Date(range.from),
      to: range.to instanceof Date ? range.to : new Date(range.to),
    };

    setDateRange(normalizedRange);

    // Log the key we're invalidating
    console.log("♻️ Invalidating query with key:", agreementsQueryKey);

    // Invalidate the specific query with the new date range
    queryClient.invalidateQueries({ 
      queryKey: agreementsQueryKey,
      exact: true
    });

    // Verify cache after invalidation
    setTimeout(() => {
      const dataAfterInvalidation = queryClient.getQueryData(agreementsQueryKey);
      console.log("🗑️ Cache after invalidation:", dataAfterInvalidation);
    }, 500);
  };

  // Reset search when changing tabs
  useEffect(() => {
    setDealershipFilter('');
  }, [activeTab]);

  // Subnavbar with tabs and search
  const subnavbar = (
    <div className="flex justify-between items-center">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="relative w-64">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={dealershipFilter}
          onChange={(e) => setDealershipFilter(e.target.value)}
          placeholder="Search by dealership..."
          className="pl-8"
        />
      </div>
    </div>
  );

  // KPI Section
  const kpiSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Active Agreements"
        value={kpis.activeAgreements.toLocaleString()}
        description={`${kpis.totalAgreements.toLocaleString()} total agreements`}
        icon={FileSignature}
        color="primary"
        trend={{
          value: 5.2,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Open Claims"
        value={kpis.openClaims.toLocaleString()}
        description={`${kpis.totalClaims.toLocaleString()} total claims`}
        icon={FileCheck}
        color="warning"
        trend={{
          value: 2.8,
          isPositive: false,
          label: "from last period"
        }}
      />
      <KPICard
        title="Active Dealers"
        value={kpis.activeDealers.toLocaleString()}
        description={`Across ${mockDealers.length} total dealers`}
        icon={Users}
        color="success"
        trend={{
          value: 1.5,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Avg. Claim Amount"
        value={`$${Math.round(kpis.averageClaimAmount).toLocaleString()}`}
        description={`$${Math.round(kpis.totalClaimsAmount).toLocaleString()} total claims amount`}
        icon={TrendingUp}
        color="info"
        trend={{
          value: 3.7,
          isPositive: false,
          label: "from last period"
        }}
      />
    </div>
  );

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={kpiSection}
      subnavbar={subnavbar}
    >
      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AgreementChart dateRange={dateRange} />
        <ClaimChart claims={mockClaims} dateRange={dateRange} />
      </div>
      
      {/* Tables section with tabs */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="agreements" className="mt-0">
            <AgreementsTable dateRange={dateRange} dealerFilter={dealershipFilter} />
          </TabsContent>
          
          <TabsContent value="claims" className="mt-0">
            <ClaimsTable claims={mockClaims} dealerFilter={dealershipFilter} />
          </TabsContent>
          
          <TabsContent value="dealers" className="mt-0">
            <DealersTable dealers={mockDealers} dealerFilter={dealershipFilter} />
          </TabsContent>
        </Tabs>
      </div>
    </Dashboard>
  );
};

export default Index;
