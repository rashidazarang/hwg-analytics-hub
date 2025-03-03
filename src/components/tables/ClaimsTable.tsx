
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VirtualizedTable, { VirtualColumn } from './VirtualizedTable';
import { Claim } from '@/lib/mockData';

// Define a more comprehensive Claim type that includes database fields
type ClaimType = Claim & {
  id?: string;
  ClaimID?: string;
  AgreementID?: string;
  ReportedDate?: string | null;
  IncurredDate?: string | null;
  Deductible?: number | null;
  amount?: number;
  status?: string;
  dealerName?: string;
};

const SUPABASE_PAGE_SIZE = 50;

async function fetchClaimsPage(
  pageParam: number, 
  pageSize: number,
  dealerFilter?: string,
  searchTerm?: string
): Promise<{ data: ClaimType[]; nextPage: number | null }> {
  console.log("🔍 Fetching claims page:", pageParam, "with filter:", dealerFilter, "search:", searchTerm);

  try {
    // First, if we have a dealer filter, we need to get the agreements for that dealer
    let agreementIds: string[] = [];
    
    if (dealerFilter && dealerFilter.trim()) {
      const { data: agreements, error: agreementsError } = await supabase
        .from("agreements")
        .select("AgreementID")
        .eq("DealerUUID", dealerFilter);
      
      if (agreementsError) {
        console.error("❌ Error fetching dealer agreements:", agreementsError);
        toast.error("Failed to load dealer agreements");
        return { data: [], nextPage: null };
      }
      
      agreementIds = agreements?.map(a => a.AgreementID) || [];
      
      if (agreementIds.length === 0) {
        console.log("⚠️ No agreements found for the selected dealer");
        return { data: [], nextPage: null };
      }
    }
    
    const offset = pageParam * pageSize;
    
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
        Closed
      `);
    
    // Add dealer filter (via agreements) if we have agreement IDs
    if (dealerFilter && agreementIds.length > 0) {
      query = query.in("AgreementID", agreementIds);
    }
    
    // Add search term filter if specified
    if (searchTerm && searchTerm.trim()) {
      query = query.or(`ClaimID.ilike.%${searchTerm}%,AgreementID.ilike.%${searchTerm}%`);
    }
    
    // Execute the query with pagination
    const { data, error } = await query
      .order("ReportedDate", { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error("❌ Supabase Fetch Error:", error);
      toast.error("Failed to load claims");
      return { data: [], nextPage: null };
    }
    
    // For demonstration, add mock amounts and statuses
    const enrichedData = (data || []).map(claim => ({
      ...claim,
      amount: Math.floor(Math.random() * 5000) + 500, // Mock amount
      status: ['OPEN', 'CLOSED', 'PENDING'][Math.floor(Math.random() * 3)] // Mock status
    }));
    
    // Determine if there are more pages (if we got the full page size)
    const hasMore = data && data.length === pageSize;
    const nextPage = hasMore ? pageParam + 1 : null;
    
    console.log(`✅ Fetched ${data?.length || 0} claims from page ${pageParam}`);
    
    return { 
      data: enrichedData, 
      nextPage 
    };
  } catch (error) {
    console.error("Unexpected error fetching claims:", error);
    toast.error("An unexpected error occurred");
    return { data: [], nextPage: null };
  }
}

type ClaimsTableProps = {
  claims: Claim[];
  className?: string;
  searchQuery?: string;
  dealerFilter?: string;
  dealerName?: string;
};

const ClaimsTable: React.FC<ClaimsTableProps> = ({ 
  claims: initialClaims, 
  className = '', 
  searchQuery = '',
  dealerFilter = '',
  dealerName = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  
  // Debug logging for dealerFilter changes
  useEffect(() => {
    console.log('🔍 ClaimsTable - Current dealer UUID filter:', dealerFilter);
    console.log('🔍 ClaimsTable - Current dealer name:', dealerName);
  }, [dealerFilter, dealerName]);
  
  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);
  
  // Create filter object for the query
  const filters = useMemo(() => ({
    dealerFilter
  }), [dealerFilter]);
  
  // Define function to fetch data for the virtualized table
  const fetchTableData = useCallback(async ({ 
    pageParam = 0,
    pageSize,
    searchTerm: search
  }: {
    pageParam?: number;
    pageSize: number;
    searchTerm?: string;
    filters?: any;
  }) => {
    // For real implementation, we would use Supabase
    // For now, we'll use the mock data and simulate pagination
    // Later switch to Supabase query
    
    // If we have a dealerFilter and want to test with real data:
    return fetchClaimsPage(
      pageParam, 
      pageSize, 
      dealerFilter,
      search
    );
    
  }, [dealerFilter]);
  
  // Define columns for the virtualized table
  const columns: VirtualColumn<ClaimType>[] = [
    {
      key: 'id',
      title: 'Claim ID',
      sortable: true,
      searchable: true,
      render: (row) => row.id || row.ClaimID || '',
      width: 160,
    },
    {
      key: 'agreementId',
      title: 'Agreement ID',
      sortable: true,
      searchable: true,
      render: (row) => row.agreementId || row.AgreementID || '',
      width: 160,
    },
    {
      key: 'dealerName',
      title: 'Dealer Name',
      sortable: true,
      searchable: true,
      render: (row) => row.dealerName || dealerName || 'N/A',
      width: 180,
    },
    {
      key: 'dateReported',
      title: 'Date Reported',
      sortable: true,
      render: (row) => {
        const date = row.ReportedDate || row.dateReported;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
      width: 140,
    },
    {
      key: 'dateIncurred',
      title: 'Date Incurred',
      sortable: true,
      render: (row) => {
        const date = row.IncurredDate || row.dateIncurred;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
      width: 140,
    },
    {
      key: 'deductible',
      title: 'Deductible',
      sortable: true,
      render: (row) => {
        const deductible = row.Deductible || row.deductible || 0;
        return `$${(deductible).toLocaleString()}`;
      },
      width: 120,
    },
    {
      key: 'amount',
      title: 'Claim Amount',
      sortable: true,
      render: (row) => `$${(row.amount || 0).toLocaleString()}`,
      width: 140,
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => {
        const status = row.status || 'UNKNOWN';
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
      },
      width: 120,
    },
  ];
  
  // Generate a query key that includes all relevant filters
  const queryKey = useMemo(() => {
    return ["claims-infinite", dealerFilter];
  }, [dealerFilter]);
  
  const handleSearch = (term: string) => {
    console.log("🔍 Search term updated:", term);
    setSearchTerm(term);
  };
  
  const currentStatus = dealerName 
    ? `Claims${dealerName ? ` for ${dealerName}` : ''}`
    : 'All Claims';
  
  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        {currentStatus}
      </div>
      
      <VirtualizedTable
        columns={columns}
        fetchData={fetchTableData}
        rowKey={(row) => row.id || row.ClaimID || ''}
        className={className}
        searchConfig={{
          enabled: true,
          placeholder: "Search by Claim or Agreement ID...",
          onChange: handleSearch,
          searchKeys: ["ClaimID", "AgreementID"]
        }}
        pageSize={SUPABASE_PAGE_SIZE}
        filters={filters}
        queryKey={queryKey}
      />
    </>
  );
};

export default ClaimsTable;
