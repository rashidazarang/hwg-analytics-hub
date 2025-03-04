
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DateRange } from '@/lib/dateUtils';
import { DateFieldType, PaginationState } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/ui/pagination-controls';

type Claim = {
  id: string;
  ClaimID?: string;
  AgreementID?: string;
  ReportedDate?: DateFieldType;
  IncurredDate?: DateFieldType;
  Deductible?: number;
  Cause?: string;
  Complaint?: string;
  Closed?: DateFieldType;
  agreementId?: string;
  dateReported?: DateFieldType;
  dateIncurred?: DateFieldType;
  deductible?: number;
  dealerName?: string;
  amount?: number;
  status?: string;
};

async function fetchClaimsCount(
  dateRange?: DateRange,
  dealerFilter?: string,
  searchTerm?: string
): Promise<number> {
  try {
    console.log("📊 Fetching claims count with parameters:");
    console.log("📅 Date Range:", dateRange);
    console.log("🔍 Dealer UUID filter:", dealerFilter);
    console.log("🔍 Search term:", searchTerm);

    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    
    let query = supabase
      .from("claims")
      .select(`
        id, 
        agreements!inner(
          DealerUUID
        )
      `, { count: 'exact', head: true })
      .gte("ReportedDate", from)
      .lte("ReportedDate", to);
    
    // Apply dealer filter if specified
    if (dealerFilter && dealerFilter.trim()) {
      query = query.eq("agreements.DealerUUID", dealerFilter);
    }
    
    // Apply search filter if specified
    if (searchTerm && searchTerm.trim()) {
      query = query.or(`ClaimID.ilike.%${searchTerm.trim()}%,AgreementID.ilike.%${searchTerm.trim()}%`);
    }
    
    const { count, error } = await query;
    
    if (error) {
      console.error("❌ Error fetching claims count:", error);
      toast.error("Failed to count claims");
      return 0;
    }
    
    console.log(`✅ Total claims count: ${count}`);
    return count || 0;
  } catch (error) {
    console.error("❌ Exception fetching claims count:", error);
    return 0;
  }
}

async function fetchPaginatedClaims(
  page: number,
  pageSize: number,
  dateRange?: DateRange,
  dealerFilter?: string,
  searchTerm?: string
): Promise<Claim[]> {
  try {
    console.log("🔍 Fetching claims with parameters:");
    console.log("📅 Date Range:", dateRange);
    console.log("🔍 Dealer UUID filter:", dealerFilter);
    console.log("📄 Page:", page, "Size:", pageSize);
    console.log("🔍 Search term:", searchTerm);

    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    
    // Calculate start and end indices for pagination
    const startRow = (page - 1) * pageSize;
    const endRow = startRow + pageSize - 1;
    
    // Start building the query
    let query = supabase
      .from("claims")
      .select(`
        id, 
        ClaimID,
        AgreementID,
        ReportedDate,
        IncurredDate,
        Deductible,
        Cause,
        Complaint,
        Closed,
        agreements!inner(
          DealerUUID,
          dealers(
            Payee
          )
        )
      `)
      .gte("ReportedDate", from)
      .lte("ReportedDate", to);
    
    // Add dealer filter if specified
    if (dealerFilter && dealerFilter.trim()) {
      console.log(`🎯 Filtering by DealerUUID: "${dealerFilter}"`);
      query = query.eq("agreements.DealerUUID", dealerFilter);
    }
    
    // Apply search filter if specified
    if (searchTerm && searchTerm.trim()) {
      query = query.or(`ClaimID.ilike.%${searchTerm.trim()}%,AgreementID.ilike.%${searchTerm.trim()}%`);
    }
    
    // Execute the query with pagination
    const { data, error } = await query
      .order("ReportedDate", { ascending: false })
      .range(startRow, endRow);

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      toast.error("Failed to load claims");
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} claims for page ${page}`);
    
    // Transform the data to include the dealer name
    const transformedData = data?.map(claim => {
      // Get the dealer name from the nested data
      const dealerName = claim.agreements?.dealers?.Payee || "Unknown Dealer";
      
      // Set a status based on the Closed field
      let status: string;
      if (claim.Closed) {
        status = "CLOSED";
      } else if (claim.ReportedDate) {
        status = "OPEN";
      } else {
        status = "PENDING";
      }
      
      // Add a random amount for demo purposes (in real app, this would come from the database)
      const amount = Math.floor(Math.random() * 5000) + 500;
      
      return {
        ...claim,
        dealerName,
        status,
        amount
      };
    }) || [];
    
    if (transformedData.length > 0) {
      console.log(`📊 First claim:`, transformedData[0]);
    }
    
    return transformedData;
  } catch (error) {
    console.error("❌ Exception fetching claims:", error);
    return [];
  }
}

type ClaimsTableProps = {
  claims?: Claim[];
  className?: string;
  searchQuery?: string;
  dealerFilter?: string;
  dealerName?: string;
  dateRange?: DateRange;
};

const ClaimsTable: React.FC<ClaimsTableProps> = ({ 
  className = '', 
  searchQuery = '',
  dealerFilter = '',
  dealerName = '',
  dateRange
}) => {
  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0,
    startItem: 1,
    endItem: 10
  });

  // Update search term when searchQuery changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
      // Reset to page 1 when search changes
      setPage(1);
    }
  }, [searchQuery]);

  // Reset to page 1 when dealer filter changes
  useEffect(() => {
    console.log('🔍 ClaimsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 ClaimsTable - Current dealer name:', dealerName);
    if (dealerFilter) {
      setPage(1);
    }
  }, [dealerFilter, dealerName]);

  // Create query keys for React Query
  const countQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    return ["claims-count", from, to, dealerFilter, searchTerm];
  }, [dateRange, dealerFilter, searchTerm]);

  const claimsQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    return ["claims-paginated", from, to, dealerFilter, searchTerm, page, pageSize];
  }, [dateRange, dealerFilter, searchTerm, page, pageSize]);

  // Fetch total count for pagination
  const { 
    data: totalCount = 0,
    isFetching: isFetchingCount
  } = useQuery({
    queryKey: countQueryKey,
    queryFn: () => fetchClaimsCount(dateRange, dealerFilter, searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch paginated claims
  const { 
    data: claims = [],
    isFetching: isFetchingClaims,
    error: claimsError
  } = useQuery({
    queryKey: claimsQueryKey,
    queryFn: () => fetchPaginatedClaims(page, pageSize, dateRange, dealerFilter, searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutes
    keepPreviousData: true,
  });

  // Update pagination information when relevant values change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);
    
    setPagination({
      currentPage: page,
      totalPages,
      pageSize,
      totalItems: totalCount,
      startItem,
      endItem
    });
  }, [totalCount, page, pageSize]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    setPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    console.log(`Changing page size to ${newPageSize}`);
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Check for errors
  if (claimsError) {
    return <div className="py-10 text-center text-destructive">Error loading claims: {String(claimsError)}</div>;
  }

  // Loading indicator
  const isLoading = isFetchingClaims || isFetchingCount;

  return (
    <div className={className}>
      {/* Search input */}
      <div className="flex items-center mb-4">
        <Input
          className="max-w-sm"
          placeholder="Search by Claim ID or Agreement ID..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {/* Status indicator */}
      <div className="text-sm text-muted-foreground mb-2">
        {isLoading ? "Loading..." : 
          `Displaying ${pagination.startItem} to ${pagination.endItem} of ${pagination.totalItems} claims${dealerName ? ` for ${dealerName}` : ''}`
        }
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID</TableHead>
              <TableHead>Agreement ID</TableHead>
              <TableHead>Dealer Name</TableHead>
              <TableHead>Date Reported</TableHead>
              <TableHead>Date Incurred</TableHead>
              <TableHead>Deductible</TableHead>
              <TableHead>Claim Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 8 }).map((_, cellIndex) => (
                    <TableCell key={`cell-${i}-${cellIndex}`}>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No claims found.
                </TableCell>
              </TableRow>
            ) : (
              // Render actual data
              claims.map((claim) => (
                <TableRow key={claim.id || claim.ClaimID}>
                  <TableCell>{claim.ClaimID || ''}</TableCell>
                  <TableCell>{claim.AgreementID || claim.agreementId || ''}</TableCell>
                  <TableCell>{claim.dealerName || 'N/A'}</TableCell>
                  <TableCell>
                    {claim.ReportedDate || claim.dateReported ? 
                      format(new Date(claim.ReportedDate || claim.dateReported as string), 'MMM d, yyyy') : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {claim.IncurredDate || claim.dateIncurred ? 
                      format(new Date(claim.IncurredDate || claim.dateIncurred as string), 'MMM d, yyyy') : 
                      'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    ${(claim.Deductible || claim.deductible || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    ${(claim.amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = claim.status || 'UNKNOWN';
                      const variants = {
                        OPEN: 'bg-warning/15 text-warning border-warning/20',
                        CLOSED: 'bg-success/15 text-success border-success/20',
                        PENDING: 'bg-info/15 text-info border-info/20',
                        UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
                      };
                      
                      return (
                        <Badge variant="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border`}>
                          {status}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        startItem={pagination.startItem}
        endItem={pagination.endItem}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default ClaimsTable;
