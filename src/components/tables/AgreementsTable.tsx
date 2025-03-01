
import React, { useMemo, useEffect, useState } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [displayAgreements, setDisplayAgreements] = useState<Agreement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  useEffect(() => {
    setPage(1);
  }, [dateRange]);
  
  // Updated React Query configuration with staleTime and cacheTime
  const { 
    data: allAgreements = [], 
    isLoading: isLoadingAgreements,
    error: agreementsError,
    refetch: refetchAgreements,
    isRefetching
  } = useQuery({
    queryKey: ["all-agreements", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: () => fetchAllAgreements(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });
  
  // Force cast to array to ensure React Query always returns an array
  const agreements = Array.isArray(allAgreements) ? allAgreements : [];
  
  // Log the data received from React Query
  useEffect(() => {
    console.log("React Query agreements data: ", agreements);
    console.log("React Query agreements length: ", agreements.length);
    window.agreementsData = agreements; // For debugging
  }, [agreements]);
  
  useEffect(() => {
    if (agreements && agreements.length > 0) {
      setTotalCount(agreements.length);
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const slicedAgreements = agreements.slice(startIndex, endIndex);
      
      console.log(`Displaying ${slicedAgreements.length} agreements for page ${page}/${Math.ceil(agreements.length/pageSize)}`);
      console.log("Sample agreement data:", slicedAgreements[0]);
      setDisplayAgreements(slicedAgreements);
    } else {
      setDisplayAgreements([]);
      setTotalCount(0);
      console.log("No agreements to display");
    }
  }, [agreements, page, pageSize]);
  
  const { 
    data: dealers = [],
    isLoading: isLoadingDealers 
  } = useQuery({
    queryKey: ["dealers"],
    queryFn: fetchDealers,
    staleTime: 300000,
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const dealerMap = useMemo(() => {
    if (!dealers || dealers.length === 0) return {};
    
    return dealers.reduce<Record<string, Dealer>>((acc, dealer) => {
      if (dealer.DealerUUID) {
        acc[dealer.DealerUUID] = dealer;
      }
      return acc;
    }, {});
  }, [dealers]);

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

  const isLoading = isLoadingAgreements || isLoadingDealers || isRefetching;

  if (isLoading && !displayAgreements.length) {
    return <div className="py-10 text-center">Loading agreements and dealer data...</div>;
  }

  if (agreementsError) {
    console.error("Failed to load agreements:", agreementsError);
    return <div className="py-10 text-center text-destructive">Error loading agreements: {String(agreementsError)}</div>;
  }

  const handlePageChange = (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    console.log(`Changing page size to ${newPageSize}`);
    setPageSize(newPageSize);
    setPage(1);
  };

  const currentStatus = isLoading 
    ? "Loading..." 
    : `Displaying ${displayAgreements.length} of ${totalCount} agreements`;

  // Add a refetch button for testing and debugging
  const handleManualRefetch = () => {
    console.log("Manually refetching agreements...");
    refetchAgreements();
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
