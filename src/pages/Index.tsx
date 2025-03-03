import React, { useState, useEffect, useRef } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import AgreementsTable from '@/components/tables/AgreementsTable';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { Users, FileSignature, FileCheck, TrendingUp, Search, X } from 'lucide-react';
import { 
  mockClaims, 
  mockDealers, 
  calculateKPIs 
} from '@/lib/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fetchDealershipNames = async (): Promise<{id: string, name: string}[]> => {
  console.log('🔍 Fetching dealership names from Supabase...');
  
  try {
    const PAGE_SIZE = 1000;
    let allDealers: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('dealers')
        .select('DealerUUID, PayeeID, Payee')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) {
        console.error('❌ Error fetching dealerships:', error);
        toast.error("Failed to load dealerships. Please try again.");
        return [];
      }
      
      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }
      
      allDealers = [...allDealers, ...data];
      
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    const dealerships = allDealers
      .filter(dealer => dealer.Payee && dealer.Payee.trim() !== '')
      .map(dealer => ({
        id: dealer.DealerUUID,
        name: dealer.Payee
      }));
    
    console.log(`✅ Successfully fetched ${dealerships.length} dealerships`);
    
    if (dealerships.length > 0) {
      console.log('📋 Sample dealerships:', dealerships.slice(0, 5));
    } else {
      console.warn('⚠️ No dealerships found in the database');
    }
    
    return dealerships;
  } catch (err) {
    console.error('❌ Exception when fetching dealerships:', err);
    toast.error("An error occurred while loading dealerships");
    return [];
  }
};

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));
  const [activeTab, setActiveTab] = useState('agreements');
  const [dealershipFilter, setDealershipFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const kpis = calculateKPIs([], mockClaims, mockDealers, dateRange);
  
  const agreementsQueryKey = [
    "agreements-data",
    dateRange?.from?.toISOString() || "null",
    dateRange?.to?.toISOString() || "null",
  ];

  const { data: dealerships = [], isLoading: isLoadingDealerships } = useQuery({
    queryKey: ['dealership-names'],
    queryFn: fetchDealershipNames,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    console.log("🛠️ Debugging React Query on Index.tsx...");
    console.log("📆 Current Date Range:", dateRange);
    console.log("🔑 Query Key:", agreementsQueryKey);
    console.log("🏪 Available Dealerships:", dealerships.length);

    setTimeout(() => {
      const cacheData = queryClient.getQueryData(agreementsQueryKey);
      console.log("📥 Agreements in React Query Cache:", cacheData);
      console.log("📏 Cache Size:", cacheData && Array.isArray(cacheData) ? cacheData.length : 0);
    }, 2000);
  }, [queryClient, dateRange, dealerships.length]);
  
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    setShowSuggestions(Boolean(searchValue.trim()));
    
    if (!searchValue.trim()) {
      handleDealershipSelect("");
    }
    
    console.log('🔍 Search Term:', searchValue);
  };

  const filteredDealerships = dealerships.filter(dealership => 
    dealership.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log("🔍 Search Term:", searchTerm);
  console.log("🏪 Filtered Dealerships Count:", filteredDealerships.length);
  
  if (filteredDealerships.length > 0 && searchTerm) {
    console.log("🏪 First Few Filtered Dealerships:", 
      filteredDealerships.slice(0, 3).map(d => d.name));
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm) {
      const matchedDealership = dealerships.find(dealership => 
        dealership.name?.toLowerCase() === searchTerm.toLowerCase()
      );
      
      if (matchedDealership) {
        handleDealershipSelect(matchedDealership.id);
      } else if (filteredDealerships.length > 0) {
        handleDealershipSelect(filteredDealerships[0].id);
      } else {
        handleDealershipSelect("");
      }
    } else {
      handleDealershipSelect("");
    }
    
    setShowSuggestions(false);
  };

  const handleDealershipSelect = (value: string) => {
    setSelectedDealershipId(value);
    
    const selected = dealerships.find(d => d.id === value);
    if (selected) {
      setDealershipFilter(selected.name);
      setSearchTerm(selected.name);
      
      queryClient.invalidateQueries({
        queryKey: ['agreement-status-distribution'],
        exact: false
      });
      
      console.log(`🔍 Selected dealership: ${selected.name} (${value})`);
      toast.success(`Filtered to dealership: ${selected.name}`);
    } else {
      setDealershipFilter('');
      
      if (!value) {
        setSearchTerm('');
      }
      
      queryClient.invalidateQueries({
        queryKey: ['agreement-status-distribution'],
        exact: false
      });
      
      console.log('🧹 Cleared dealership filter');
      if (searchTerm) {
        toast.info("Cleared dealership filter");
      }
    }
    
    setShowSuggestions(false);
  };

  const handleDealershipClick = (dealership: {id: string, name: string}) => {
    setSearchTerm(dealership.name);
    handleDealershipSelect(dealership.id);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    setDealershipFilter('');
    setSelectedDealershipId('');
    setShowSuggestions(false);
    
    queryClient.invalidateQueries({
      queryKey: ['agreement-status-distribution'],
      exact: false
    });
    
    toast.info("Cleared dealership filter");
  };

  const subnavbar = (
    <div className="flex justify-between items-center">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div ref={searchContainerRef} className="relative w-64">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <Input
            type="text"
            placeholder={isLoadingDealerships ? "Loading dealerships..." : "Search dealerships..."}
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(Boolean(searchTerm.trim()))}
            className="pl-8 pr-10 w-full"
            autoComplete="off"
            disabled={isLoadingDealerships}
          />
          
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-0 top-0 h-full flex items-center justify-center w-10 cursor-pointer"
              aria-label="Clear search"
              title="Clear search"
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors duration-200">
                <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </div>
            </button>
          )}
          
          <Button 
            type="submit" 
            variant="ghost" 
            size="sm" 
            className="absolute right-8 inset-y-0 px-2 opacity-0"
            disabled={isLoadingDealerships}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          {showSuggestions && (
            <div className="absolute mt-1 w-full rounded-md shadow-lg bg-popover z-10 max-h-60 overflow-auto">
              {isLoadingDealerships ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Loading dealerships...
                </div>
              ) : filteredDealerships.length > 0 ? (
                <div className="py-1">
                  {filteredDealerships.slice(0, 10).map(dealership => (
                    <div
                      key={dealership.id}
                      className={cn(
                        "px-4 py-2 text-sm hover:bg-accent cursor-pointer",
                        selectedDealershipId === dealership.id && "bg-accent"
                      )}
                      onClick={() => handleDealershipClick(dealership)}
                    >
                      {dealership.name}
                    </div>
                  ))}
                  {filteredDealerships.length > 10 && (
                    <div className="px-4 py-2 text-xs text-muted-foreground italic">
                      {filteredDealerships.length - 10} more results...
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No dealerships found
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AgreementChart dateRange={dateRange} dealerFilter={dealershipFilter} />
        <ClaimChart claims={mockClaims} dateRange={dateRange} />
      </div>
      
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
