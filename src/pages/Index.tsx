import React, { useState, useEffect } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import KPISection from '@/components/metrics/KPISection';
import DashboardCharts from '@/components/charts/DashboardCharts';
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

const SubNavbar = ({ isDesktopHeader = false, isMobileMenu = false, isDesktopSubnavbar = false }) => {
  const [activeTab, setActiveTab] = useState<string>('agreements');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dealershipUUID, setDealershipUUID] = useState<string>('');
  const [dealershipName, setDealershipName] = useState<string>('');

  const handleTabChange = (value: string) => {
    console.log("📑 Tab changed to:", value);
    setActiveTab(value);
  };

  const handleDealershipSelect = (dealershipId: string, dealershipName: string) => {
    console.log(`🏢 Selected dealership: ID='${dealershipId}', Name='${dealershipName}'`);
    setDealershipUUID(dealershipId);
    setDealershipName(dealershipName);
  };

  if (typeof window !== 'undefined') {
    (window as any).dashboardActiveTab = activeTab;
    (window as any).dashboardDealershipUUID = dealershipUUID;
    (window as any).dashboardDealershipName = dealershipName;
    (window as any).dashboardSearchTerm = searchTerm;
  }

  if (isDesktopHeader) {
    return (
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-8 p-0.5 bg-muted/70">
          <TabsTrigger 
            value="agreements" 
            className="text-sm px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Agreements
          </TabsTrigger>
          <TabsTrigger 
            value="claims" 
            className="text-sm px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Claims
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  if (isMobileMenu) {
    return (
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-9 w-full p-0.5 bg-muted/70">
            <TabsTrigger 
              value="agreements" 
              className="flex-1 text-sm px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Agreements
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="flex-1 text-sm px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Claims
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full">
          <DealershipSearch 
            onDealershipSelect={handleDealershipSelect}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
      </div>
    );
  }

  if (isDesktopSubnavbar) {
    return (
      <DealershipSearch 
        onDealershipSelect={handleDealershipSelect}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
      <div className="w-full md:w-auto">
        <DealershipSearch 
          onDealershipSelect={handleDealershipSelect}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );
};

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });

  const [activeTab, setActiveTab] = useState<string>('agreements');
  const [dealershipUUID, setDealershipUUID] = useState<string>('');
  const [dealershipName, setDealershipName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const globalActiveTab = (window as any).dashboardActiveTab;
        const globalDealershipUUID = (window as any).dashboardDealershipUUID;
        const globalDealershipName = (window as any).dashboardDealershipName;
        const globalSearchTerm = (window as any).dashboardSearchTerm;
        
        if (globalActiveTab && globalActiveTab !== activeTab) {
          setActiveTab(globalActiveTab);
        }
        
        if (globalDealershipUUID !== undefined && globalDealershipUUID !== dealershipUUID) {
          setDealershipUUID(globalDealershipUUID || '');
        }
        
        if (globalDealershipName !== undefined && globalDealershipName !== dealershipName) {
          setDealershipName(globalDealershipName || '');
        }
        
        if (globalSearchTerm !== undefined && globalSearchTerm !== searchTerm) {
          setSearchTerm(globalSearchTerm || '');
        }
      }
    }, 100);
    
    return () => clearInterval(syncInterval);
  }, [activeTab, dealershipUUID, dealershipName, searchTerm]);

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed in Index:", range);
    setDateRange(range);
  };

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
    <div className="min-h-screen bg-background">
      <main>
        <Dashboard 
          onDateRangeChange={handleDateRangeChange}
          kpiSection={<KPISection dateRange={dateRange} dealerFilter={dealershipUUID} />}
          subnavbar={<SubNavbar />}
        >
          <DashboardCharts 
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
        </Dashboard>
      </main>
    </div>
  );
};

export default Index;
