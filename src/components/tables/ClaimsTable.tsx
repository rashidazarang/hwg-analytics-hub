
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { DateRange } from '@/lib/dateUtils';
import ClaimStatusBadge from '@/components/claims/ClaimStatusBadge';
import { useClaimsFetching } from '@/hooks/useClaimsFetching';

const PAGE_SIZE = 100; // Set consistent page size for claims

interface ClaimsTableProps {
  className?: string; 
  dealerFilter?: string; 
  searchQuery?: string;
  dateRange?: DateRange; 
}

const ClaimsTable: React.FC<ClaimsTableProps> = ({
  className = '',
  dealerFilter = '',
  searchQuery = '',
  dateRange
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setLocalSearchQuery(searchQuery);
  }, [dealerFilter, searchQuery, dateRange]);

  // Fetch claims data
  const { 
    data: claimsData, 
    isFetching 
  } = useClaimsFetching(page, pageSize, dealerFilter, dateRange);
  
  const claims = useMemo(() => claimsData?.data || [], [claimsData]);
  const totalCount = useMemo(() => claimsData?.count || 0, [claimsData]);
  
  // Apply client-side search filtering
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
  
  // Define table columns
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
      render: (row) => <ClaimStatusBadge claim={row} />,
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

  // Handlers
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
          : `Displaying ${filteredClaims.length} of ${totalCount} claims`
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
