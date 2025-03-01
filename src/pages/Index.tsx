
import React, { useState } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, FileSignature, FileCheck, TrendingUp } from 'lucide-react';
import { 
  mockAgreements, 
  mockClaims, 
  mockDealers, 
  calculateKPIs 
} from '@/lib/mockData';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('mtd'));
  const [activeTab, setActiveTab] = useState<string>("claims");
  
  // Calculate KPIs based on the selected date range
  const kpis = calculateKPIs(mockAgreements, mockClaims, mockDealers, dateRange);
  
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // This will trigger a re-render with the new date range
    // and all components will update accordingly
  };

  // Render KPI section
  const kpiSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Active Agreements"
        value={kpis.activeAgreements.toLocaleString()}
        description={`$${Math.round(kpis.totalAgreementsValue).toLocaleString()} total value`}
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
        <AgreementChart agreements={mockAgreements} dateRange={dateRange} />
        <ClaimChart claims={mockClaims} dateRange={dateRange} />
      </div>
      
      {/* Tables section with tabs */}
      <div className="space-y-6">
        <Tabs defaultValue="claims" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Data Records</h2>
            <TabsList>
              <TabsTrigger value="claims">Claims</TabsTrigger>
              <TabsTrigger value="dealers">Dealers</TabsTrigger>
            </TabsList>
          </div>
          
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
