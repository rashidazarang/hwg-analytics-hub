
import React, { useState } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import AgreementsTable from '@/components/tables/AgreementsTable';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { Users, FileSignature, FileCheck, TrendingUp } from 'lucide-react';
import { mockAgreements, mockClaims, mockDealers } from '@/lib/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardKPIs, useAgreements, useClaims, useDealers } from '@/hooks/useSupabaseData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('mtd'));
  const [activeTab, setActiveTab] = useState('agreements');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  // Fetch data using React Query hooks
  const { 
    data: kpisData,
    isLoading: isLoadingKPIs,
    error: kpisError
  } = useDashboardKPIs(dateRange);
  
  const {
    data: agreementsData,
    isLoading: isLoadingAgreements,
    error: agreementsError
  } = useAgreements({ dateRange, page, pageSize });
  
  const {
    data: claimsData,
    isLoading: isLoadingClaims,
    error: claimsError
  } = useClaims({ dateRange, page, pageSize });
  
  const {
    data: dealersData,
    isLoading: isLoadingDealers,
    error: dealersError
  } = useDealers();

  // Use Supabase data if available, fallback to mock data if not
  const agreements = agreementsData?.data || mockAgreements;
  const claims = claimsData?.data || mockClaims;
  const dealers = dealersData?.data || mockDealers;
  
  // Use Supabase KPIs if available, fallback to mock calculation
  const kpis = kpisData || {
    activeAgreements: 0,
    totalAgreements: 0,
    openClaims: 0,
    totalClaims: 0,
    activeDealers: 0,
    totalClaimsAmount: 0,
    averageClaimAmount: 0
  };
  
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    // Reset page when changing date range
    setPage(1);
  };

  // Render KPI section
  const kpiSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoadingKPIs ? (
        <>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </>
      ) : kpisError ? (
        <Alert variant="destructive" className="col-span-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load KPI data. Please try again later.
          </AlertDescription>
        </Alert>
      ) : (
        <>
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
            description={`Across ${dealers.length} total dealers`}
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
        </>
      )}
    </div>
  );

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={kpiSection}
    >
      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AgreementChart agreements={agreements} dateRange={dateRange} />
        <ClaimChart claims={claims} dateRange={dateRange} />
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
            {isLoadingAgreements ? (
              <Skeleton className="h-96 w-full" />
            ) : agreementsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load agreements data. Please try again later.
                </AlertDescription>
              </Alert>
            ) : (
              <AgreementsTable 
                agreements={agreements} 
                isLoading={isLoadingAgreements}
                totalCount={agreementsData?.count || 0}
                currentPage={page}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </TabsContent>
          
          <TabsContent value="claims" className="mt-0">
            {isLoadingClaims ? (
              <Skeleton className="h-96 w-full" />
            ) : claimsError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load claims data. Please try again later.
                </AlertDescription>
              </Alert>
            ) : (
              <ClaimsTable 
                claims={claims} 
                isLoading={isLoadingClaims}
                totalCount={claimsData?.count || 0}
                currentPage={page}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </TabsContent>
          
          <TabsContent value="dealers" className="mt-0">
            {isLoadingDealers ? (
              <Skeleton className="h-96 w-full" />
            ) : dealersError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load dealers data. Please try again later.
                </AlertDescription>
              </Alert>
            ) : (
              <DealersTable 
                dealers={dealers} 
                isLoading={isLoadingDealers}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Dashboard>
  );
};

export default Index;
