import React from 'react';
import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
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
+ DealerID?: string | null; // <-- Add this line
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

const SUPABASE_PAGE_SIZE = 500;

async function fetchAllAgreements(dateRange?: DateRange): Promise<Agreement[]> {
  console.log("🔍 Fetching agreements...");

  let allAgreements: Agreement[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2025-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    const offset = (page - 1) * SUPABASE_PAGE_SIZE;

    console.log(`🚀 Fetching page ${page} from Supabase: ${from} to ${to}`);

    const { data, error } = await supabase
      .from("agreements")
      .select("id, AgreementID, HolderFirstName, HolderLastName, DealerUUID, DealerID, EffectiveDate, ExpireDate, AgreementStatus, Total, DealerCost, ReserveAmount")
      .gte("EffectiveDate", from)
      .lte("EffectiveDate", to)
      .order("EffectiveDate", { ascending: false })
      .range(offset, offset + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      return allAgreements;
    }

    allAgreements = [...allAgreements, ...data];

    if (data && data.length === SUPABASE_PAGE_SIZE) {
      page++; // Move to the next batch
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Total agreements fetched: ${allAgreements.length}`);
  return allAgreements;
}

async function fetchDealers(): Promise<Dealer[]> {
  try {
    const { data, error } = await supabase
      .from("dealers")
      .select("DealerUUID, PayeeID, Payee"); // ✅ Keep only this one

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
  className?: string;
  dateRange?: DateRange;
};


const AgreementsTable: React.FC<AgreementsTableProps> = ({ className = '', dateRange }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [displayAgreements, setDisplayAgreements] = useState<Agreement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const initialFetchDone = useRef<boolean>(false);

  


  // Create a stable query key that will be consistent with what's used in Index.tsx
const agreementsQueryKey = useMemo(() => {
  const from = dateRange?.from ? dateRange.from.toISOString() : "2025-01-01T00:00:00.000Z";
  const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
  return ["agreements-data", from, to];
}, [dateRange]);
  
  useEffect(() => {
    if (dateRange) {
      console.log("📆 Date range updated. Keeping page:", page);
    }
  }, [dateRange]);
  
  // React Query configuration with longer staleTime and cacheTime
  const { 
    data: allAgreements = [], 
    isFetching: isFetchingAgreements,
    error: agreementsError,
    refetch: refetchAgreements
  } = useQuery({
    queryKey: [
      "agreements-data",
      dateRange?.from?.toISOString() || "null",
      dateRange?.to?.toISOString() || "null",
    ],
    queryFn: async () => {
      const agreements = await fetchAllAgreements(dateRange);
      console.log(`🟢 Storing ${agreements.length} agreements in React Query cache`);
      queryClient.setQueryData(["agreements-data", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()], agreements);
      return agreements;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30, // Garbage collect after 30 minutes
    refetchOnWindowFocus: false,
  });

  if (agreementsError) {
    console.error("Failed to load agreements:", agreementsError);
    return <div className="py-10 text-center text-destructive">Error loading agreements: {String(agreementsError)}</div>;
  }
  
  // Force cast to array to ensure React Query always returns an array
  const agreements = Array.isArray(allAgreements) ? allAgreements : [];
  
// Log the data received from React Query and update the displayed agreements
useEffect(() => {
  if (agreements.length > 0) {
    setTotalCount(agreements.length);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const slicedAgreements = agreements.slice(startIndex, endIndex);
    console.log(`Displaying ${slicedAgreements.length} agreements for page ${page}/${Math.ceil(agreements.length / pageSize)}`);
    if (slicedAgreements.length > 0) {
      console.log("Sample agreement data:", slicedAgreements[0]);
    }
    setDisplayAgreements(slicedAgreements);
  } else {
    console.warn("⚠️ No agreements to display, double-check Supabase.");
    setDisplayAgreements([]);
    setTotalCount(0);
  }
}, [agreements, page, pageSize]);



  // Fetch dealers data
  const { 
    data: dealers = [],
    isFetching: isFetchingDealers 
  } = useQuery({
    queryKey: ["dealers-data"],
    queryFn: fetchDealers,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: false,
  });
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
  
    console.log("✅ Dealer Map Created:", JSON.stringify(map, null, 2)); // Debug
    return map;
  }, [dealers]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 Agreements Data:", agreements);
      console.log("🔍 Dealers Data:", dealers);
    }
  }, [agreements, dealers]);


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
      key: 'dealership',
      title: 'Dealership',
      render: (row) => {
        const dealerUUID = row.DealerUUID?.trim().toLowerCase();
        const dealerID = row.DealerID?.trim().toLowerCase();
    
        let dealer = dealerUUID ? dealerMap[dealerUUID] : null;
        if (!dealer && dealerID) {
          dealer = dealerMap[dealerID];
        }
    
        console.log(`🔍 Dealer Lookup for UUID: ${dealerUUID} & ID: ${dealerID} → ${dealer?.Payee || 'Unknown Dealership'}`);
    
        return dealer ? dealer.Payee : 'Unknown Dealership';
      },
    },
    {
      key: 'DealerID',
      title: 'Dealer ID',
      render: (row) => {
        const dealerUUID = row.DealerUUID?.trim().toLowerCase();
        const dealerID = row.DealerID?.trim().toLowerCase();
    
        let dealer = dealerUUID ? dealerMap[dealerUUID] : null;
        if (!dealer && dealerID) {
          dealer = dealerMap[dealerID];
        }
    
        console.log(`🔍 Dealer ID Lookup for UUID: ${dealerUUID} & ID: ${dealerID} → ${dealer?.PayeeID || 'No Dealer Assigned'}`);
    
        return dealer ? dealer.PayeeID : 'No Dealer Assigned';
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
  const isFetching = isFetchingAgreements || isFetchingDealers;




  // Handle pagination
  const handlePageChange = (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
  };

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1); // ✅ Reset to first page
    }
  }, [pageSize, setPage]);

  // Display status
const currentStatus = isFetching
  ? "Loading..."
  : `Displaying ${displayAgreements.length} of ${totalCount} agreements`;

  // Manual refetch function for testing and debugging
  const handleManualRefetch = () => {
    console.log("Manually refetching agreements...");

    
    // First, check what's in the cache before invalidation
    const beforeInvalidation = queryClient.getQueryData(agreementsQueryKey);
    console.log("Cache before invalidation:", beforeInvalidation);
    
    // Explicitly invalidate the cache for this query
    if (agreementsQueryKey.length) {
      queryClient.invalidateQueries({ queryKey: agreementsQueryKey });
    }
    
    refetchAgreements().then(({ data }) => {
      if (Array.isArray(data)) {
        // Toast removed!
        setTimeout(() => {
          const afterRefetch = queryClient.getQueryData(agreementsQueryKey);
          console.log("Cache after refetch:", afterRefetch);
          console.log("Cache size after refetch:", Array.isArray(afterRefetch) ? (afterRefetch as Agreement[]).length : 0);
        }, 500);
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
        loading={isFetching}
      />
    </>
  );
};

export default AgreementsTable;
