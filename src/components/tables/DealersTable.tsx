import React, { useState, useEffect } from 'react';
import DataTable, { Column } from './DataTable';
import { Dealer } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type DealersTableProps = {
  dealers: Dealer[];  // Mock data passed in as props
  className?: string;
  searchQuery?: string;
  dealerFilter?: string;
};

const DealersTable: React.FC<DealersTableProps> = ({ 
  dealers: mockDealers, 
  className = '', 
  searchQuery = '',
  dealerFilter = ''
}) => {
  const [filteredDealers, setFilteredDealers] = useState<Dealer[]>(mockDealers);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Load dealers on component mount
  useEffect(() => {
    const loadDealers = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Try to fetch dealers from Supabase
        const { data: supabaseDealers, error } = await supabase
          .from('dealers')
          .select('*');

        if (error) {
          console.warn('⚠️ Error fetching dealers from Supabase:', error.message);
          console.log('📊 Falling back to mock data for dealers...');
          // Show a toast notification about the error
          toast.error('Failed to load dealers from database', {
            description: 'Using fallback data instead'
          });
          
          // Fall back to mock data
          filterByDealerName(dealerFilter, mockDealers);
        } else if (supabaseDealers && supabaseDealers.length > 0) {
          console.log(`✅ Successfully loaded ${supabaseDealers.length} dealers from Supabase`);
          toast.success(`Loaded ${supabaseDealers.length} dealers from database`);
          // Use Supabase data
          filterByDealerName(dealerFilter, supabaseDealers);
        } else {
          console.log('📊 No dealers found in Supabase, using mock data');
          // Fall back to mock data
          filterByDealerName(dealerFilter, mockDealers);
        }
      } catch (error) {
        console.error('❌ Unexpected error loading dealers:', error);
        setHasError(true);
        // Fall back to mock data
        filterByDealerName(dealerFilter, mockDealers);
      } finally {
        setIsLoading(false);
      }
    };

    loadDealers();
  }, [mockDealers, dealerFilter]);

  // Effect to filter dealers when dealerFilter changes
  useEffect(() => {
    filterByDealerName(dealerFilter, mockDealers);
  }, [dealerFilter, mockDealers]);
  
  // Function to filter dealers by name only
  const filterByDealerName = (dealerName: string, data: Dealer[]) => {
    if (!dealerName || !dealerName.trim()) {
      setFilteredDealers(data);
      return;
    }
    
    const normalizedTerm = dealerName.toLowerCase().trim();
    const filtered = data.filter(dealer => 
      (dealer.name || dealer.Payee || '').toLowerCase().includes(normalizedTerm)
    );
    
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
        // Combine city, region, and country if available
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

  // If data is loading, show loading state
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

  // If there's an error and no data, show error state
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

  // If there's no data at all (not even mock data), show empty state
  if (filteredDealers.length === 0) {
    return (
      <div className="py-8 flex justify-center items-center">
        <div className="text-center">
          <p className="text-muted-foreground">No dealers found.</p>
        </div>
      </div>
    );
  }

  // Otherwise show the table with the data
  return (
    <DataTable
      data={filteredDealers}
      columns={columns}
      rowKey={(row) => row.id || row.DealerUUID || row.PayeeID || String(Math.random())}
      className={className}
      searchConfig={{
        enabled: false // Disable the search in the table
      }}
    />
  );
};

export default DealersTable;
