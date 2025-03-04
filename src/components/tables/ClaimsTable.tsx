
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { DateRange } from '@/lib/dateUtils';
import ClaimStatusBadge from '@/components/claims/ClaimStatusBadge';
import { useClaimsFetching } from '@/hooks/useClaimsFetching';
import FilterDropdown, { FilterOption } from '@/components/ui/filter-dropdown';
import { getClaimStatus } from '@/utils/claimUtils';

const PAGE_SIZE = 100; // Set consistent page size for claims

interface ClaimsTableProps {
  className?: string; 
  dealerFilter?: string; 
  searchQuery?: string;
  dateRange?: DateRange; 
}

const CLAIM_STATUS_OPTIONS: FilterOption[] = [
  { value: "OPEN", label: "Open" },
  { value: "PENDING", label: "Pending" },
  { value: "CLOSED", label: "Closed" }
];

const ClaimsTable: React.FC<ClaimsTableProps> = ({
  className = '',
  dealerFilter = '',
  searchQuery = '',
  dateRange
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

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
  
  // Apply client-side search filtering and status filtering
  const filteredClaims = useMemo(() => {
    console.log('🔍 ClaimsTable: Filtering claims with searchQuery:', localSearchQuery);
    console.log('🔍 ClaimsTable: Filtering claims by status:', statusFilters);
    
    let filtered = claims;
    
    // Apply search filter
    if (localSearchQuery) {
      const term = localSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(claim => 
        claim.ClaimID?.toLowerCase().includes(term) || 
        claim.AgreementID?.toLowerCase().includes(term) ||
        claim.agreements?.dealers?.Payee?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilters.length > 0) {
      filtered = filtered.filter(claim => {
        const status = getClaimStatus(claim);
        return statusFilters.includes(status);
      });
    }
    
    return filtered;
  }, [claims, localSearchQuery, statusFilters]);
  
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
    setPage(1); // Reset to page 1 when searching
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to page 1 when changing page size
  };

  const handleStatusFilterChange = (values: string[]) => {
    setStatusFilters(values);
    setPage(1); // Reset to page 1 when filter changes
    // Removed toast notification for status filter change
  };

  // Calculate the actual total displayed count based on filters
  const displayedCount = filteredClaims.length;
  // Use server total when no client-side filters are applied, otherwise use filtered count
  const effectiveTotalCount = (localSearchQuery || statusFilters.length > 0) ? displayedCount : totalCount;

  return (
    <div className={className}>
      <div className="text-sm text-muted-foreground mb-2">
        {isFetching 
          ? "Loading claims..."
          : `Displaying ${Math.min(displayedCount, effectiveTotalCount)} of ${effectiveTotalCount} claims`
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
          placeholder: "Search by ID...",
          onChange: handleSearch,
          searchKeys: ["ClaimID", "AgreementID", "agreements.dealers.Payee"]
        }}
        paginationProps={{
          currentPage: page,
          totalItems: effectiveTotalCount, // Use filtered count for pagination
          pageSize: pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        customFilters={
          <FilterDropdown
            options={CLAIM_STATUS_OPTIONS}
            selectedValues={statusFilters}
            onChange={handleStatusFilterChange}
            label="Status"
            className="ml-2"
          />
        }
      />
    </div>
  );
};

export default ClaimsTable;
