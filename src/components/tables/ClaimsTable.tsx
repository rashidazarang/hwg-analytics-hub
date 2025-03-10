import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { DateRange } from '@/lib/dateUtils';
import ClaimStatusBadge from '@/components/claims/ClaimStatusBadge';
import { useClaimsFetching } from '@/hooks/useClaimsFetching';

const PAGE_SIZE = 1000;

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
      render: (row) => {
        // Enhanced dealership display with better fallbacks
        if (row.DealerName) {
          // Display directly from our custom SQL function
          return row.DealerName;
        } else if (row.agreements?.dealers?.Payee) {
          // Get from nested data structure
          return row.agreements.dealers.Payee;
        } else if (row.agreements?.DealerUUID) {
          // At least show the UUID if we have it
          return `Dealer ${row.agreements.DealerUUID.substring(0, 8)}...`;
        } else {
          return "Unknown Dealership";
        }
      },
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
        // Enhanced payment amount display with robust error handling
        try {
          // Initialize amount - this ensures we always have a valid number
          let amount = 0;
          
          // Log payment data for debugging
          console.log(`[CLAIMS_TABLE] Payment data for ${row.ClaimID}:`, {
            totalPaid: row.totalPaid,
            type: typeof row.totalPaid,
            hasValue: row.totalPaid !== undefined && row.totalPaid !== null,
            objectInspect: typeof row.totalPaid === 'object' ? Object.keys(row.totalPaid || {}) : 'not an object'
          });
          
          // Enhanced totalPaid handling with deep inspection
          if (row.totalPaid !== undefined && row.totalPaid !== null) {
            // Case 1: Direct number value
            if (typeof row.totalPaid === 'number') {
              amount = row.totalPaid;
            }
            // Case 2: String that needs parsing
            else if (typeof row.totalPaid === 'string') {
              amount = parseFloat(row.totalPaid) || 0;
            }
            // Case 3: Object with value property (PostgreSQL numeric type)
            else if (typeof row.totalPaid === 'object') {
              if (row.totalPaid && 'value' in row.totalPaid) {
                amount = parseFloat(row.totalPaid.value) || 0;
              }
              else if (row.totalPaid && typeof row.totalPaid.toString === 'function') {
                // Try using toString() and parsing the result
                const strValue = row.totalPaid.toString();
                amount = parseFloat(strValue) || 0;
              }
            }
          }
          
          // Always display the amount with dollar sign and 2 decimal places
          // Only apply green styling to positive amounts
          return <span className={amount > 0 ? "text-success font-medium" : "text-muted-foreground"}>
            {`$${Math.abs(amount).toFixed(2)}`}
          </span>;
        } catch (err) {
          console.error(`[CLAIMS_TABLE] Error rendering payment for claim ${row.ClaimID}:`, err);
          return <span className="text-muted-foreground">$0.00</span>;
        }
      },
    },
    {
      key: 'MostRecentPayment',
      title: 'Most Recent Payment',
      sortable: false,
      render: (row) => {
        try {
          // Enhanced date display with better error handling
          
          // Debug info to help troubleshoot
          if (process.env.NODE_ENV === 'development') {
            console.log(`[CLAIMS_TABLE] Claim ${row.ClaimID} payment date:`, {
              hasDateProp: row.hasOwnProperty('lastPaymentDate'),
              dateValue: row.lastPaymentDate,
              dateType: row.lastPaymentDate ? typeof row.lastPaymentDate : 'null'
            });
          }
          
          // Handle various cases for lastPaymentDate
          if (row.lastPaymentDate) {
            // It could be a Date object, string, or timestamp
            let paymentDate: Date;
            
            if (row.lastPaymentDate instanceof Date) {
              paymentDate = row.lastPaymentDate;
            } else if (typeof row.lastPaymentDate === 'string') {
              paymentDate = new Date(row.lastPaymentDate);
            } else if (typeof row.lastPaymentDate === 'number') {
              paymentDate = new Date(row.lastPaymentDate);
            } else {
              // If it's some unexpected type, show a dash
              return <span className="text-muted-foreground">-</span>;
            }
            
            // Check if date is valid before formatting
            if (!isNaN(paymentDate.getTime())) {
              return format(paymentDate, 'MMM d, yyyy');
            }
          }
          
          // For null/undefined/invalid lastPaymentDate, show a dash
          return <span className="text-muted-foreground">-</span>;
        } catch (err) {
          console.error(`[CLAIMS_TABLE] Error rendering payment date for claim ${row.ClaimID}:`, err);
          return <span className="text-muted-foreground">-</span>;
        }
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

  // Update the useEffect in this component to check data structure
  useEffect(() => {
    // Check the data structure when claims are loaded
    if (claims && claims.length > 0) {
      console.log('[CLAIMS_TABLE] Sample claim data structure:', {
        firstClaim: claims[0],
        hasPaymentProps: claims[0].hasOwnProperty('totalPaid'),
        claimKeys: Object.keys(claims[0])
      });
    }
  }, [claims]);

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