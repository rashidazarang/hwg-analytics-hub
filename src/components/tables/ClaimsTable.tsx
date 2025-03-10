import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { DateRange } from '@/lib/dateUtils';
import ClaimStatusBadge from '@/components/claims/ClaimStatusBadge';
import { useClaimsFetching } from '@/hooks/useClaimsFetching';

const PAGE_SIZE = 100;

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
  // Store these in ref to prevent unnecessary re-renders
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [isFilterChanged, setIsFilterChanged] = useState(false);

  // Only reset pagination when core filters change
  useEffect(() => {
    console.log('🔍 ClaimsTable - Filter values changed:', {
      dealerFilter,
      searchQuery,
      dateRange: dateRange ? 
        { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() } : 
        'undefined'
    });
    
    // Set flag to indicate filters changed
    setIsFilterChanged(true);
    
    // Don't immediately reset page to allow useEffect cleanup
    
    // We don't need to explicitly invalidate queries here since
    // the useClaimsFetching hook uses the current filter values
    // in its query key
  }, [dealerFilter, searchQuery, dateRange]);

  // Handle filter changes in a separate effect to avoid race conditions
  useEffect(() => {
    if (isFilterChanged) {
      console.log('🔍 ClaimsTable - Resetting to page 1 due to filter change');
      setPage(1);
      setIsFilterChanged(false);
    }
  }, [isFilterChanged]);

  useEffect(() => {
    // Update local search query when prop changes
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Fetch claims data with all filters
  const { 
    data: claimsData, 
    isFetching 
  } = useClaimsFetching(page, pageSize, dealerFilter, dateRange);
  
  const claims = useMemo(() => claimsData?.data || [], [claimsData]);
  const totalCount = useMemo(() => claimsData?.count || 0, [claimsData]);

  // Apply client-side search filtering only
  const filteredClaims = useMemo(() => {
    console.log('🔍 ClaimsTable: Filtering claims with searchQuery:', localSearchQuery);
    
    let filtered = claims;
    
    if (localSearchQuery) {
      const term = localSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(claim => 
        claim.ClaimID?.toLowerCase().includes(term) || 
        claim.AgreementID?.toLowerCase().includes(term) ||
        claim.agreements?.dealers?.Payee?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [claims, localSearchQuery]);

  // Make these callbacks to prevent re-renders
  const handleSearch = useCallback((term: string) => {
    console.log('🔍 ClaimsTable: Search term changed to:', term);
    setLocalSearchQuery(term);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    console.log('📄 ClaimsTable: Page changed to:', newPage);
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    console.log('📄 ClaimsTable: Page size changed to:', newPageSize);
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

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
      title: 'Agreement Number',
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
      key: 'Payed',
      title: 'Payed',
      sortable: false,
      render: (row) => {
        // Use the totalPaid field from the improved SQL function
        // This now correctly sums PaidPrice values from PAID subclaims
        
        // Initialize amount - this ensures we always have a valid number
        let amount = 0;
        
        try {
          // Enhanced totalPaid handling with deep inspection for better debugging
          if (row.totalPaid !== undefined && row.totalPaid !== null) {
            // Case 1: Direct number value
            if (typeof row.totalPaid === 'number') {
              amount = row.totalPaid;
            }
            // Case 2: String that needs parsing
            else if (typeof row.totalPaid === 'string') {
              amount = parseFloat(row.totalPaid) || 0;
            }
            // Case 3: PostgreSQL numeric type with value property
            else if (typeof row.totalPaid === 'object') {
              if (row.totalPaid && 'value' in row.totalPaid) {
                amount = parseFloat(row.totalPaid.value) || 0;
              }
              else if (row.totalPaid && 'toFixed' in row.totalPaid) {
                // Handle case where it might be a Number object
                amount = Number(row.totalPaid) || 0;
              }
            }
          }

          // Debug info to help troubleshoot - very detailed for diagnosis
          if (process.env.NODE_ENV === 'development' && row.ClaimID) {
            console.log(`[CLAIMS_TABLE] Payment for ${row.ClaimID}:`, {
              rawValue: row.totalPaid,
              valueType: typeof row.totalPaid,
              finalAmount: amount,
              isPrimitive: (typeof row.totalPaid !== 'object' || row.totalPaid === null),
              objectDetails: (typeof row.totalPaid === 'object' && row.totalPaid !== null) ? 
                Object.getOwnPropertyNames(row.totalPaid) : 'N/A'
            });
          }
        }
        catch (err) {
          console.error(`[CLAIMS_TABLE] Error parsing payment for claim ${row.ClaimID}:`, err);
        }
        
        // Always display the amount with dollar sign and 2 decimal places
        // Only apply green styling to positive amounts
        return <span className={amount > 0 ? "text-success font-medium" : "text-muted-foreground"}>
          {`$${Math.abs(amount).toFixed(2)}`}
        </span>;
      },
    },
    {
      key: 'MostRecentPayment',
      title: 'Most Recent Payment',
      sortable: false,
      render: (row) => {
        // Use the lastPaymentDate field from our data fetching
        // Check if there's a valid lastPaymentDate before rendering
        
        // Debug info to help troubleshoot
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CLAIMS_TABLE] Claim ${row.ClaimID} payment date: lastPaymentDate=${row.lastPaymentDate ? row.lastPaymentDate.toString() : 'null'}`);
        }
        
        if (row.lastPaymentDate) {
          try {
            // Format the date, handle possible date parsing errors
            return format(new Date(row.lastPaymentDate), 'MMM d, yyyy');
          } catch (e) {
            console.error(`Error formatting payment date for claim ${row.ClaimID}:`, e);
            // If date parsing fails, show a dash instead of N/A
            return <span className="text-muted-foreground">-</span>;
          }
        } 
        // For null/undefined lastPaymentDate when there are no paid subclaims, show a dash
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: 'LastModified',
      title: 'Last Modified',
      sortable: false,
      render: (row) => row.LastModified ? format(new Date(row.LastModified), 'MMM d, yyyy')
         : <span className="text-muted-foreground">N/A</span>,
    }
  ];

  // Fixed: When using search term with DB query, we need to keep pagination working
  // Local filtering is only applied to the current page of results
  const displayedCount = filteredClaims.length;
  
  // Always use the total count from the database for pagination
  // This ensures proper pagination when dealer filter returns many records
  const effectiveTotalCount = totalCount;
  
  // Log pagination and filtering details for debugging
  console.log('Claims Pagination details:', {
    currentPage: page,
    pageSize: pageSize,
    totalCount: totalCount,
    displayedAfterFiltering: displayedCount,
    effectiveTotalForPagination: effectiveTotalCount,
    dealerFilter
  });

  return (
    <div className={className}>
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
          totalItems: effectiveTotalCount,
          pageSize: pageSize,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
};

export default ClaimsTable;