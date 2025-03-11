import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DateRange } from '@/lib/dateUtils';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSignature, AlertTriangle, Banknote, AreaChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/navigation/Sidebar';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import Dashboard from '@/components/layout/Dashboard';
import DealerProfileHeader from '@/components/dealer-profile/DealerProfileHeader';
import DealerProfileMetrics from '@/components/dealer-profile/DealerProfileMetrics';
import DealerAgreementsTable from '@/components/dealer-profile/DealerAgreementsTable';
import DealerClaimsTable from '@/components/dealer-profile/DealerClaimsTable';
import DealerRevenueChart from '@/components/dealer-profile/DealerRevenueChart';
import DealerDistributionCharts from '@/components/dealer-profile/DealerDistributionCharts';
import { useDealerProfileData, useDealerAgreements, useDealerClaims } from '@/hooks/useDealerProfileData';

const DealerProfile: React.FC = () => {
  // Get dealer UUID from URL params
  const { dealerId } = useParams<{ dealerId: string }>();
  const navigate = useNavigate();
  
  // Use global date range
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);

  // Use dealerId directly without formatting
  const dealerIdToUse = dealerId || '';

  // If dealerId is missing, redirect to leaderboard
  React.useEffect(() => {
    if (!dealerId) {
      navigate('/leaderboard');
    }
  }, [dealerId, navigate]);

  // Fetch dealer profile data with dealer ID directly
  const {
    data: dealerProfileData,
    isLoading: isProfileLoading
  } = useDealerProfileData(dealerIdToUse, dateRange);

  // Fetch dealer agreements with dealer ID directly
  const {
    data: dealerAgreements,
    isLoading: isAgreementsLoading
  } = useDealerAgreements(dealerIdToUse, dateRange);

  // Fetch dealer claims with dealer ID directly
  const {
    data: dealerClaims,
    isLoading: isClaimsLoading
  } = useDealerClaims(dealerIdToUse, dateRange);

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // KPI Section for Dashboard component
  const kpiSection = (
    <div className="w-full">
      <DealerProfileHeader 
        profile={dealerProfileData?.profile || {
          dealer_uuid: dealerId || '',
          dealer_name: 'Loading...',
          dealer_address: null,
          dealer_city: null,
          dealer_region: null,
          dealer_country: null,
          dealer_postal_code: null,
          dealer_contact: null,
          dealer_phone: null,
          dealer_email: null,
          total_contracts: 0,
          active_contracts: 0,
          pending_contracts: 0,
          cancelled_contracts: 0,
          expired_contracts: 0,
          total_revenue: 0,
          expected_revenue: 0,
          funded_revenue: 0,
          total_claims: 0,
          open_claims: 0,
          closed_claims: 0,
          claims_per_contract: 0,
          avg_claim_resolution_days: 0
        }} 
        isLoading={isProfileLoading} 
      />
      <DealerProfileMetrics 
        profile={dealerProfileData?.profile || {
          dealer_uuid: dealerId || '',
          dealer_name: 'Loading...',
          dealer_address: null,
          dealer_city: null,
          dealer_region: null,
          dealer_country: null,
          dealer_postal_code: null,
          dealer_contact: null,
          dealer_phone: null,
          dealer_email: null,
          total_contracts: 0,
          active_contracts: 0,
          pending_contracts: 0,
          cancelled_contracts: 0,
          expired_contracts: 0,
          total_revenue: 0,
          expected_revenue: 0,
          funded_revenue: 0,
          total_claims: 0,
          open_claims: 0,
          closed_claims: 0,
          claims_per_contract: 0,
          avg_claim_resolution_days: 0
        }} 
        isLoading={isProfileLoading} 
      />
    </div>
  );

  // If page is loaded outside of the router (without a dealerId), show error
  if (!dealerId) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="ml-64 flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Dealer ID Not Found</h1>
            <p className="mb-4 text-muted-foreground">Please select a dealer from the leaderboard.</p>
            <Button onClick={() => navigate('/leaderboard')}>
              Go to Leaderboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      pageTitle="Dealer Profile"
      onDateRangeChange={handleDateRangeChange}
      kpiSection={kpiSection}
    >
      {/* Distribution Charts */}
      <DealerDistributionCharts 
        agreementDistribution={dealerProfileData?.agreementDistribution || []}
        claimsDistribution={dealerProfileData?.claimsDistribution || []}
        isLoading={isProfileLoading}
      />

      {/* Revenue Trends Chart */}
      <DealerRevenueChart 
        data={dealerProfileData?.monthlyRevenue || []}
        isLoading={isProfileLoading}
      />

      {/* Tabs for Agreements and Claims */}
      <Tabs defaultValue="agreements" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="agreements" className="data-[state=active]:bg-primary/10">
            <FileSignature className="h-4 w-4 mr-2" />
            Agreements
          </TabsTrigger>
          <TabsTrigger value="claims" className="data-[state=active]:bg-primary/10">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Claims
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agreements">
          <DealerAgreementsTable 
            data={dealerAgreements || []}
            isLoading={isAgreementsLoading}
          />
        </TabsContent>

        <TabsContent value="claims">
          <DealerClaimsTable 
            data={dealerClaims || []}
            isLoading={isClaimsLoading}
          />
        </TabsContent>
      </Tabs>
    </Dashboard>
  );
};

export default DealerProfile;