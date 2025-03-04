import React, { useState, useEffect } from 'react';
import DataTable, { Column } from './DataTable';
import { Dealer } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type DealersTableProps = {
  dealers: Dealer[];  // Mock data passed in as props
  className?: string;
  searchQuery?: string;
  dealerFilter?: string;
  dealerName?: string;
  statusFilters?: string[];
};

const DealersTable: React.FC<DealersTableProps> = ({ 
  dealers: mockDealers, 
  className = '', 
  searchQuery = '',
  dealerFilter = '',
  dealerName = '',
  statusFilters = []
}) => {
  const [filteredDealers, setFilteredDealers] = useState<Dealer[]>(mockDealers);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const loadDealers = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        let query = supabase.from('dealers').select('*');

        // Apply status filters if provided
        if (statusFilters && statusFilters.length > 0) {
          console.log('🔍 DealersTable: Applying status filters:', statusFilters);
          
          // Use more straightforward filtering approach
          if (statusFilters.length === 1) {
            // For a single status filter
            query = query.eq('status', statusFilters[0]);
          } else if (statusFilters.length > 1) {
            // Fixed: Use a simple string array to avoid TypeScript recursion issues
            const statusValues: string[] = statusFilters.map(s => s);
            query = query.in('status', statusValues);
          }
        }
        
        // Apply dealer filter if provided
        if (dealerFilter && dealerFilter.trim()) {
          console.log(`🔍 DealersTable: Filtering by dealership ID: "${dealerFilter}"`);
          query = query.eq('DealerUUID', dealerFilter);
        }
        
        const { data: supabaseDealers, error } = await query;

        if (error) {
          console.warn('⚠️ Error fetching dealers from Supabase:', error.message);
          console.log('📊 Falling back to mock data for dealers...');
          toast.error('Failed to load dealers from database', {
            description: 'Using fallback data instead'
          });
          
          applyClientSideFilters(dealerFilter, searchQuery, statusFilters, mockDealers);
        } else if (supabaseDealers && supabaseDealers.length > 0) {
          console.log(`✅ Successfully loaded ${supabaseDealers.length} dealers from Supabase`);
          toast.success(`Loaded ${supabaseDealers.length} dealers from database`);
          applyClientSideFilters(dealerFilter, searchQuery, statusFilters, supabaseDealers);
        } else {
          console.log('📊 No dealers found in Supabase, using mock data');
          applyClientSideFilters(dealerFilter, searchQuery, statusFilters, mockDealers);
        }
      } catch (error) {
        console.error('❌ Unexpected error loading dealers:', error);
        setHasError(true);
        applyClientSideFilters(dealerFilter, searchQuery, statusFilters, mockDealers);
      } finally {
        setIsLoading(false);
      }
    };

    loadDealers();
  }, [mockDealers, dealerFilter, searchQuery, statusFilters]);
  
  const applyClientSideFilters = (
    dealerName: string, 
    searchTerm: string, 
    statusFilters: string[],
    data: Dealer[]
  ) => {
    let filtered = [...data];
    
    // Apply dealer name filter
    if (dealerName && dealerName.trim()) {
      const normalizedDealerName = dealerName.toLowerCase().trim();
      filtered = filtered.filter(dealer => 
        (dealer.name || dealer.Payee || '').toLowerCase().includes(normalizedDealerName)
      );
    }
    
    // Apply search term filter
    if (searchTerm && searchTerm.trim()) {
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(dealer => {
        const name = (dealer.name || dealer.Payee || '').toLowerCase();
        const id = (dealer.id || dealer.DealerUUID || dealer.PayeeID || '').toLowerCase();
        const location = [
          dealer.city || dealer.City || '',
          dealer.region || dealer.Region || '',
          dealer.country || dealer.Country || ''
        ].filter(Boolean).join(' ').toLowerCase();
        
        return name.includes(normalizedSearchTerm) || 
               id.includes(normalizedSearchTerm) || 
               location.includes(normalizedSearchTerm);
      });
    }
    
    // Apply status filters (for client-side filtering when needed)
    if (statusFilters && statusFilters.length > 0) {
      filtered = filtered.filter(dealer => {
        // Fixed: Use optional chaining and provide default
        const dealerStatus = dealer?.status || 'ACTIVE';
        // Check if any of the selected statuses match this dealer
        return statusFilters.some(status => status === dealerStatus);
      });
    }
    
    setFilteredDealers(filtered);
  };
  
  const columns: Column<Dealer>[] = [
    {
      key: 'id',
      title: 'Dealer ID',
      sortable: true,
      searchable: true,
      render: (row) => row.id || row.DealerUUID || row.PayeeID || '',
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      searchable: true,
      render: (row) => row.name || row.Payee || '',
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
      searchable: true,
      render: (row) => {
        const city = row.City || row.city || '';
        const region = row.Region || row.region || '';
        const country = row.Country || row.country || '';
        
        const parts = [city, region, country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
      },
    },
    {
      key: 'activeAgreements',
      title: 'Active Agreements',
      sortable: true,
      render: (row) => row.activeAgreements || 0,
    },
    {
      key: 'totalClaims',
      title: 'Total Claims',
      sortable: true,
      render: (row) => row.totalClaims || 0,
    },
    {
      key: 'totalRevenue',
      title: 'Total Revenue',
      sortable: true,
      render: (row) => {
        const revenue = row.totalRevenue || row.Total || 0;
        return `$${(revenue).toLocaleString()}`;
      },
    },
    {
      key: 'totalPayouts',
      title: 'Total Payouts',
      sortable: true,
      render: (row) => {
        const payouts = row.totalPayouts || row.TotalPayouts || 0;
        return `$${(payouts).toLocaleString()}`;
      },
    },
    {
      key: 'performanceScore',
      title: 'Performance Score',
      sortable: true,
      render: (row) => {
        const score = row.performanceScore || Math.floor(Math.random() * 100);
        return (
          <div className="w-full flex items-center gap-2">
            <Progress value={score} className="h-2" />
            <span className="text-sm">{score}%</span>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center items-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Progress value={25} className="w-60 h-2" />
          </div>
          <p className="text-muted-foreground">Loading dealers data...</p>
        </div>
      </div>
    );
  }

  if (hasError && filteredDealers.length === 0) {
    return (
      <div className="py-8 flex justify-center items-center">
        <div className="text-center text-destructive">
          <AlertCircle className="mx-auto mb-4 h-12 w-12" />
          <h3 className="text-lg font-medium">Failed to load dealers</h3>
          <p className="mt-2">There was an error loading the dealers data.</p>
        </div>
      </div>
    );
  }

  if (filteredDealers.length === 0) {
    return (
      <div className="py-8 flex justify-center items-center">
        <div className="text-center">
          <p className="text-muted-foreground">No dealers found.</p>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      data={filteredDealers}
      columns={columns}
      rowKey={(row) => row.id || row.DealerUUID || row.PayeeID || String(Math.random())}
      className={className}
      searchConfig={{
        enabled: false
      }}
    />
  );
};

export default DealersTable;
