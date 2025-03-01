
import React, { useState, useEffect } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import AgreementsTable from '@/components/tables/AgreementsTable';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { Users, FileSignature, FileCheck, TrendingUp } from 'lucide-react';
import { 
  mockClaims, 
  mockDealers, 
  calculateKPIs 
} from '@/lib/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const Index = () => {
  // Set default date range to YTD (Year-to-Date)
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));
  const [activeTab, setActiveTab] = useState('agreements');
  const queryClient = useQueryClient();
  
  // Calculate KPIs based on the selected date range - we'll keep mock data for KPIs for now
  const kpis = calculateKPIs([], mockClaims, mockDealers, dateRange);
  
  // Log React Query cache for debugging
  useEffect(() => {
    console.log("React Query client initialized on Index");
    
    // Log the current date range when it changes
    console.log("Current date range:", dateRange);
    
    // Create the same query key that's used in AgreementsTable
    const fromStr = dateRange.from.toISOString();
    const toStr = dateRange.to.toISOString();
    const agreementsQueryKey = ["agreements-data", fromStr, toStr];
    
    // Debug React Query cache
    setTimeout(() => {
      const data = queryClient.getQueryData(agreementsQueryKey);
      console.log("Agreements in React Query cache (Index.tsx):", data);
      console.log("Cache size from Index:", data && Array.isArray(data) ? data.length : 0);
    }, 1000);
  }, [queryClient, dateRange]);
  
  const handleDateRangeChange = (range: DateRange) => {
    console.log("Date range changed to:", range);
    
    // Force date objects to be consistent
    const normalizedRange = {
      from: range.from instanceof Date ? range.from : new Date(range.from),
      to: range.to instanceof Date ? range.to : new Date(range.to),
    };
    
    setDateRange(normalizedRange);
    
    // Create a query key using the SAME format as in AgreementsTable
    const fromStr = normalizedRange.from.toISOString();
    const toStr = normalizedRange.to.toISOString();
    const agreementsQueryKey = ["agreements-data", fromStr, toStr];
    
    // Log the key we're invalidating
    console.log("Invalidating with key:", agreementsQueryKey);
    
    // Invalidate the specific query with the new date range
    queryClient.invalidateQueries({ 
      queryKey: agreementsQueryKey,
      exact: true
    });
    
    // Check if invalidation worked
    setTimeout(() => {
      const dataAfterInvalidation = queryClient.getQueryData(agreementsQueryKey);
      console.log("Cache after invalidation:", dataAfterInvalidation);
    }, 500);
    
    toast.info(`Date range updated: ${normalizedRange.from.toLocaleDateString()} to ${normalizedRange.to.toLocaleDateString()}`);
  };

  // Render KPI section
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
    >
      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AgreementChart agreements={[]} dateRange={dateRange} />
        <ClaimChart claims={mockClaims} dateRange={dateRange} />
      </div>
      
      {/* Tables section with tabs */}
      <div className="space-y-6">
        <Tabs defaultValue="agreements" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Records & Performance</h2>
            <TabsList>
              <TabsTrigger value="agreements">Agreements</TabsTrigger>
              <TabsTrigger value="claims">Claims</TabsTrigger>
              <TabsTrigger value="dealers">Dealers</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="agreements" className="mt-0">
            <AgreementsTable dateRange={dateRange} />
          </TabsContent>
          
          <TabsContent value="claims" className="mt-0">
            <ClaimsTable claims={mockClaims} />
          </TabsContent>
          
          <TabsContent value="dealers" className="mt-0">
            <DealersTable dealers={mockDealers} />
          </TabsContent>
        </Tabs>
      </div>
    </Dashboard>
  );
};

export default Index;
