import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { DateRange } from '@/lib/dateUtils';
import ClaimStatusBadge from '@/components/claims/ClaimStatusBadge';
import { useClaimsFetching } from '@/hooks/useClaimsFetching';
import { 
  useClaimPaymentData, 
  usePrefetchClaimsPaymentData, 
  getLastPaymentDate, 
  getTotalPaidValue 
} from '@/hooks/useClaimPaymentData';

// Increase default page size for better usability while keeping performance reasonable
const DEFAULT_PAGE_SIZE = 200; // Increased from 100 records per page to ensure more claims display

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
  // Use a try-catch block to handle potential errors
  const { 
    data: claimsData, 
    isFetching,
    error 
  } = useClaimsFetching(page, pageSize, dealerFilter, dateRange);
  
  // Log errors and handle specific error types for better user feedback
  useEffect(() => {
    if (error) {
      console.error('[CLAIMS_TABLE] Error fetching claims data:', error);
      
      // Check for timeout errors
      if (error instanceof Error && 
          (error.message.includes('timeout') || 
           (error as any).code === '57014' || // Statement timeout error code
           error.message.includes('statement timeout'))) {
        console.log('[CLAIMS_TABLE] Detected timeout error, showing friendly message');
        
        // For timeout errors, adjust the page size to be smaller for next attempt
        if (pageSize > 50) {
          console.log('[CLAIMS_TABLE] Reducing page size to avoid future timeouts');
          setPageSize(50); // Reduce page size for better performance
          setPage(1); // Reset to first page with new size
        }
      }
    }
  }, [error, pageSize]);
  
  const claims = useMemo(() => claimsData?.data || [], [claimsData]);
  const totalCount = useMemo(() => claimsData?.count || 0, [claimsData]);
  
  // Prefetch payment data for all claims in current view
  const claimIds = useMemo(() => claims.map(claim => claim.ClaimID), [claims]);
  usePrefetchClaimsPaymentData(claimIds);
  
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
        // Fully redesigned payment display component with better error handling, fallbacks and consistent formatting
        const PaymentDisplay = React.memo(({ claim }: { claim: any }) => {
          // First try to get payment data from the custom hook
          const { totalPaidValue, isLoading } = useClaimPaymentData(claim.ClaimID);
          
          // Enhanced function to extract payment values consistently
          const extractPaymentValue = (value: any): number => {
            // If value is null or undefined, return 0
            if (value === null || value === undefined) return 0;
            
            // Handle numeric type directly
            if (typeof value === 'number') {
              return isNaN(value) ? 0 : value;
            }
            
            // Handle string representation
            if (typeof value === 'string') {
              const parsed = parseFloat(value);
              return isNaN(parsed) ? 0 : parsed;
            }
            
            // Handle object types (like Postgres numeric)
            if (typeof value === 'object') {
              // If the object has a value property
              if (value && 'value' in value) {
                const parsed = parseFloat(value.value);
                return isNaN(parsed) ? 0 : parsed;
              }
              
              // Try JSON value if present
              if (value && 'json' in value) {
                try {
                  const jsonVal = JSON.parse(value.json);
                  return typeof jsonVal === 'number' ? jsonVal : 0;
                } catch (e) {
                  console.error('[CLAIMS_TABLE] Error parsing JSON value:', e);
                  return 0;
                }
              }
              
              // Last resort - try to stringify and parse the object
              try {
                const strValue = String(value);
                const parsed = parseFloat(strValue);
                return isNaN(parsed) ? 0 : parsed;
              } catch (e) {
                console.error('[CLAIMS_TABLE] Error parsing object as string:', e);
                return 0;
              }
            }
            
            // Default fallback
            return 0;
          };
          
          // Function to format payment amount consistently with currency formatting
          const formatPayment = (amount: number) => {
            return (
              <span className={amount > 0 ? "text-success font-medium" : "text-muted-foreground"}>
                {`$${amount.toFixed(2)}`}
              </span>
            );
          };
          
          // First priority: Use the hook data if it's available and not loading
          if (!isLoading && totalPaidValue !== undefined) {
            console.log(`[CLAIMS_TABLE] Using hook payment data for ${claim.ClaimID}: ${totalPaidValue}`);
            return formatPayment(totalPaidValue);
          }
          
          // Second priority: Try to extract payment from the row data
          if (claim.totalPaid !== undefined) {
            try {
              const amount = extractPaymentValue(claim.totalPaid);
              console.log(`[CLAIMS_TABLE] Using row payment data for ${claim.ClaimID}: ${amount}`);
              return formatPayment(amount);
            } catch (err) {
              console.error(`[CLAIMS_TABLE] Error extracting payment from row:`, err);
            }
          }
          
          // If we're still loading and couldn't extract data, show the loading state
          if (isLoading) {
            return <span className="text-muted-foreground">Loading...</span>;
          }
          
          // Final fallback: Return zero
          return formatPayment(0);
        });
        
        // Return payment display with the full row for context
        return <PaymentDisplay claim={row} />;
      },
    },
    {
      key: 'MostRecentPayment',
      title: 'Most Recent Payment',
      sortable: false,
      render: (row) => {
        // Fully redesigned payment date display with better error handling, consistent formatting and fallbacks
        const PaymentDateDisplay = React.memo(({ claim }: { claim: any }) => {
          // First try to get payment data from the custom hook
          const { lastPaymentDate, isLoading } = useClaimPaymentData(claim.ClaimID);
          
          // Enhanced function to extract and validate a date
          const extractAndValidateDate = (value: any): Date | null => {
            if (!value) return null;
            
            try {
              let date: Date | null = null;
              
              // If already a Date object
              if (value instanceof Date) {
                date = value;
              } 
              // If ISO string or similar format
              else if (typeof value === 'string') {
                date = new Date(value);
              } 
              // If timestamp number
              else if (typeof value === 'number') {
                date = new Date(value);
              }
              // If object with toISOString or similar
              else if (typeof value === 'object' && value !== null) {
                if ('toISOString' in value && typeof value.toISOString === 'function') {
                  return value;
                } else if ('date' in value && value.date) {
                  return new Date(value.date);
                } else {
                  // Try to stringify and parse
                  const strValue = String(value);
                  date = new Date(strValue);
                }
              }
              
              // Validate the date is valid
              return (date && !isNaN(date.getTime())) ? date : null;
            } catch (e) {
              console.error(`[CLAIMS_TABLE] Error extracting date:`, e);
              return null;
            }
          };
          
          // Function to format payment date consistently
          const formatDate = (date: Date | null) => {
            if (date && !isNaN(date.getTime())) {
              return <span>{format(date, 'MMM d, yyyy')}</span>;
            } else {
              return <span className="text-muted-foreground">-</span>;
            }
          };
          
          // First priority: Use the hook data if it's available and not loading
          if (!isLoading && lastPaymentDate) {
            const validDate = extractAndValidateDate(lastPaymentDate);
            if (validDate) {
              console.log(`[CLAIMS_TABLE] Using hook payment date for ${claim.ClaimID}: ${validDate.toISOString()}`);
              return formatDate(validDate);
            }
          }
          
          // Second priority: Try to extract date from the row data
          if (claim.lastPaymentDate) {
            const rowDate = extractAndValidateDate(claim.lastPaymentDate);
            if (rowDate) {
              console.log(`[CLAIMS_TABLE] Using row payment date for ${claim.ClaimID}: ${rowDate.toISOString()}`);
              return formatDate(rowDate);
            }
          }
          
          // If we're still loading and couldn't extract data, show the loading state
          if (isLoading) {
            return <span className="text-muted-foreground">Loading...</span>;
          }
          
          // Final fallback: No date available
          return <span className="text-muted-foreground">-</span>;
        });
        
        // Return payment date display with the full row for context
        return <PaymentDateDisplay claim={row} />;
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
  
  // Log pagination and filtering details for deeper debugging 
  console.log('Claims Pagination details:', {
    currentPage: page,
    pageSize: pageSize,
    totalCount: totalCount,
    displayedAfterFiltering: displayedCount,
    effectiveTotalForPagination: effectiveTotalCount,
    dealerFilter,
    dateRangeFrom: dateRange?.from.toISOString() || 'undefined',
    dateRangeTo: dateRange?.to.toISOString() || 'undefined',
    // Include more information about potential filtering
    searchActive: !!localSearchQuery,
    searchTerm: localSearchQuery || 'none'
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