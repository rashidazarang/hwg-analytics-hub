import React from 'react';
import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { PaginationState, Agreement } from '@/lib/types';

type Dealer = {
  DealerUUID: string;
  PayeeID: string;
  Payee?: string | null;
};

const formatName = (name?: string | null): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

// Fetch total count of agreements
async function fetchAgreementsCount(dateRange?: DateRange, dealerFilter?: string, searchTerm?: string): Promise<number> {
  try {
    console.log("📊 Fetching count with parameters:");
    console.log("📅 Date Range:", dateRange);
    console.log("🔍 Dealer UUID filter:", dealerFilter);
    console.log("🔍 Search term:", searchTerm);

    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    
    let query = supabase
      .from("agreements")
      .select('id', { count: 'exact', head: true })
      .gte("EffectiveDate", from)
      .lte("EffectiveDate", to);
    
    // Apply dealer filter if specified
    if (dealerFilter && dealerFilter.trim()) {
      query = query.eq("DealerUUID", dealerFilter);
    }
    
    // Apply search filter if specified
    if (searchTerm && searchTerm.trim()) {
      query = query.ilike("AgreementID", `%${searchTerm.trim()}%`);
    }
    
    const { count, error } = await query;
    
    if (error) {
      console.error("❌ Error fetching agreements count:", error);
      toast.error("Failed to count agreements");
      return 0;
    }
    
    console.log(`✅ Total agreements count: ${count}`);
    return count || 0;
  } catch (error) {
    console.error("❌ Exception fetching agreements count:", error);
    return 0;
  }
}

// Fetch paginated agreements
async function fetchPaginatedAgreements(
  page: number,
  pageSize: number,
  dateRange?: DateRange,
  dealerFilter?: string,
  searchTerm?: string
): Promise<Agreement[]> {
  try {
    console.log("🔍 Fetching agreements with parameters:");
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
      .from("agreements")
      .select(`
        id, 
        AgreementID, 
        HolderFirstName, 
        HolderLastName, 
        DealerUUID, 
        DealerID, 
        EffectiveDate, 
        ExpireDate, 
        AgreementStatus, 
        Total, 
        DealerCost, 
        ReserveAmount, 
        dealers(Payee)
      `)
      .gte("EffectiveDate", from)
      .lte("EffectiveDate", to);
    
    // Add dealer filter if specified
    if (dealerFilter && dealerFilter.trim()) {
      console.log(`🎯 Filtering by DealerUUID: "${dealerFilter}"`);
      query = query.eq("DealerUUID", dealerFilter);
    }
    
    // Apply search filter if specified
    if (searchTerm && searchTerm.trim()) {
      query = query.ilike("AgreementID", `%${searchTerm.trim()}%`);
    }
    
    // Execute the query with pagination
    const { data, error } = await query
      .order("EffectiveDate", { ascending: false })
      .range(startRow, endRow);

    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      toast.error("Failed to load agreements");
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} agreements for page ${page}`);
    if (data && data.length > 0) {
      console.log(`📊 First agreement:`, data[0]);
    }
    
    return data || [];
  } catch (error) {
    console.error("❌ Exception fetching agreements:", error);
    return [];
  }
}

// Fetch all dealers
async function fetchDealers(): Promise<Dealer[]> {
  try {
    const PAGE_SIZE = 1000;
    let allDealers: Dealer[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("dealers")
        .select("DealerUUID, PayeeID, Payee")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error("❌ Supabase Error fetching dealers:", error);
        return allDealers;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allDealers = [...allDealers, ...data];

      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log("✅ Fetched Dealers:", allDealers.length, "records");
    return allDealers;
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return [];
  }
}

type AgreementsTableProps = {
  className?: string;
  dateRange?: DateRange;
  searchQuery?: string;
  dealerFilter?: string; // This should be the UUID of the dealer
  dealerName?: string;   // This is the display name of the dealer
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({ 
  className = '', 
  dateRange, 
  searchQuery = '',
  dealerFilter = '',
  dealerName = ''
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
    console.log('🔍 AgreementsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 AgreementsTable - Current dealer name:', dealerName);
    if (dealerFilter) {
      setPage(1);
    }
  }, [dealerFilter, dealerName]);

  // Create query keys for React Query
  const countQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    return ["agreements-count", from, to, dealerFilter, searchTerm];
  }, [dateRange, dealerFilter, searchTerm]);

  const agreementsQueryKey = useMemo(() => {
    const from = dateRange?.from ? dateRange.from.toISOString() : "2020-01-01T00:00:00.000Z";
    const to = dateRange?.to ? dateRange.to.toISOString() : "2025-12-31T23:59:59.999Z";
    return ["agreements-paginated", from, to, dealerFilter, searchTerm, page, pageSize];
  }, [dateRange, dealerFilter, searchTerm, page, pageSize]);

  // Fetch total count for pagination
  const { 
    data: totalCount = 0,
    isFetching: isFetchingCount
  } = useQuery({
    queryKey: countQueryKey,
    queryFn: () => fetchAgreementsCount(dateRange, dealerFilter, searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch paginated agreements
  const { 
    data: agreements = [],
    isFetching: isFetchingAgreements,
    error: agreementsError
  } = useQuery({
    queryKey: agreementsQueryKey,
    queryFn: () => fetchPaginatedAgreements(page, pageSize, dateRange, dealerFilter, searchTerm),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: agreements
  });

  // Fetch dealers for mapping
  const { 
    data: dealers = [],
    isFetching: isFetchingDealers 
  } = useQuery({
    queryKey: ["dealers-data"],
    queryFn: fetchDealers,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Create dealer mapping for lookups
  const dealerMap = useMemo(() => {
    if (!dealers || dealers.length === 0) {
      console.warn("⚠️ No dealers found, returning empty map.");
      return {};
    }
  
    const map = dealers.reduce<Record<string, Dealer>>((acc, dealer) => {
      if (dealer.DealerUUID) {
        acc[dealer.DealerUUID.trim().toLowerCase()] = dealer;
      }
      if (dealer.PayeeID) {
        acc[dealer.PayeeID.trim().toLowerCase()] = dealer;
      }
      return acc;
    }, {});
  
    return map;
  }, [dealers]);

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
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    console.log(`Changing page size to ${newPageSize}`);
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page when search changes
  };

  // Check for errors
  if (agreementsError) {
    return <div className="py-10 text-center text-destructive">Error loading agreements: {String(agreementsError)}</div>;
  }

  // Loading indicator
  const isLoading = isFetchingAgreements || isFetchingCount;

  return (
    <div className={className}>
      {/* Search input */}
      <div className="flex items-center mb-4">
        <Input
          className="max-w-sm"
          placeholder="Search by Agreement ID..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {/* Status indicator */}
      <div className="text-sm text-muted-foreground mb-2">
        {isLoading ? "Loading..." : 
          `Displaying ${pagination.startItem} to ${pagination.endItem} of ${pagination.totalItems} agreements${dealerName ? ` for ${dealerName}` : ''}`
        }
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agreement ID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Dealership</TableHead>
              <TableHead>Dealer ID</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Expire Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Dealer Cost</TableHead>
              <TableHead>Reserve Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 10 }).map((_, cellIndex) => (
                    <TableCell key={`cell-${i}-${cellIndex}`}>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : agreements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No agreements found.
                </TableCell>
              </TableRow>
            ) : (
              // Render actual data
              agreements.map((agreement) => (
                <TableRow key={agreement.id || agreement.AgreementID}>
                  <TableCell>{agreement.AgreementID || ''}</TableCell>
                  <TableCell>
                    {(() => {
                      const firstName = formatName(agreement.HolderFirstName);
                      const lastName = formatName(agreement.HolderLastName);
                      return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
                    })()}
                  </TableCell>
                  <TableCell>{agreement.dealers?.Payee || "Unknown Dealership"}</TableCell>
                  <TableCell>
                    {(() => {
                      const dealerUUID = agreement.DealerUUID?.trim().toLowerCase();
                      const dealerID = agreement.DealerID?.trim().toLowerCase();
                  
                      let dealer = dealerUUID ? dealerMap[dealerUUID] : null;
                      if (!dealer && dealerID) {
                        dealer = dealerMap[dealerID];
                      }
                  
                      return dealer ? dealer.PayeeID : 'No Dealer Assigned';
                    })()}
                  </TableCell>
                  <TableCell>
                    {agreement.EffectiveDate ? format(new Date(agreement.EffectiveDate), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {agreement.ExpireDate ? format(new Date(agreement.ExpireDate), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = agreement.AgreementStatus || agreement.status || 'UNKNOWN';
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
                    })()}
                  </TableCell>
                  <TableCell>
                    ${(agreement.Total || agreement.value || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    ${(agreement.DealerCost || agreement.dealerCost || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    ${(agreement.ReserveAmount || agreement.reserveAmount || 0).toLocaleString()}
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

export default AgreementsTable;
