
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { toast } from 'sonner';
import VirtualizedTable, { VirtualColumn } from './VirtualizedTable';

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
  dealers?: {
    Payee?: string | null;
  };
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

const SUPABASE_PAGE_SIZE = 50;

async function fetchAgreementsPage(
  pageParam: number,
  pageSize: number,
  dateRange?: DateRange,
  dealerFilter?: string,
  searchTerm?: string
): Promise<{ data: Agreement[]; nextPage: number | null }> {
  console.log("🔍 Fetching agreements page:", pageParam, "with filter:", dealerFilter, "search:", searchTerm);

  const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
  const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
  const offset = pageParam * pageSize;

  // Start building the query
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
      dealers(Payee)
    `)
    .gte("EffectiveDate", from)
    .lte("EffectiveDate", to);
    
  // Add dealer filter if specified
  if (dealerFilter && dealerFilter.trim()) {
    query = query.eq("DealerUUID", dealerFilter);
  }
  
  // Add search term filter if specified
  if (searchTerm && searchTerm.trim()) {
    query = query.ilike("AgreementID", `%${searchTerm}%`);
  }
  
  // Execute the query with pagination
  const { data, error, count } = await query
    .order("EffectiveDate", { ascending: false })
    .range(offset, offset + pageSize - 1)
    .returns<Agreement[]>();

  if (error) {
    console.error("❌ Supabase Fetch Error:", error);
    toast.error("Failed to load agreements");
    return { data: [], nextPage: null };
  }

  // Determine if there are more pages (if we got the full page size)
  const hasMore = data && data.length === pageSize;
  const nextPage = hasMore ? pageParam + 1 : null;

  console.log(`✅ Fetched ${data?.length || 0} agreements from page ${pageParam}`);
  
  return { 
    data: data || [], 
    nextPage 
  };
}

async function fetchDealers(): Promise<Dealer[]> {
  try {
    const { data, error } = await supabase
      .from("dealers")
      .select("DealerUUID, PayeeID, Payee")
      .limit(1000);

    if (error) {
      console.error("❌ Supabase Error fetching dealers:", error);
      return [];
    }

    console.log("✅ Fetched Dealers:", data?.length, "records");
    return data || [];
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
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  // Debug logging for dealerFilter changes
  useEffect(() => {
    console.log('🔍 AgreementsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 AgreementsTable - Current dealer name:', dealerName);
  }, [dealerFilter, dealerName]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  // Fetch dealers for lookup
  const { data: dealers = [] } = useQuery({
    queryKey: ["dealers-data"],
    queryFn: fetchDealers,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });
  
  // Create dealer mapping for lookups
  const dealerMap = useMemo(() => {
    if (!dealers || dealers.length === 0) {
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

  // Create filter object for the query
  const filters = useMemo(() => ({
    dateRange,
    dealerFilter
  }), [dateRange, dealerFilter]);

  // Define function to fetch data for the virtualized table
  const fetchTableData = useCallback(async ({ 
    pageParam = 0,
    pageSize,
    searchTerm: search
  }: {
    pageParam?: number;
    pageSize: number;
    searchTerm?: string;
    filters?: any;
  }) => {
    return fetchAgreementsPage(
      pageParam,
      pageSize,
      dateRange,
      dealerFilter,
      search
    );
  }, [dateRange, dealerFilter]);

  // Define columns for the virtualized table
  const columns: VirtualColumn<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: true,
      searchable: true,
      render: (row) => row.AgreementID || '',
      width: 160,
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      sortable: true,
      searchable: true,
      render: (row) => {
        const firstName = formatName(row.HolderFirstName);
        const lastName = formatName(row.HolderLastName);
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
      },
      width: 180,
    },
    {
      key: 'dealership',
      title: 'Dealership',
      searchable: true,
      render: (row) => {
        return row.dealers?.Payee || "Unknown Dealership";
      },
      width: 220,
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
    
        return dealer ? dealer.PayeeID : 'No Dealer Assigned';
      },
      width: 140,
    },
    {
      key: 'effectiveDate',
      title: 'Effective Date',
      sortable: true,
      render: (row) => {
        const date = row.EffectiveDate || row.startDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
      width: 140,
    },
    {
      key: 'expireDate',
      title: 'Expire Date',
      sortable: true,
      render: (row) => {
        const date = row.ExpireDate || row.endDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
      width: 140,
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
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
      width: 140,
    },
    {
      key: 'value',
      title: 'Total Value',
      sortable: true,
      render: (row) => {
        const value = row.Total || row.value || 0;
        return `$${(value).toLocaleString()}`;
      },
      width: 120,
    },
    {
      key: 'dealerCost',
      title: 'Dealer Cost',
      sortable: true,
      render: (row) => {
        const cost = row.DealerCost || row.dealerCost || 0;
        return `$${(cost).toLocaleString()}`;
      },
      width: 120,
    },
    {
      key: 'reserveAmount',
      title: 'Reserve Amount',
      sortable: true,
      render: (row) => {
        const reserve = row.ReserveAmount || row.reserveAmount || 0;
        return `$${(reserve).toLocaleString()}`;
      },
      width: 140,
    },
  ];

  // Generate a query key that includes all relevant filters
  const queryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "default";
    const to = dateRange?.to ? dateRange.to.toISOString() : "default";
    return ["agreements-infinite", from, to, dealerFilter];
  }, [dateRange, dealerFilter]);

  const handleSearch = (term: string) => {
    console.log("🔍 Search term updated:", term);
    setSearchTerm(term);
  };

  const currentStatus = dealerName 
    ? `Agreements${dealerName ? ` for ${dealerName}` : ''}`
    : 'All Agreements';

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        {currentStatus}
      </div>
      
      <VirtualizedTable
        columns={columns}
        fetchData={fetchTableData}
        rowKey={(row) => row.id || row.AgreementID || ''}
        className={className}
        searchConfig={{
          enabled: true,
          placeholder: "Search by Agreement ID...",
          onChange: handleSearch,
          searchKeys: ["AgreementID"]
        }}
        pageSize={SUPABASE_PAGE_SIZE}
        filters={filters}
        queryKey={queryKey}
      />
    </>
  );
};

export default AgreementsTable;
