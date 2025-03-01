
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

// Define a proper type for Agreement based on the Supabase schema
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

// Define dealer data type
type Dealer = {
  DealerUUID: string;
  PayeeID: string;
  Payee?: string | null;
};

// Helper function to format a name to title case
const formatName = (name?: string | null): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

// Fetch agreements from Supabase with date range and pagination
async function fetchAgreements(dateRange?: DateRange, page: number = 1, pageSize: number = 10): Promise<{data: Agreement[], count: number}> {
  try {
    let query = supabase
      .from("agreements")
      .select("*", { count: 'exact' });
    
    // Apply date range filters if provided
    if (dateRange?.from && dateRange?.to) {
      query = query
        .gte("EffectiveDate", dateRange.from.toISOString())
        .lte("ExpireDate", dateRange.to.toISOString());
    }
    
    // Apply pagination
    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    
    const { data, count, error } = await query;

    if (error) {
      console.error("Supabase Error:", error);
      return { data: [], count: 0 };
    }

    console.log("Fetched Agreements:", data?.length || 0, "records out of", count);
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return { data: [], count: 0 };
  }
}

// Fetch dealers from Supabase
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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalCount, setTotalCount] = React.useState(0);
  
  // Fetch agreements using React Query
  const { data: agreementsData, isLoading: isLoadingAgreements, error: agreementsError, refetch } = useQuery({
    queryKey: ["agreements", dateRange, page, pageSize],
    queryFn: async () => {
      const result = await fetchAgreements(dateRange, page, pageSize);
      setTotalCount(result.count);
      return result.data;
    },
    keepPreviousData: true,
  });

  // Fetch dealers using React Query
  const { data: dealers, isLoading: isLoadingDealers } = useQuery({
    queryKey: ["dealers"],
    queryFn: fetchDealers,
  });

  // Create a lookup map for dealers by UUID
  const dealerMap = useMemo(() => {
    if (!dealers) return {};
    
    return dealers.reduce<Record<string, Dealer>>((acc, dealer) => {
      if (dealer.DealerUUID) {
        acc[dealer.DealerUUID] = dealer;
      }
      return acc;
    }, {});
  }, [dealers]);

  // When date range changes, reset to page 1 and refetch
  React.useEffect(() => {
    setPage(1);
    refetch();
  }, [dateRange, refetch]);

  const columns: Column<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: true,
      render: (row) => row.AgreementID || '',
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      sortable: true,
      render: (row) => {
        const firstName = formatName(row.HolderFirstName);
        const lastName = formatName(row.HolderLastName);
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
      },
    },
    {
      key: 'dealerName',
      title: 'Dealership',
      sortable: true,
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
      sortable: true,
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
      sortable: true,
      render: (row) => {
        const date = row.EffectiveDate || row.startDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'expireDate',
      title: 'Expire Date',
      sortable: true,
      render: (row) => {
        const date = row.ExpireDate || row.endDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
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
    },
    {
      key: 'value',
      title: 'Total Value',
      sortable: true,
      render: (row) => {
        const value = row.Total || row.value || 0;
        return `$${(value).toLocaleString()}`;
      },
    },
    {
      key: 'dealerCost',
      title: 'Dealer Cost',
      sortable: true,
      render: (row) => {
        const cost = row.DealerCost || row.dealerCost || 0;
        return `$${(cost).toLocaleString()}`;
      },
    },
    {
      key: 'reserveAmount',
      title: 'Reserve Amount',
      sortable: true,
      render: (row) => {
        const reserve = row.ReserveAmount || row.reserveAmount || 0;
        return `$${(reserve).toLocaleString()}`;
      },
    },
  ];

  const isLoading = isLoadingAgreements || isLoadingDealers;

  if (isLoading && page === 1) {
    return <div className="py-10 text-center">Loading agreements and dealer data...</div>;
  }

  if (agreementsError) {
    console.error("Failed to load agreements:", agreementsError);
    return <div className="py-10 text-center text-destructive">Error loading agreements</div>;
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to page 1 when changing page size
  };

  return (
    <DataTable
      data={agreementsData || []}
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
  );
};

export default AgreementsTable;
