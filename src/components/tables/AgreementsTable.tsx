
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { toast } from 'sonner';

type Agreement = {
  id: string;
  AgreementID: string;
  HolderFirstName?: string | null;
  HolderLastName?: string | null;
  dealerName?: string;
  DealerUUID?: string | null;
  EffectiveDate?: string | null;
  ExpireDate?: string | null;
  AgreementStatus?: string | null;
  Total?: number | null;
  DealerCost?: number | null;
  ReserveAmount?: number | null;
  status?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  dealerCost?: number;
  reserveAmount?: number;
};

type Dealer = {
  DealerUUID: string;
  PayeeID: string;
  Payee?: string | null;
};

const formatName = (name?: string | null): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

const SUPABASE_PAGE_SIZE = 1000;

async function fetchAgreementsPage(dateRange?: DateRange, page: number = 1): Promise<{data: Agreement[], hasMore: boolean}> {
  try {
    const from = dateRange?.from ? new Date(dateRange.from) : null;
    const to = dateRange?.to ? new Date(dateRange.to) : null;
    
    console.log(`Fetching agreements page ${page} with date range: ${from?.toISOString()} to ${to?.toISOString()}`);
    
    const offset = (page - 1) * SUPABASE_PAGE_SIZE;
    
    let query = supabase
      .from("agreements")
      .select("*");
    
    if (from && to) {
      query = query
        .gte("EffectiveDate", from.toISOString())
        .lte("ExpireDate", to.toISOString());
    }
    
    query = query
      .order('EffectiveDate', { ascending: false })
      .range(offset, offset + SUPABASE_PAGE_SIZE - 1);
    
    const { data, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      return { data: [], hasMore: false };
    }

    const hasMore = data?.length === SUPABASE_PAGE_SIZE;
    
    console.log(`Fetched Agreements page ${page}: ${data?.length || 0} records. Has more: ${hasMore}`);
    
    return { data: data || [], hasMore };
  } catch (error) {
    console.error("Error fetching agreements page:", error);
    return { data: [], hasMore: false };
  }
}

async function fetchAllAgreements(dateRange?: DateRange): Promise<Agreement[]> {
  let allAgreements: Agreement[] = [];
  let page = 1;
  let hasMore = true;
  
  console.log("Starting to fetch all agreements...");
  
  while (hasMore) {
    const result = await fetchAgreementsPage(dateRange, page);
    allAgreements = [...allAgreements, ...result.data];
    hasMore = result.hasMore;
    page++;
    
    if (page > 10) {
      console.warn("Reached maximum number of pages (10). Stopping pagination.");
      break;
    }
  }
  
  console.log(`Completed fetching all agreements. Total: ${allAgreements.length}`);
  return allAgreements;
}

async function fetchDealers(): Promise<Dealer[]> {
  try {
    const { data, error } = await supabase.from("dealers").select("*");

    if (error) {
      console.error("Supabase Error fetching dealers:", error);
      return [];
    }

    console.log("Fetched Dealers:", data?.length || 0, "records");
    return data || [];
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return [];
  }
}

type AgreementsTableProps = {
  agreements?: Agreement[];
  className?: string;
  dateRange?: DateRange;
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({ className = '', dateRange }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [displayAgreements, setDisplayAgreements] = useState<Agreement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const initialFetchDone = useRef(false);
  
  // Create a stable query key that will be consistent with what's used in Index.tsx
  const agreementsQueryKey = useMemo(() => {
    if (!dateRange) return ["agreements-data"];
    
    const fromStr = dateRange.from ? dateRange.from.toISOString() : 'null';
    const toStr = dateRange.to ? dateRange.to.toISOString() : 'null';
    return ["agreements-data", fromStr, toStr];
  }, [dateRange]);
  
  useEffect(() => {
    console.log("Date range changed in AgreementsTable, resetting to page 1");
    setPage(1);
  }, [dateRange]);
  
  // React Query configuration with longer staleTime and cacheTime
  const { 
    data: allAgreements = [], 
    isLoading: isLoadingAgreements,
    error: agreementsError,
    refetch: refetchAgreements,
    isRefetching
  } = useQuery({
    queryKey: agreementsQueryKey,
    queryFn: () => fetchAllAgreements(dateRange),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
  
  // Force cast to array to ensure React Query always returns an array
  const agreements = Array.isArray(allAgreements) ? allAgreements : [];
  
  // Log the data received from React Query
  useEffect(() => {
    console.log("React Query agreements data received:", agreements);
    console.log("React Query agreements length:", agreements.length);
    console.log("React Query agreements query key:", agreementsQueryKey);
    
    // Check what's in the cache and manually set if needed
    if (agreements.length > 0) {
      // Check if the data is properly stored in the cache
      const cachedData = queryClient.getQueryData(agreementsQueryKey);
      console.log("Checking agreements from cache:", cachedData);
      console.log("Cache size:", cachedData && Array.isArray(cachedData) ? (cachedData as Agreement[]).length : 0);
      
      // Explicitly set the data in the cache if it's not there
      if (!cachedData && agreements.length > 0) {
        console.warn("Data exists but not in cache! Setting it explicitly.");
        queryClient.setQueryData(agreementsQueryKey, agreements);
        
        // Verify data was set correctly
        setTimeout(() => {
          const verifiedData = queryClient.getQueryData(agreementsQueryKey);
          console.log("Verified cache after manual set:", verifiedData);
          console.log("Verified cache size:", verifiedData && Array.isArray(verifiedData) ? (verifiedData as Agreement[]).length : 0);
        }, 500);
      }
    }
    
    // Show toast on successful fetch
    if (agreements.length > 0 && !initialFetchDone.current) {
      initialFetchDone.current = true;
      toast.success(`Successfully loaded ${agreements.length} agreements`);
    }
  }, [agreements, agreementsQueryKey, queryClient]);
  
  // Update displayed agreements when data changes
  useEffect(() => {
    if (agreements && agreements.length > 0) {
      setTotalCount(agreements.length);
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const slicedAgreements = agreements.slice(startIndex, endIndex);
      
      console.log(`Displaying ${slicedAgreements.length} agreements for page ${page}/${Math.ceil(agreements.length/pageSize)}`);
      if (slicedAgreements.length > 0) {
        console.log("Sample agreement data:", slicedAgreements[0]);
      }
      setDisplayAgreements(slicedAgreements);
    } else {
      setDisplayAgreements([]);
      setTotalCount(0);
      console.log("No agreements to display");
    }
  }, [agreements, page, pageSize]);
  
  // Fetch dealers data
  const { 
    data: dealers = [],
    isLoading: isLoadingDealers 
  } = useQuery({
    queryKey: ["dealers-data"],
    queryFn: fetchDealers,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: false,
  });

  // Create a dealer map for quick lookup
  const dealerMap = useMemo(() => {
    if (!dealers || dealers.length === 0) return {};
    
    return dealers.reduce<Record<string, Dealer>>((acc, dealer) => {
      if (dealer.DealerUUID) {
        acc[dealer.DealerUUID] = dealer;
      }
      return acc;
    }, {});
  }, [dealers]);

  // Define columns for the data table
  const columns: Column<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: false,
      render: (row) => row.AgreementID || '',
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      sortable: false,
      render: (row) => {
        const firstName = formatName(row.HolderFirstName);
        const lastName = formatName(row.HolderLastName);
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
      },
    },
    {
      key: 'dealerName',
      title: 'Dealership',
      sortable: false,
      render: (row) => {
        if (row.DealerUUID && dealerMap[row.DealerUUID]) {
          return dealerMap[row.DealerUUID].Payee || 'Unknown Dealership';
        }
        return row.dealerName || 'Unknown Dealership';
      },
    },
    {
      key: 'dealerId',
      title: 'Dealer ID',
      sortable: false,
      render: (row) => {
        if (row.DealerUUID && dealerMap[row.DealerUUID]) {
          return dealerMap[row.DealerUUID].PayeeID || 'Unknown';
        }
        return 'N/A';
      },
    },
    {
      key: 'effectiveDate',
      title: 'Effective Date',
      sortable: false,
      render: (row) => {
        const date = row.EffectiveDate || row.startDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'expireDate',
      title: 'Expire Date',
      sortable: false,
      render: (row) => {
        const date = row.ExpireDate || row.endDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'status',
      title: 'Status',
      sortable: false,
      render: (row) => {
        const status = row.AgreementStatus || row.status || 'UNKNOWN';
        const variants = {
          ACTIVE: 'bg-success/15 text-success border-success/20',
          EXPIRED: 'bg-muted/30 text-muted-foreground border-muted/40',
          CANCELLED: 'bg-destructive/15 text-destructive border-destructive/20',
          PENDING: 'bg-warning/15 text-warning border-warning/20',
          TERMINATED: 'bg-destructive/15 text-destructive border-destructive/20',
          UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40',
        };
        
        return (
          <Badge variant="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border`}>
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
        const value = row.Total || row.value || 0;
        return `$${(value).toLocaleString()}`;
      },
    },
    {
      key: 'dealerCost',
      title: 'Dealer Cost',
      sortable: false,
      render: (row) => {
        const cost = row.DealerCost || row.dealerCost || 0;
        return `$${(cost).toLocaleString()}`;
      },
    },
    {
      key: 'reserveAmount',
      title: 'Reserve Amount',
      sortable: false,
      render: (row) => {
        const reserve = row.ReserveAmount || row.reserveAmount || 0;
        return `$${(reserve).toLocaleString()}`;
      },
    },
  ];

  // Track loading state
  const isLoading = isLoadingAgreements || isLoadingDealers || isRefetching;

  // Handle errors
  if (agreementsError) {
    console.error("Failed to load agreements:", agreementsError);
    return <div className="py-10 text-center text-destructive">Error loading agreements: {String(agreementsError)}</div>;
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    console.log(`Changing page size to ${newPageSize}`);
    setPageSize(newPageSize);
    setPage(1);
  };

  // Display status
  const currentStatus = isLoading 
    ? "Loading..." 
    : `Displaying ${displayAgreements.length} of ${totalCount} agreements`;

  // Manual refetch function for testing and debugging
  const handleManualRefetch = () => {
    console.log("Manually refetching agreements...");
    toast.info("Refreshing agreements data...");
    
    // First, check what's in the cache before invalidation
    const beforeInvalidation = queryClient.getQueryData(agreementsQueryKey);
    console.log("Cache before invalidation:", beforeInvalidation);
    
    // Explicitly invalidate the cache for this query
    queryClient.invalidateQueries({ 
      queryKey: agreementsQueryKey,
      exact: true
    });
    
    // Then refetch
    refetchAgreements().then((result) => {
      if (result.isSuccess) {
        toast.success(`Successfully loaded ${result.data.length} agreements`);
        
        // Verify data is properly stored after refetch
        setTimeout(() => {
          const afterRefetch = queryClient.getQueryData(agreementsQueryKey);
          console.log("Cache after refetch:", afterRefetch);
          console.log("Cache size after refetch:", afterRefetch && Array.isArray(afterRefetch) ? (afterRefetch as Agreement[]).length : 0);
        }, 500);
      } else {
        toast.error("Failed to refresh agreements data");
      }
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-muted-foreground">
          {currentStatus}
        </div>
        <button 
          onClick={handleManualRefetch} 
          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
        >
          Refresh Data
        </button>
      </div>
      
      <DataTable
        data={displayAgreements}
        columns={columns}
        searchKey="id"
        rowKey={(row) => row.id || row.AgreementID || ''}
        className={className}
        paginationProps={{
          currentPage: page,
          totalItems: totalCount,
          pageSize: pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        loading={isLoading}
      />
    </>
  );
};

export default AgreementsTable;
