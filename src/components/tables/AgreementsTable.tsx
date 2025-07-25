import React from 'react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { Agreement } from '@/lib/types';
import FilterDropdown, { FilterOption } from '@/components/ui/filter-dropdown';
import { searchAgreementById } from '@/hooks/useSharedAgreementsData';
import { useAgreementsFetching } from '@/hooks/useAgreementsFetching';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Dealer {
  DealerUUID: string;
  PayeeID: string;
  Payee?: string | null;
}

const PAGE_SIZE = 100; // Set consistent page size for agreements

const AGREEMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "VOID", label: "Void" },
  { value: "CLAIMABLE", label: "Claimable" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" }
];

// fetchAgreements function removed - now using useAgreementsFetching hook

async function fetchDealers() {
  try {
    // Fetch dealers from Supabase

    console.log("🔍 Fetching dealers...");
    const PAGE_SIZE = 1000;
    let allDealers: Dealer[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("dealers")
        .select("DealerUUID, PayeeID, Payee")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error("❌ Supabase Error fetching dealers:", error);
        toast.error("Failed to load dealer information");
        return allDealers; // Return what we have so far
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

    console.log("✅ Fetched Dealers:", allDealers.length, "records");
    return allDealers;
  } catch (error) {
    console.error("❌ Exception in fetchDealers:", error);
    toast.error("An unexpected error occurred while loading dealers");
    return [];
  }
}

type AgreementsTableProps = {
  className?: string;
  dateRange?: DateRange;
  searchQuery?: string;
  dealerFilter?: string; // This should be the UUID of the dealer
  dealerName?: string;   // This is the display name of the dealer
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({ 
  className = '', 
  dateRange, 
  searchQuery = '',
  dealerFilter = '',  // This is the dealer UUID
  dealerName = ''     // This is the dealer display name
}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [isIdSearch, setIsIdSearch] = useState(false);

  useEffect(() => {
    console.log('🔍 AgreementsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 AgreementsTable - Current dealer name:', dealerName);
    console.log('🔍 AgreementsTable - Current date range:', dateRange);
    
    // Reset to page 1 when filters change
    setPage(1);
    
    // When filter parameters change, explicitly refetch data
    // This ensures we get a fresh dataset with the new filters
    if (dealerFilter || dateRange) {
      queryClient.invalidateQueries({ queryKey: ["agreements-data"] });
    }
  }, [dealerFilter, dealerName, dateRange, queryClient]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
      setPage(1);
    }
  }, [searchQuery]);

  // Check if the search term is an ID search
  const isIdSearchPattern = useMemo(() => {
    const term = searchTerm.trim();
    return term.length >= 3 && /^[a-zA-Z0-9-]+$/.test(term);
  }, [searchTerm]);

  // Use the ID search hook when doing an ID search
  const { 
    data: idSearchResults = { data: [], count: 0 },
    isFetching: isFetchingIdSearch,
    error: idSearchError
  } = searchAgreementById(isIdSearch ? searchTerm : '');

  useEffect(() => {
    if (idSearchError) {
      console.error("Failed to search agreements by ID:", idSearchError);
      toast.error("Failed to search for agreement by ID");
    }
  }, [idSearchError]);

  const agreementsQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    return ["agreements-data", from, to, dealerFilter, page, pageSize, statusFilters];
  }, [dateRange, dealerFilter, page, pageSize, statusFilters]);
  
  // Use the new shared agreements fetching hook
  const { 
    data: agreementsData = { data: [], count: 0 }, 
    isFetching: isFetchingAgreements,
    error: agreementsError,
    refetch: refetchAgreements
  } = useAgreementsFetching(
    page, 
    pageSize, 
    dealerFilter, 
    dateRange, 
    statusFilters
  ) as any; // Enable only when not doing an ID search

  // Disable the fetching when doing ID search to avoid conflicts
  const isRegularFetchEnabled = !isIdSearch;

  useEffect(() => {
    if (agreementsError) {
      console.error("Failed to load agreements:", agreementsError);
      toast.error("Failed to load agreements data");
      
      const timer = setTimeout(() => {
        console.log("🔄 Auto-retrying agreements fetch after error");
        refetchAgreements();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [agreementsError, refetchAgreements]);
  
  // Use ID search results when doing an ID search, otherwise use regular agreements data
  const agreements = isIdSearch ? idSearchResults.data : agreementsData.data || [];
  const totalCount = isIdSearch ? idSearchResults.count : agreementsData.count || 0;

  const { 
    data: dealers = [],
    isFetching: isFetchingDealers,
    error: dealersError 
  } = useQuery({
    queryKey: ["dealers-data"],
    queryFn: fetchDealers,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 5000),
  });
  
  useEffect(() => {
    if (dealersError) {
      console.error("Failed to load dealers:", dealersError);
      toast.error("Failed to load dealer information");
    }
  }, [dealersError]);
  
  const dealerMap = useMemo(() => {
    if (!dealers || dealers.length === 0) {
      console.warn("⚠️ No dealers found, returning empty map.");
      return {};
    }
  
    const map = dealers.reduce<Record<string, Dealer>>((acc, dealer) => {
      if (dealer.DealerUUID) {
        acc[dealer.DealerUUID.trim().toLowerCase()] = dealer;
      }
      if (dealer.PayeeID) {
        acc[dealer.PayeeID.trim().toLowerCase()] = dealer;
      }
      return acc;
    }, {});
  
    console.log(`✅ Created dealer map with ${Object.keys(map).length} entries`);
    return map;
  }, [dealers]);
  
  const filteredAgreements = useMemo(() => {
    console.log(`🔍 Filtering ${agreements.length} agreements with search term: "${searchTerm}"`);
    console.log(`🔍 Filtering agreements by status:`, statusFilters);
    
    // If we're doing an ID search, don't apply additional filtering
    if (isIdSearch) {
      return agreements;
    }
    
    let filtered = agreements;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(agreement => {
        const payee = agreement.dealers?.Payee || "";
        const dealerName = typeof payee === 'string' ? payee.toLowerCase() : "";
        
        return (
          (agreement.AgreementID && agreement.AgreementID.toLowerCase().includes(term)) ||
          (dealerName && dealerName.includes(term))
        );
      });
    }
    
    return filtered;
  }, [agreements, searchTerm, statusFilters, isIdSearch]);
  
  useEffect(() => {
    if (agreements.length > 0) {
      const statusCounts: Record<string, number> = {};
      agreements.forEach(agreement => {
        const status = agreement.AgreementStatus || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('🔍 AgreementsTable - Status counts in current page:', statusCounts);
      console.log('🔍 AgreementsTable - Total count from query:', totalCount);
    }
  }, [agreements, totalCount]);

  const isFetching = isFetchingAgreements || isFetchingDealers || isFetchingIdSearch;

  const handleSearch = (term: string) => {
    console.log("🔍 Search term updated:", term);
    setSearchTerm(term);
    setPage(1);
    
    // Check if this is an ID search
    const isIdSearchPattern = term.trim().length >= 3 && /^[a-zA-Z0-9-]+$/.test(term.trim());
    setIsIdSearch(isIdSearchPattern);
    
    // When searching locally, we should reset the filter if the term is cleared
    if (!term.trim() && searchTerm.trim()) {
      queryClient.invalidateQueries({ queryKey: ["agreements-data"] });
    }
  };

  const handlePageChange = (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
  };

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
    }
  }, [pageSize, setPage]);

  const handleStatusFilterChange = (values: string[]) => {
    console.log('🔍 Status filter changed to:', values);
    setStatusFilters(values);
    setPage(1);
  };

  const formatName = (name?: string | null): string => {
    if (!name) return '';
    return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const columns: Column<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: false,
      searchable: true,
      render: (row) => row.AgreementID || '',
    },
    {
      key: 'dealership',
      title: 'Dealership',
      searchable: true,
      render: (row) => {
        return row.dealers?.Payee || "Unknown Dealership";
      },
    },
    {
      key: 'effectiveDate',
      title: 'Date',
      sortable: false,
      render: (row) => {
        return row.EffectiveDate ? format(new Date(row.EffectiveDate), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'status',
      title: 'Status',
      sortable: false,
      render: (row) => {
        const status = row.AgreementStatus || 'UNKNOWN';
        const variants = {
          ACTIVE: 'bg-success/15 text-success border-success/20',
          EXPIRED: 'bg-muted/30 text-muted-foreground border-muted/40',
          CANCELLED: 'bg-destructive/15 text-destructive border-destructive/20',
          PENDING: 'bg-warning/15 text-warning border-warning/20',
          TERMINATED: 'bg-destructive/15 text-destructive border-destructive/20',
          UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40',
        };
        
        return (
          <Badge color="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border`}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: 'value',
      title: 'Total Value',
      sortable: false,
      render: (row) => {
        return `$${(row.Total || 0).toLocaleString()}`;
      },
    },
  ];

  // Fixed: When using search term with DB query, we need to keep pagination working
  // Local filtering is only applied to the current page of results
  const displayedCount = filteredAgreements.length;
  
  // If we're doing a text search, we need to understand that filteredAgreements
  // only represents the current page's filtered results
  const effectiveTotalCount = totalCount;
  
  // Log pagination and filtering details for debugging
  console.log('Pagination details:', {
    currentPage: page,
    pageSize: pageSize,
    totalCount: totalCount,
    displayedAfterFiltering: displayedCount,
    effectiveTotalForPagination: effectiveTotalCount,
    isIdSearch
  });

  const currentStatus = isFetching
    ? "Loading..."
    : `Displaying ${Math.min(displayedCount, effectiveTotalCount)} of ${effectiveTotalCount} agreements${dealerName ? ` for ${dealerName}` : ''}`;

  return (
    <>
      {isIdSearch && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <AlertDescription>
            <span className="font-medium">ID Search Mode:</span> Searching for Agreement ID "{searchTerm}". All other filters are ignored.
          </AlertDescription>
        </Alert>
      )}
      <DataTable
        data={filteredAgreements}
        columns={columns}
        rowKey={(row) => row.id || row.AgreementID || ''}
        className={className}
        searchConfig={{
          enabled: true,
          placeholder: "Search by ID...",
          onChange: handleSearch,
          searchKeys: ["AgreementID"]
        }}
        paginationProps={{
          currentPage: page,
          totalItems: effectiveTotalCount,
          pageSize: pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        loading={isFetching}
        customFilters={
          <FilterDropdown
            options={AGREEMENT_STATUS_OPTIONS}
            selectedValues={statusFilters}
            onChange={handleStatusFilterChange}
            label="Filters"
            className="ml-0"
          />
        }
      />
    </>
  );
};

export default AgreementsTable;
