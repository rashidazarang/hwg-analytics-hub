
import React, { useEffect, useState } from 'react';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import { 
  mockAgreements, 
  mockClaims, 
  mockDealers, 
  calculateKPIs 
} from '@/lib/mockData';
import { 
  FileText, 
  AlertCircle, 
  Users, 
  DollarSign, 
  BarChart3,
  ClipboardCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('mtd'));
  const [metrics, setMetrics] = useState(calculateKPIs(mockAgreements, mockClaims, mockDealers, dateRange));
  
  useEffect(() => {
    // Recalculate metrics when date range changes
    setMetrics(calculateKPIs(mockAgreements, mockClaims, mockDealers, dateRange));
  }, [dateRange]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Filter data based on date range
  const filteredClaims = mockClaims.filter(
    claim => claim.dateReported >= dateRange.from && claim.dateReported <= dateRange.to
  );

  // KPI Section
  const kpiSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Active Agreements"
        value={metrics.activeAgreements.toLocaleString()}
        icon={FileText}
        trend={{
          value: 12,
          isPositive: true,
          label: "vs. previous period"
        }}
        color="primary"
      />
      
      <KPICard
        title="Total Claims"
        value={metrics.totalClaims.toLocaleString()}
        icon={AlertCircle}
        trend={{
          value: 5,
          isPositive: false,
          label: "vs. previous period"
        }}
        color="warning"
      />
      
      <KPICard
        title="Open Claims"
        value={metrics.openClaims.toLocaleString()}
        icon={ClipboardCheck}
        description={`${metrics.closedClaims} claims closed`}
        color="info"
      />
      
      <KPICard
        title="Active Dealers"
        value={metrics.activeDealers.toLocaleString()}
        icon={Users}
        color="success"
      />
      
      <KPICard
        title="Total Agreement Value"
        value={`$${metrics.totalAgreementsValue.toLocaleString()}`}
        icon={DollarSign}
        trend={{
          value: 8,
          isPositive: true,
          label: "vs. previous period"
        }}
      />
      
      <KPICard
        title="Avg. Claim Amount"
        value={`$${Math.round(metrics.averageClaimAmount).toLocaleString()}`}
        icon={BarChart3}
        trend={{
          value: 3,
          isPositive: false,
          label: "vs. previous period"
        }}
        color="destructive"
      />
    </div>
  );

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={kpiSection}
    >
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AgreementChart agreements={mockAgreements} dateRange={dateRange} />
        <ClaimChart claims={mockClaims} dateRange={dateRange} />
      </div>
      
      {/* Tables Section */}
      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
        </TabsList>
        <TabsContent value="claims" className="animate-fade-in">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="section-title mb-4">Claims Details</h2>
            <ClaimsTable claims={filteredClaims} />
          </div>
        </TabsContent>
        <TabsContent value="dealers" className="animate-fade-in">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="section-title mb-4">Dealer Performance</h2>
            <DealersTable dealers={mockDealers} />
          </div>
        </TabsContent>
      </Tabs>
    </Dashboard>
  );
};

export default Index;
