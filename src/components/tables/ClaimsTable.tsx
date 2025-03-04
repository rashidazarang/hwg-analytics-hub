import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

const PAGE_SIZE = 100; // Set consistent page size for claims

async function fetchClaims(
  page: number = 1, 
  pageSize: number = PAGE_SIZE,
  dealerFilter?: string,
  dateRange?: DateRange
) {
  console.log('🔍 ClaimsTable: Fetching claims with parameters:');
  console.log(`🔍 Page: ${page}, Page size: ${pageSize}`);
  console.log('🔍 Dealer filter:', dealerFilter);
  console.log('🔍 Date range:', dateRange ? `${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}` : 'Not provided');
  
  const startRow = (page - 1) * pageSize;
  const endRow = startRow + pageSize - 1;
  
  let query = supabase
    .from("claims")
    .select(`
      id,
      ClaimID, 
      AgreementID, 
      ReportedDate, 
      Closed,
      Cause,
      Correction,
      LastModified,
      agreements(DealerUUID, dealers(Payee))
    `, { count: 'exact' })
    .order("LastModified", { ascending: false });

  if (dateRange) {
    console.log(`🔍 ClaimsTable: Filtering by date range: ${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
    query = query
      .gte("LastModified", dateRange.from.toISOString())
      .lte("LastModified", dateRange.to.toISOString());
  }

  if (dealerFilter && dealerFilter.trim() !== '') {
    console.log(`🔍 ClaimsTable: Filtering by dealership UUID: "${dealerFilter}"`);
    query = query.eq("agreements.DealerUUID", dealerFilter);
  }

  query = query.range(startRow, endRow);

  const { data, error, count } = await query;

  if (error) {
    console.error("❌ Error fetching claims:", error);
    return { data: [], count: 0 };
  }

  console.log(`✅ ClaimsTable: Fetched ${data?.length || 0} claims (Page ${page})`);
  console.log(`✅ ClaimsTable: Total count: ${count || 0}`);
  
  return { data: data || [], count: count || 0 };
}

function isClaimDenied(correction: string | null | undefined): boolean {
  if (!correction) return false;
  return /denied|not covered|rejected/i.test(correction);
}

const getClaimStatus = (claim: any): string => {
  if (claim.Closed && claim.ReportedDate) return 'CLOSED';
  if (claim.Closed && !claim.ReportedDate) return 'PENDING';
  if (claim.ReportedDate && !claim.Closed) return 'OPEN';
  return 'PENDING';
};

const ClaimsTable: React.FC<{ 
  className?: string; 
  dealerFilter?: string; 
  searchQuery?: string;
  dateRange?: DateRange; 
}> = ({
  className = '',
  dealerFilter = '',
  searchQuery = '',
  dateRange
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    setPage(1);
    setLocalSearchQuery(searchQuery);
  }, [dealerFilter, searchQuery, dateRange]);

  const { 
    data: claimsData, 
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['claims', page, pageSize, dealerFilter, dateRange?.from, dateRange?.to],
    queryFn: () => fetchClaims(page, pageSize, dealerFilter, dateRange),
    staleTime: 1000 * 60 * 10,
  });
  
  const claims = useMemo(() => claimsData?.data || [], [claimsData]);
  const totalCount = useMemo(() => claimsData?.count || 0, [claimsData]);
  
  const filteredClaims = useMemo(() => {
    console.log('🔍 ClaimsTable: Filtering claims with searchQuery:', localSearchQuery);
    
    if (!localSearchQuery) {
      return claims;
    }
    
    const term = localSearchQuery.toLowerCase();
    return claims.filter(claim => 
      claim.ClaimID?.toLowerCase().includes(term) || 
      claim.AgreementID?.toLowerCase().includes(term) ||
      claim.agreements?.dealers?.Payee?.toLowerCase().includes(term)
    );
  }, [claims, localSearchQuery]);
  
  const columns: Column<any>[] = [
    {
      key: 'ClaimID',
      title: 'Claim ID',
      sortable: false,
      searchable: true,
      render: (row) => row.ClaimID || '',
    },
    {
      key: 'AgreementID',
      title: 'Agreement ID',
      sortable: false,
      searchable: true,
      render: (row) => row.AgreementID || '',
    },
    {
      key: 'dealership',
      title: 'Dealership',
      searchable: true,
      render: (row) => row.agreements?.dealers?.Payee || "Unknown Dealership",
    },
    {
      key: 'Status',
      title: 'Status',
      sortable: false,
      render: (row) => {
        const status = getClaimStatus(row);
        const variants = {
          OPEN: 'bg-warning/15 text-warning border-warning/20',
          CLOSED: 'bg-success/15 text-success border-success/20',
          PENDING: 'bg-muted/15 text-muted-foreground border-muted/20',
          UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
        };
        return (
          <Badge variant="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border pointer-events-none`}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: 'ReportedDate',
      title: 'Date Reported',
      sortable: false,
      render: (row) => row.ReportedDate ? format(new Date(row.ReportedDate), 'MMM d, yyyy')
        : <span className="text-muted-foreground">N/A</span>,
    },
    {
      key: 'Closed',
      title: 'Closed Date',
      sortable: false,
      render: (row) => row.Closed ? format(new Date(row.Closed), 'MMM d, yyyy')
        : <span className="text-muted-foreground">N/A</span>,
    },
    {
      key: 'LastModified',
      title: 'Last Modified',
      sortable: false,
      render: (row) => row.LastModified ? format(new Date(row.LastModified), 'MMM d, yyyy')
         : <span className="text-muted-foreground">N/A</span>,
    }
  ];

  const handleSearch = (term: string) => {
    setLocalSearchQuery(term);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  return (
    <div className={className}>
      <div className="text-sm text-muted-foreground mb-2">
        {isFetching 
          ? "Loading claims..."
          : `Displaying ${filteredClaims.length} of ${totalCount} claims${dealerFilter ? " (filtered by dealership)" : ""}${dateRange ? " (filtered by date range)" : ""}`
        }
      </div>
      
      <DataTable
        data={filteredClaims}
        columns={columns}
        rowKey={(row) => row.ClaimID || row.id}
        className={className}
        loading={isFetching}
        searchConfig={{
          enabled: true,
          placeholder: "Search by Claim ID, Agreement ID, or Dealership...",
          onChange: handleSearch,
          searchKeys: ["ClaimID", "AgreementID", "agreements.dealers.Payee"]
        }}
        paginationProps={{
          currentPage: page,
          totalItems: totalCount,
          pageSize: pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
};

export default ClaimsTable;
