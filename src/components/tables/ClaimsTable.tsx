
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Claim } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

type ClaimsTableProps = {
  claims: Claim[];
  dealerFilter?: string;
  dealerName?: string;
  searchQuery?: string;
};

const ClaimsTable: React.FC<ClaimsTableProps> = ({
  claims: initialClaims,
  dealerFilter = '',
  dealerName = '',
  searchQuery = '',
}) => {
  // Define state variables first
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalClaims, setTotalClaims] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load claims with pagination, filtering, and sorting
  const { data, isLoading: queryLoading, error } = useQuery({
    queryKey: ['claims', dealerFilter, searchQuery, pageIndex, pageSize],
    queryFn: async () => {
      console.log('Fetching claims:', { pageIndex, pageSize });
      setIsLoading(true);
      
      try {
        // Start building the query
        let query = supabase
          .from('claims')
          .select('*', { count: 'exact' });
        
        // Apply dealer filter if provided
        if (dealerFilter) {
          query = query.eq('DealerUUID', dealerFilter);
        }
        
        // Apply search filter if provided
        if (searchQuery) {
          query = query.or(`ClaimID.ilike.%${searchQuery}%,VIN.ilike.%${searchQuery}%`);
        }
        
        // Apply pagination
        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;
        
        // Execute the query
        const { data, count, error } = await query
          .order('ReportedDate', { ascending: false })
          .range(from, to);
        
        if (error) {
          throw error;
        }
        
        return {
          claims: data as Claim[] || [],
          totalCount: count || 0
        };
      } catch (error) {
        console.error('Error fetching claims:', error);
        // Fallback to mock data
        return {
          claims: initialClaims.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize) as Claim[],
          totalCount: initialClaims.length
        };
      } finally {
        setIsLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data) {
      setClaims(data.claims);
      setTotalClaims(data.totalCount);
    }
  }, [data]);

  // Reset pagination when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [dealerFilter, searchQuery]);

  const totalPages = Math.ceil(totalClaims / pageSize);

  const handlePreviousPage = () => {
    setPageIndex(old => Math.max(0, old - 1));
  };

  const handleNextPage = () => {
    setPageIndex(old => Math.min(totalPages - 1, old + 1));
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DENIED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead>Dealership</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={`loading-${i}`}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No claims found
                  {dealerFilter && dealerName && (
                    <span> for {dealerName}</span>
                  )}
                  {searchQuery && (
                    <span> matching "{searchQuery}"</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              claims.map(claim => (
                <TableRow key={claim.id}>
                  <TableCell className="font-medium">{claim.ClaimID}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(claim.ClaimStatus)}>
                      {claim.ClaimStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(new Date(claim.ReportedDate))}</TableCell>
                  <TableCell>{formatCurrency(claim.ClaimAmount)}</TableCell>
                  <TableCell>{claim.VIN}</TableCell>
                  <TableCell>{claim.DealerName}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {claims.length > 0 ? pageIndex * pageSize + 1 : 0} to {Math.min((pageIndex + 1) * pageSize, totalClaims)} of {totalClaims} claims
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={pageIndex >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClaimsTable;
