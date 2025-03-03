
import React, { useState, useEffect } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import KPICard from '@/components/metrics/KPICard';
import AgreementChart from '@/components/charts/AgreementChart';
import ClaimChart from '@/components/charts/ClaimChart';
import ClaimsTable from '@/components/tables/ClaimsTable';
import DealersTable from '@/components/tables/DealersTable';
import AgreementsTable from '@/components/tables/AgreementsTable';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import { Users, FileSignature, FileCheck, TrendingUp, Check, ChevronsUpDown } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

// Function to fetch dealership names
const fetchDealershipNames = async (): Promise<{id: string, name: string}[]> => {
  const { data, error } = await supabase
    .from('dealers')
    .select('DealerUUID, Payee')
    .not('Payee', 'is', null)
    .order('Payee', { ascending: true });
  
  if (error) {
    console.error('Error fetching dealerships:', error);
    return [];
  }
  
  return data
    .filter(dealer => dealer.Payee) // Ensure Payee exists
    .map(dealer => ({
      id: dealer.DealerUUID,
      name: dealer.Payee
    }));
};

const Index = () => {
  // Set default date range to YTD (Year-to-Date)
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));
  const [activeTab, setActiveTab] = useState('agreements');
  const [dealershipFilter, setDealershipFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedDealership, setSelectedDealership] = useState<string>('');
  const queryClient = useQueryClient();
  
  // Calculate KPIs based on the selected date range
  const kpis = calculateKPIs([], mockClaims, mockDealers, dateRange);
  
  // Create the query key (must match AgreementsTable)
  const agreementsQueryKey = [
    "agreements-data",
    dateRange?.from?.toISOString() || "null",
    dateRange?.to?.toISOString() || "null",
  ];

  // Fetch dealership names for autofill
  const { data: dealerships = [] } = useQuery({
    queryKey: ['dealership-names'],
    queryFn: fetchDealershipNames,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: false,
  });

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

    // Also invalidate the agreement status distribution query
    queryClient.invalidateQueries({
      queryKey: ['agreement-status-distribution'],
      exact: false
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
    setSelectedDealership('');
  }, [activeTab]);

  // Apply filter when a dealership is selected
  const handleDealershipSelect = (value: string) => {
    setSelectedDealership(value);
    
    // Get the dealership name from the selected value
    const selected = dealerships.find(d => d.id === value);
    if (selected) {
      setDealershipFilter(selected.name);
      
      // Invalidate the agreement status distribution query
      queryClient.invalidateQueries({
        queryKey: ['agreement-status-distribution'],
        exact: false
      });
      
      console.log(`🔍 Selected dealership: ${selected.name} (${value})`);
    } else {
      // If no dealership is selected (clear selection)
      setDealershipFilter('');
      
      // Invalidate the agreement status distribution query
      queryClient.invalidateQueries({
        queryKey: ['agreement-status-distribution'],
        exact: false
      });
      
      console.log('🧹 Cleared dealership filter');
    }
  };

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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between pl-8"
            >
              {selectedDealership
                ? dealerships.find((dealership) => dealership.id === selectedDealership)?.name
                : "Search by dealership..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search dealership..." />
              <CommandEmpty>No dealership found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {dealerships.map((dealership) => (
                  <CommandItem
                    key={dealership.id}
                    value={dealership.name}
                    onSelect={() => {
                      handleDealershipSelect(dealership.id === selectedDealership ? "" : dealership.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedDealership === dealership.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {dealership.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
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
        <AgreementChart dateRange={dateRange} dealerFilter={dealershipFilter} />
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
