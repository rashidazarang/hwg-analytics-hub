
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import TabSwitchedKPISection from '@/components/metrics/TabSwitchedKPISection';
import TabSwitchedDashboardCharts from '@/components/charts/TabSwitchedDashboardCharts';
import DashboardTables from '@/components/tables/DashboardTables';
import DealershipSearch from '@/components/search/DealershipSearch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Claim } from '@/lib/types';

const fetchClaimsForCharts = async (dealerFilter?: string): Promise<Claim[]> => {
  let query = supabase
    .from("claims")
    .select(`
      *,
      agreements:AgreementID(
        DealerUUID,
        dealers:DealerUUID(
          PayeeID,
          Payee
        )
      )
    `);

  if (dealerFilter) {
    query = query.eq("agreements.DealerUUID", dealerFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching claims for charts:", error);
    return [];
  }

  return (data || []).map(claim => ({
    ...claim,
    ReportedDate: claim.ReportedDate ? new Date(claim.ReportedDate) : null,
    IncurredDate: claim.IncurredDate ? new Date(claim.IncurredDate) : null,
    Closed: claim.Closed ? new Date(claim.Closed) : null,
  }));
};

const Index = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });
  const [dealershipUUID, setDealershipUUID] = useState<string>('');
  const [dealershipName, setDealershipName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('agreements');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Check authentication
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/auth');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed in Index:", range);
    setDateRange(range);
  };

  const handleTabChange = (value: string) => {
    console.log("📑 Tab changed to:", value);
    setActiveTab(value);
  };

  const handleDealershipSelect = (dealershipId: string, dealershipName: string) => {
    console.log(`🏢 Selected dealership in Index: ID='${dealershipId}', Name='${dealershipName}'`);
    setDealershipUUID(dealershipId);
    setDealershipName(dealershipName);
  };

  const subnavbarContent = (
    <div 
      className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full sm:w-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-8 xs:h-9 p-0.5 bg-muted/70 w-full sm:w-auto">
            <TabsTrigger 
              value="agreements" 
              className="text-xs xs:text-sm w-1/2 sm:w-auto px-2 xs:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Agreements
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="text-xs xs:text-sm w-1/2 sm:w-auto px-2 xs:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Claims
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="w-full sm:w-auto min-w-0 sm:min-w-[240px]">
        <DealershipSearch 
          onDealershipSelect={handleDealershipSelect}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );

  const { data: claims = [] } = useQuery({
    queryKey: ['claims-for-charts', dealershipUUID],
    queryFn: () => fetchClaimsForCharts(dealershipUUID),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    console.log(`📊 Index: Current dealership state - UUID: '${dealershipUUID}', Name: '${dealershipName}'`);
    console.log(`📅 Index: Current dateRange: ${dateRange.from} to ${dateRange.to}`);
  }, [dealershipUUID, dealershipName, dateRange]);

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={
        <TabSwitchedKPISection 
          activeTab={activeTab} 
          dateRange={dateRange} 
          dealerFilter={dealershipUUID} 
        />
      }
      subnavbar={subnavbarContent}
      pageTitle="Analytics Dashboard" // Adding consistent page title
    >
      <div className="w-full overflow-x-hidden">
        <TabSwitchedDashboardCharts 
          activeTab={activeTab}
          dateRange={dateRange}
          dealershipFilter={dealershipUUID}
        />
        <DashboardTables
          activeTab={activeTab}
          dateRange={dateRange}
          dealerFilter={dealershipUUID}
          dealerName={dealershipName}
          searchQuery={searchTerm}
        />
      </div>
    </Dashboard>
  );
};

export default Index;
