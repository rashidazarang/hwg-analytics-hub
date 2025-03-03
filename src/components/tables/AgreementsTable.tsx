
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
  DealerID?: string | null;
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

async function fetchAllAgreements(dateRange?: DateRange, dealerFilter?: string): Promise<Agreement[]> {
  console.log("🔍 Fetching agreements...");
  console.log("🔍 Dealer UUID filter:", dealerFilter);

  let allAgreements: Agreement[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    const offset = (page - 1) * SUPABASE_PAGE_SIZE;

    console.log(`🚀 Fetching page ${page} from Supabase: ${from} to ${to}`);
    
    // Start building the query
    let query = supabase
      .from("agreements")
      .select("id, AgreementID, HolderFirstName, HolderLastName, DealerUUID, DealerID, EffectiveDate, ExpireDate, AgreementStatus, Total, DealerCost, ReserveAmount")
      .gte("EffectiveDate", from)
      .lte("EffectiveDate", to);
    
    // Add dealer filter if specified - BUG FIX: Check the dealerFilter directly
    if (dealerFilter && dealerFilter.trim()) {
      console.log(`🎯 Filtering by DealerUUID: "${dealerFilter}"`);
      query = query.eq("DealerUUID", dealerFilter.trim());
    }
    
    // Execute the query with pagination
    const { data, error } = await query
      .order("EffectiveDate", { ascending: false })
      .range(offset, offset + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      toast.error("Failed to load agreements");
      return allAgreements;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ No more agreements found for this query. Total fetched: ${allAgreements.length}`);
      hasMore = false;
      break;
    }

    console.log(`✅ Fetched ${data.length} agreements from page ${page}`);
    if (data.length > 0) {
      console.log(`📊 Sample agreement:`, data[0]);
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
        return allDealers; // Return what we have so far
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allDealers = [...allDealers, ...data];

      // If we got fewer than PAGE_SIZE, we're at the last batch
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log("✅ Fetched Dealers:", allDealers.length, "records");
    return allDealers;
  } catch (error) {
    console.error("Error fetching dealers:", error);
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
  const [pageSize, setPageSize] = useState(10);
  const [displayAgreements, setDisplayAgreements] = useState<Agreement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const initialFetchDone = useRef<boolean>(false);

  // Debug logging for dealerFilter changes
  useEffect(() => {
    console.log('🔍 AgreementsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 AgreementsTable - Current dealer name:', dealerName);
    
    if (dealerFilter && dealerFilter.trim()) {
      // Force a refetch when the dealer filter changes
      console.log(`🔄 Forcing refetch of agreements with dealer UUID: ${dealerFilter}`);
      refetchAgreements();
    }
  }, [dealerFilter, dealerName]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  const agreementsQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    // Include dealerFilter in the query key to ensure React Query refetches when it changes
    return ["agreements-data", from, to, dealerFilter];
  }, [dateRange, dealerFilter]);
  
  const { 
    data: allAgreements = [], 
    isFetching: isFetchingAgreements,
    error: agreementsError,
    refetch: refetchAgreements
  } = useQuery({
    queryKey: agreementsQueryKey,
    queryFn: async () => {
      console.log(`🔍 Executing query with dealer UUID filter: ${dealerFilter}`);
      const agreements = await fetchAllAgreements(dateRange, dealerFilter);
      console.log(`🟢 Storing ${agreements.length} agreements in React Query cache`);
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
  
  const agreements = Array.isArray(allAgreements) ? allAgreements : [];

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
  
    return map;
  }, [dealers]);
  
  const filteredAgreements = useMemo(() => {
    console.log("Filtering agreements with search term:", searchTerm);
    let filtered = agreements;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(agreement => 
        agreement.AgreementID && agreement.AgreementID.toLowerCase().includes(term)
      );
    }
    
    console.log(`After filtering: ${filtered.length} agreements remain`);
    return filtered;
  }, [agreements, searchTerm]);
  
  useEffect(() => {
    if (filteredAgreements.length > 0) {
      setTotalCount(filteredAgreements.length);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const slicedAgreements = filteredAgreements.slice(startIndex, endIndex);
      console.log(`📋 Displaying ${slicedAgreements.length} agreements for page ${page}/${Math.ceil(filteredAgreements.length / pageSize)}`);
      if (slicedAgreements.length > 0) {
        console.log("📊 Sample agreement data:", slicedAgreements[0]);
      }
      setDisplayAgreements(slicedAgreements);
    } else {
      console.warn("⚠️ No agreements to display after filtering.");
      setDisplayAgreements([]);
      setTotalCount(0);
    }
  }, [filteredAgreements, page, pageSize]);

  const handleSearch = (term: string) => {
    console.log("🔍 Search term updated:", term);
    setSearchTerm(term);
    setPage(1);
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
      key: 'customerName',
      title: 'Customer Name',
      sortable: false,
      searchable: true,
      render: (row) => {
        const firstName = formatName(row.HolderFirstName);
        const lastName = formatName(row.HolderLastName);
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
      },
    },
    {
      key: 'dealership',
      title: 'Dealership',
      searchable: true,
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
      searchable: true,
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

  const isFetching = isFetchingAgreements || isFetchingDealers;

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

  const currentStatus = isFetching
    ? "Loading..."
    : `Displaying ${displayAgreements.length} of ${totalCount} agreements${dealerName ? ` for ${dealerName}` : ''}`;

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        {currentStatus}
      </div>
      
      <DataTable
        data={displayAgreements}
        columns={columns}
        rowKey={(row) => row.id || row.AgreementID || ''}
        className={className}
        searchConfig={{
          enabled: true,
          placeholder: "Search by Agreement ID only...",
          onChange: handleSearch,
          searchKeys: ["AgreementID"]
        }}
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
