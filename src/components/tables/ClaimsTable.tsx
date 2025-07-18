import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { DateRange } from '@/lib/dateUtils';
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge';
import { useClaimsFetching } from '@/hooks/useClaimsFetching';
import { 
  useClaimPaymentData, 
  usePrefetchClaimsPaymentData, 
  getLastPaymentDate, 
  getTotalPaidValue 
} from '@/hooks/useClaimPaymentData';
import { useSearchClaimsById } from '@/hooks/useSharedClaimsData';
import { Button } from '@/components/ui/button';
import { CalendarClock, ArrowUpDown, Filter, SlidersHorizontal } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

// Set a reasonable page size to prevent query timeouts
const DEFAULT_PAGE_SIZE = 100; // Reduced from 500 to prevent timeout issues

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
  const [totalClaimsCount, setTotalClaimsCount] = useState(0);
  const [isIdSearch, setIsIdSearch] = useState(false);
  const [sortByPaymentDate, setSortByPaymentDate] = useState(false);

  // Handler for search changes
  const handleSearch = (term: string) => {
    console.log("🔍 Claims search term updated:", term);
    setLocalSearchQuery(term);
    setPage(1); // Reset page when searching
    
    // Check if this is an ID search (alphanumeric with possible dashes)
    const isIdSearchPattern = /^[a-zA-Z0-9-]+$/.test(term.trim());
    setIsIdSearch(isIdSearchPattern && term.trim().length >= 3);
    
    // If we're clearing a previous search, refresh the data
    if (!term.trim() && localSearchQuery.trim()) {
      console.log("🔄 Clearing search term, refreshing claims data");
      setIsIdSearch(false);
    }
  };

  // Toggle sort by payment date
  const toggleSortByPaymentDate = () => {
    setSortByPaymentDate(!sortByPaymentDate);
    setPage(1); // Reset to first page when changing sort
    console.log(`🔄 Toggling sort by payment date: ${!sortByPaymentDate}`);
  };

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
    setIsIdSearch(false);
    
    // We don't need to explicitly invalidate queries here since
    // the useClaimsFetching hook uses the current filter values
    // in its query key
  }, [dealerFilter, searchQuery, dateRange]);

  // Fetch claims data with all filters when not doing an ID search
  const { 
    data: claimsData, 
    isFetching: isFilteredFetching,
    error: filteredError,
    totalCount: fetchedTotalCount
  } = useClaimsFetching(page, pageSize, dealerFilter, dateRange, sortByPaymentDate) as any; // Use type assertion to avoid TypeScript errors
  
  // Fetch claims by ID when doing an ID search
  const {
    data: idSearchData,
    isFetching: isIdSearchFetching,
    error: idSearchError
  } = useSearchClaimsById(isIdSearch ? localSearchQuery : '');
  
  // Determine which data source to use
  const effectiveData = isIdSearch ? idSearchData : claimsData;
  const isFetching = isIdSearch ? isIdSearchFetching : isFilteredFetching;
  const error = isIdSearch ? idSearchError : filteredError;
  
  // Update total count when it changes
  useEffect(() => {
    if (isIdSearch && idSearchData) {
      setTotalClaimsCount(idSearchData.count || 0);
      console.log(`[CLAIMS_TABLE] Updated total claims count from ID search: ${idSearchData.count || 0}`);
    } else if (!isIdSearch && fetchedTotalCount !== undefined && fetchedTotalCount !== null) {
      setTotalClaimsCount(fetchedTotalCount);
      console.log(`[CLAIMS_TABLE] Updated total claims count from filtered search: ${fetchedTotalCount}`);
    }
  }, [fetchedTotalCount, idSearchData, isIdSearch]);
  
  const claims = useMemo(() => effectiveData?.data || [], [effectiveData]);
  const totalCount = useMemo(() => totalClaimsCount || 0, [totalClaimsCount]);
  
  // Prefetch payment data for all claims in current view
  const claimIds = useMemo(() => claims.map(claim => claim.ClaimID), [claims]);
  usePrefetchClaimsPaymentData(claimIds);
  
  // Apply client-side search filtering only for non-ID searches
  const filteredClaims = useMemo(() => {
    console.log('🔍 ClaimsTable: Filtering claims with searchQuery:', localSearchQuery);
    
    // If doing an ID search, don't apply additional filtering
    if (isIdSearch) {
      console.log('🔍 ClaimsTable: Using ID search results directly');
      return claims;
    }
    
    let filtered = claims;
    
    if (localSearchQuery && !isIdSearch) {
      const term = localSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(claim => 
        claim.ClaimID?.toLowerCase().includes(term) || 
        claim.AgreementID?.toLowerCase().includes(term) ||
        claim.agreements?.dealers?.Payee?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [claims, localSearchQuery, isIdSearch]);

  // Define table columns
  const columns: Column<any>[] = [
    {
      key: 'ClaimID',
      title: 'Claim ID',
      sortable: false,
      searchable: true,
      render: (row) => (
        <Link 
          to={`/claims/${row.ClaimID}`} 
          className="text-primary hover:underline font-medium"
        >
          {row.ClaimID || ''}
        </Link>
      ),
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
        // Fully redesigned payment display with better error handling, consistent formatting and fallbacks
        const PaymentDisplay = React.memo(({ claim, isSortingByPayment }: { claim: any, isSortingByPayment: boolean }) => {
          // First try to get payment data from the custom hook
          const paymentResult = useClaimPaymentData(claim.ClaimID);
          const totalPaidValue = paymentResult?.data?.totalPaid;
          const isLoading = paymentResult?.isLoading;
          
          // Helper function to extract payment value from various formats
          const extractPaymentValue = (value: any): number => {
            if (value === null || value === undefined) return 0;
            
            if (typeof value === 'number') return value;
            if (typeof value === 'string') return parseFloat(value) || 0;
            
            // Handle object formats (like PostgreSQL numeric)
            if (typeof value === 'object') {
              if ('value' in value) return parseFloat(value.value) || 0;
              return parseFloat(String(value)) || 0;
            }
            
            return 0;
          };
          
          const formatPayment = (amount: number) => {
            return (
              <span className={amount > 0 ? "text-success font-medium" : "text-muted-foreground"}>
                {`$${amount.toFixed(2)}`}
              </span>
            );
          };
          
          // Debug all possible payment properties in the claim object
          console.log(`[CLAIMS_TABLE] Payment data debug for claim ${claim.ClaimID}:`, {
            fromHook: {
              totalPaidValue,
              isLoading
            },
            fromRow: {
              totalPaid: claim.totalPaid,
              TotalPaid: claim.TotalPaid,
              totalpaid: claim.totalpaid,
              // Check for any other possible payment properties
              paidPrice: claim.paidPrice,
              PaidPrice: claim.PaidPrice,
              paidprice: claim.paidprice,
              // Check for nested properties
              hasSubclaims: !!claim.subclaims,
              hasSubclaimParts: !!claim.subclaim_parts
            },
            allKeys: Object.keys(claim)
          });
          
          // When sorting by payment date, prioritize the row data first
          // This ensures the UI matches the sorting order
          if (isSortingByPayment) {
            // First check for payment amount in the row data
            const possiblePaymentProps = [
              'totalPaid', 'TotalPaid', 'totalpaid', 
              'paidPrice', 'PaidPrice', 'paidprice',
              'TotalPaid', 'total_paid'
            ];
            
            for (const prop of possiblePaymentProps) {
              if (claim[prop] !== undefined) {
                try {
                  const amount = extractPaymentValue(claim[prop]);
                  if (amount > 0) {
                    console.log(`[CLAIMS_TABLE] Using row payment data (${prop}) for ${claim.ClaimID}: ${amount} (from sorted data)`);
                    return formatPayment(amount);
                  }
                } catch (err) {
                  console.error(`[CLAIMS_TABLE] Error extracting payment from row (${prop}):`, err);
                }
              }
            }
            
            // If no row data but we have hook data, use that as fallback
            if (!isLoading && totalPaidValue !== undefined && totalPaidValue > 0) {
              console.log(`[CLAIMS_TABLE] Using hook payment data for ${claim.ClaimID}: ${totalPaidValue} (fallback)`);
              return formatPayment(totalPaidValue);
            }
          } else {
            // Original priority order when not sorting by payment date
            // First priority: Use the hook data if it's available and not loading
            if (!isLoading && totalPaidValue !== undefined) {
              console.log(`[CLAIMS_TABLE] Using hook payment data for ${claim.ClaimID}: ${totalPaidValue}`);
              return formatPayment(totalPaidValue);
            }
            
            // Second priority: Try to extract amount from the row data
            const possiblePaymentProps = [
              'totalPaid', 'TotalPaid', 'totalpaid', 
              'paidPrice', 'PaidPrice', 'paidprice',
              'TotalPaid', 'total_paid'
            ];
            
            for (const prop of possiblePaymentProps) {
              if (claim[prop] !== undefined) {
                try {
                  const amount = extractPaymentValue(claim[prop]);
                  if (amount > 0) {
                    console.log(`[CLAIMS_TABLE] Using row payment data (${prop}) for ${claim.ClaimID}: ${amount}`);
                    return formatPayment(amount);
                  }
                } catch (err) {
                  console.error(`[CLAIMS_TABLE] Error extracting payment from row (${prop}):`, err);
                }
              }
            }
          }
          
          // If we're still loading and couldn't extract data, show the loading state
          if (isLoading) {
            return <Skeleton className="h-4 w-16" />;
          }
          
          // Default fallback
          return formatPayment(0);
        });
        
        return <PaymentDisplay claim={row} isSortingByPayment={sortByPaymentDate} />;
      },
    },
    {
      key: 'MostRecentPayment',
      title: 'Most Recent Payment',
      sortable: false,
      render: (row) => {
        // Fully redesigned payment date display with better error handling, consistent formatting and fallbacks
        const PaymentDateDisplay = React.memo(({ claim, isSortingByPayment }: { claim: any, isSortingByPayment: boolean }) => {
          // First try to get payment data from the custom hook
          const paymentResult = useClaimPaymentData(claim.ClaimID);
          const lastPaymentDate = paymentResult?.data?.lastPaymentDate;
          const isLoading = paymentResult?.isLoading;
          
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
          
          // Debug all possible payment date properties in the claim object
          console.log(`[CLAIMS_TABLE] Payment date debug for claim ${claim.ClaimID}:`, {
            fromHook: {
              lastPaymentDate,
              isLoading
            },
            fromRow: {
              lastPaymentDate: claim.lastPaymentDate,
              LastPaymentDate: claim.LastPaymentDate,
              lastpaymentdate: claim.lastpaymentdate,
              // Check for any other possible date properties
              paymentDate: claim.paymentDate,
              PaymentDate: claim.PaymentDate,
              paymentdate: claim.paymentdate,
            },
            allKeys: Object.keys(claim)
          });
          
          // When sorting by payment date, prioritize the row data first
          // This ensures the UI matches the sorting order
          if (isSortingByPayment) {
            // First check for payment date in the row data
            const possibleDateProps = [
              'lastPaymentDate', 'LastPaymentDate', 'lastpaymentdate',
              'paymentDate', 'PaymentDate', 'paymentdate'
            ];
            
            for (const prop of possibleDateProps) {
              if (claim[prop] !== undefined && claim[prop] !== null) {
                try {
                  const rowDate = extractAndValidateDate(claim[prop]);
                  if (rowDate) {
                    console.log(`[CLAIMS_TABLE] Using row payment date for ${claim.ClaimID}: ${rowDate.toISOString()} (from sorted data, prop: ${prop})`);
                    return formatDate(rowDate);
                  }
                } catch (err) {
                  console.error(`[CLAIMS_TABLE] Error extracting date from row (${prop}):`, err);
                }
              }
            }
            
            // If no row data but we have hook data, use that as fallback
            if (!isLoading && lastPaymentDate) {
              const validDate = extractAndValidateDate(lastPaymentDate);
              if (validDate) {
                console.log(`[CLAIMS_TABLE] Using hook payment date for ${claim.ClaimID}: ${validDate.toISOString()} (fallback)`);
                return formatDate(validDate);
              }
            }
          } else {
            // Original priority order when not sorting by payment date
            // First priority: Use the hook data if it's available and not loading
            if (!isLoading && lastPaymentDate) {
              const validDate = extractAndValidateDate(lastPaymentDate);
              if (validDate) {
                console.log(`[CLAIMS_TABLE] Using hook payment date for ${claim.ClaimID}: ${validDate.toISOString()}`);
                return formatDate(validDate);
              }
            }
            
            // Second priority: Try to extract date from the row data
            const possibleDateProps = [
              'lastPaymentDate', 'LastPaymentDate', 'lastpaymentdate',
              'paymentDate', 'PaymentDate', 'paymentdate'
            ];
            
            for (const prop of possibleDateProps) {
              if (claim[prop] !== undefined && claim[prop] !== null) {
                try {
                  const rowDate = extractAndValidateDate(claim[prop]);
                  if (rowDate) {
                    console.log(`[CLAIMS_TABLE] Using row payment date for ${claim.ClaimID}: ${rowDate.toISOString()} (prop: ${prop})`);
                    return formatDate(rowDate);
                  }
                } catch (err) {
                  console.error(`[CLAIMS_TABLE] Error extracting date from row (${prop}):`, err);
                }
              }
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
        return <PaymentDateDisplay claim={row} isSortingByPayment={sortByPaymentDate} />;
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
  
  // Calculate total pages
  const totalPages = Math.ceil(effectiveTotalCount / pageSize);
  
  // Log pagination and filtering details for deeper debugging 
  console.log('Claims Pagination details:', {
    currentPage: page,
    pageSize: pageSize,
    totalCount: totalCount,
    totalPages: totalPages,
    displayedAfterFiltering: displayedCount,
    effectiveTotalForPagination: effectiveTotalCount,
    dealerFilter,
    dateRangeFrom: dateRange?.from.toISOString() || 'undefined',
    dateRangeTo: dateRange?.to.toISOString() || 'undefined',
    // Include more information about potential filtering
    searchActive: !!localSearchQuery,
    searchTerm: localSearchQuery || 'none',
    isIdSearch
  });

  // Update the useEffect in this component to check data structure
  useEffect(() => {
    // Check the data structure when claims are loaded
    if (claims && claims.length > 0) {
      const firstClaim = claims[0] as any; // Use type assertion to avoid TypeScript errors
      
      console.log('[CLAIMS_TABLE] Sample claim data structure:', {
        firstClaim,
        hasPaymentProps: firstClaim.hasOwnProperty('totalPaid') || firstClaim.hasOwnProperty('TotalPaid'),
        paymentData: {
          totalPaid: firstClaim.totalPaid,
          TotalPaid: firstClaim.TotalPaid,
          totalpaid: firstClaim.totalpaid,
          lastPaymentDate: firstClaim.lastPaymentDate,
          LastPaymentDate: firstClaim.LastPaymentDate,
          lastpaymentdate: firstClaim.lastpaymentdate
        },
        claimKeys: Object.keys(firstClaim)
      });
      
      // Check if any claims have payment data
      const claimsWithPayment = claims.filter(claim => {
        const c = claim as any; // Use type assertion
        return (c.totalPaid && c.totalPaid > 0) || 
               (c.TotalPaid && c.TotalPaid > 0) ||
               (c.totalpaid && c.totalpaid > 0);
      });
      
      console.log(`[CLAIMS_TABLE] Found ${claimsWithPayment.length} claims with payment data out of ${claims.length} total claims`);
      
      if (claimsWithPayment.length > 0) {
        const sampleClaim = claimsWithPayment[0] as any; // Use type assertion
        
        console.log('[CLAIMS_TABLE] Sample claim with payment:', {
          claim: sampleClaim,
          paymentData: {
            totalPaid: sampleClaim.totalPaid,
            TotalPaid: sampleClaim.TotalPaid,
            totalpaid: sampleClaim.totalpaid
          }
        });
      }
    }
  }, [claims]);

  return (
    <div className={className}>
      {isIdSearch && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>ID Search Mode:</strong> Showing results for "{localSearchQuery}" across all claims, ignoring date range and dealer filters.
          </p>
        </div>
      )}
      {sortByPaymentDate && !isIdSearch && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Payment Date Sort:</strong> Claims are sorted by most recent payment date, showing claims with the most recent payments first.
          </p>
        </div>
      )}
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
          searchKeys: ["ClaimID", "AgreementID", "agreements.dealers.Payee"],
          sortToggle: (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle 
                    pressed={sortByPaymentDate} 
                    onPressedChange={toggleSortByPaymentDate}
                    className={`${sortByPaymentDate ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} h-9 w-9 p-0 rounded-md transition-all duration-200 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`}
                    disabled={isIdSearch || isFetching}
                    aria-label={sortByPaymentDate ? "Sort by Last Modified" : "Sort by Payment Date"}
                  >
                    <Filter className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{sortByPaymentDate ? "Sort by Last Modified" : "Sort by Payment Date"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
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
      {totalPages > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Showing page {page} of {totalPages} ({effectiveTotalCount} total claims)
          {sortByPaymentDate && !isIdSearch && (
            <span className="ml-2 text-primary font-medium">
              Sorted by most recent payment
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaimsTable;