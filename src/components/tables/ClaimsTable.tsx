import React, { useState, useEffect, useMemo } from 'react';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Only reset pagination when core filters change
  useEffect(() => {
    console.log('🔍 ClaimsTable - Filter values changed:', {
      dealerFilter,
      searchQuery,
      dateRange: dateRange ? 
        { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() } : 
        'undefined'
    });
    
    // Reset to page 1 when filters change
    setPage(1);
    setLocalSearchQuery(searchQuery);
    
    // We don't need to explicitly invalidate queries here since
    // the useClaimsFetching hook uses the current filter values
    // in its query key
  }, [dealerFilter, searchQuery, dateRange]);

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
        // Use the totalPaid field from the SQL query using get_claims_payment_info
        // This comes from summing all PaidPrice values for PAID subclaims
        
        // Handle undefined, null, or non-numeric values
        let amount = 0;
        
        // Enhanced handling of totalPaid to ensure correct data display
        if (row.totalPaid !== undefined && row.totalPaid !== null) {
          // Handle various data types that might come from the database or API
          if (typeof row.totalPaid === 'string') {
            // Parse string to number, defaulting to 0 if parsing fails
            amount = parseFloat(row.totalPaid) || 0;
          } else if (typeof row.totalPaid === 'number') {
            // Direct numeric value
            amount = row.totalPaid;
          } else if (typeof row.totalPaid === 'object') {
            // Handle PostgreSQL numeric type which may come as an object with a value property
            if (row.totalPaid && row.totalPaid.hasOwnProperty('value')) {
              amount = parseFloat(row.totalPaid.value) || 0;
            }
          }
        }
        
        // Debug info to help troubleshoot - very detailed for diagnosis
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[CLAIMS_TABLE] Claim ${row.ClaimID} payment:` +
            ` totalPaid=${JSON.stringify(row.totalPaid)},` +
            ` type=${typeof row.totalPaid},` + 
            ` subtype=${row.totalPaid && typeof row.totalPaid === 'object' ? 'object with keys: ' + Object.keys(row.totalPaid).join(',') : 'n/a'},` +
            ` calculated=${amount}`
          );
        }
        
        // Always display the amount with dollar sign and 2 decimal places
        // Only apply green styling to positive amounts
        return <span className={amount > 0 ? "text-success font-medium" : "text-muted-foreground"}>
          {`$${amount.toFixed(2)}`}
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

  // Handlers
  const handleSearch = (term: string) => {
    console.log("🔍 Claims search term updated:", term);
    setLocalSearchQuery(term);
    setPage(1); // Reset page only when searching
    
    // If we're clearing a previous search, refresh the data to ensure
    // we get the full dataset back
    if (!term.trim() && localSearchQuery.trim()) {
      console.log("🔄 Clearing search term, refreshing claims data");
      // The hook will re-fetch data without the search filter
    }
  };

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
          onPageChange: setPage,
          onPageSizeChange: (newPageSize) => {
            setPageSize(newPageSize);
            setPage(1); // Reset to first page when changing page size
          },
        }}
      />
    </div>
  );
};

export default ClaimsTable;