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

async function fetchAgreements(
  page: number = 1,
  pageSize: number = PAGE_SIZE,
  dateRange?: DateRange, 
  dealerFilter?: string
): Promise<{ data: Agreement[], count: number }> {
  console.log("🔍 Fetching agreements with parameters:");
  console.log("🔍 Page:", page, "Page size:", pageSize);
  console.log("🔍 Date Range:", dateRange);
  console.log("🔍 Dealer UUID filter:", dealerFilter);

  const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
  const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
  
  const startRow = (page - 1) * pageSize;
  const endRow = startRow + pageSize - 1;

  let query = supabase
    .from("agreements")
    .select(`
      id, 
      AgreementID, 
      HolderFirstName, 
      HolderLastName, 
      DealerUUID, 
      DealerID, 
      EffectiveDate, 
      ExpireDate, 
      AgreementStatus, 
      Total, 
      DealerCost, 
      ReserveAmount,
      StatusChangeDate,
      dealers(Payee)
    `, { count: 'exact' })
    .gte("EffectiveDate", from)
    .lte("EffectiveDate", to)
    .order("EffectiveDate", { ascending: false });
  
  if (dealerFilter && dealerFilter.trim()) {
    console.log(`🎯 Filtering by DealerUUID: "${dealerFilter}"`);
    query = query.eq("DealerUUID", dealerFilter);
  }
  
  query = query.range(startRow, endRow);
  
  const { data, error, count } = await query;

  if (error) {
    console.error("❌ Supabase Fetch Error:", error);
    toast.error("Failed to load agreements");
    return { data: [], count: 0 };
  }

  console.log(`✅ Fetched ${data?.length || 0} agreements for page ${page}`);
  console.log(`✅ Total agreements: ${count || 0}`);
  
  return { 
    data: data as unknown as Agreement[] || [], 
    count: count || 0 
  };
}

async function fetchDealers() {
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
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  useEffect(() => {
    console.log('🔍 AgreementsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 AgreementsTable - Current dealer name:', dealerName);
    
    setPage(1);
  }, [dealerFilter, dealerName, dateRange]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
      setPage(1);
    }
  }, [searchQuery]);

  const agreementsQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    return ["agreements-data", from, to, dealerFilter, page, pageSize];
  }, [dateRange, dealerFilter, page, pageSize]);
  
  const { 
    data: agreementsData = { data: [], count: 0 }, 
    isFetching: isFetchingAgreements,
    error: agreementsError
  } = useQuery({
    queryKey: agreementsQueryKey,
    queryFn: async () => {
      console.log(`🔍 Executing agreements query for page ${page}`);
      return fetchAgreements(page, pageSize, dateRange, dealerFilter);
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  if (agreementsError) {
    console.error("Failed to load agreements:", agreementsError);
    return <div className="py-10 text-center text-destructive">Error loading agreements: {String(agreementsError)}</div>;
  }
  
  const agreements = agreementsData.data || [];
  const totalCount = agreementsData.count || 0;

  const { 
    data: dealers = [],
    isFetching: isFetchingDealers 
  } = useQuery({
    queryKey: ["dealers-data"],
    queryFn: fetchDealers,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
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
    console.log(`🔍 Filtering ${agreements.length} agreements with search term: "${searchTerm}"`);
    console.log(`🔍 Filtering agreements by status:`, statusFilters);
    
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
    
    if (statusFilters.length > 0) {
      filtered = filtered.filter(agreement => {
        const status = agreement.AgreementStatus || 'UNKNOWN';
        return statusFilters.includes(status);
      });
    }
    
    return filtered;
  }, [agreements, searchTerm, statusFilters]);
  
  const isFetching = isFetchingAgreements || isFetchingDealers;

  const handleSearch = (term: string) => {
    console.log("🔍 Search term updated:", term);
    setSearchTerm(term);
    setPage(1);
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
        return row.dealers?.Payee || "Unknown Dealership";
      },
    },
    {
      key: 'DealerID',
      title: 'Dealer ID',
      searchable: true,
      render: (row) => row.DealerID || 'No Dealer Assigned',
    },
    {
      key: 'effectiveDate',
      title: 'Effective Date',
      sortable: false,
      render: (row) => {
        return row.EffectiveDate ? format(new Date(row.EffectiveDate), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'expireDate',
      title: 'Expire Date',
      sortable: false,
      render: (row) => {
        return row.ExpireDate ? format(new Date(row.ExpireDate), 'MMM d, yyyy') : 'N/A';
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
    {
      key: 'dealerCost',
      title: 'Dealer Cost',
      sortable: false,
      render: (row) => {
        return `$${(row.DealerCost || 0).toLocaleString()}`;
      },
    },
    {
      key: 'reserveAmount',
      title: 'Reserve Amount',
      sortable: false,
      render: (row) => {
        return `$${(row.ReserveAmount || 0).toLocaleString()}`;
      },
    },
  ];

  const displayedCount = filteredAgreements.length;
  const effectiveTotalCount = (searchTerm.trim() || statusFilters.length > 0) ? displayedCount : totalCount;

  const currentStatus = isFetching
    ? "Loading..."
    : `Displaying ${Math.min(displayedCount, effectiveTotalCount)} of ${effectiveTotalCount} agreements${dealerName ? ` for ${dealerName}` : ''}`;

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        {currentStatus}
      </div>
      
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
            label="Status"
            className="ml-2"
          />
        }
      />
    </>
  );
};

export default AgreementsTable;
