import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import { useDealershipData } from '@/hooks/useDealershipData';
import DataTable, { Column } from '@/components/tables/DataTable';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, FileSignature, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DealerData {
  DealerUUID: string;
  PayeeID: string;
  Payee: string;
  Address1?: string;
  City?: string;
  Region?: string;
  Country?: string;
  PostalCode?: string;
  agreementCount?: number;
  claimCount?: number;
  totalRevenue?: number;
}

const Dealers = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch dealers with additional statistics
  const { 
    data: dealersData = [], 
    isLoading,
    error 
  } = useQuery({
    queryKey: ['dealers-with-stats', dateRange],
    queryFn: async (): Promise<DealerData[]> => {
      console.log('🔍 Fetching dealers with statistics...');
      
      try {
        // Fetch all dealers
        const { data: dealers, error: dealersError } = await supabase
          .from('dealers')
          .select('DealerUUID, PayeeID, Payee, Address1, City, Region, Country, PostalCode')
          .order('Payee');

        if (dealersError) {
          console.error('❌ Error fetching dealers:', dealersError);
          throw dealersError;
        }

        if (!dealers || dealers.length === 0) {
          console.log('⚠️ No dealers found');
          return [];
        }

        console.log(`✅ Found ${dealers.length} dealers`);

        // For now, return dealers without statistics to avoid complex joins
        // Statistics can be added later via separate queries if needed
        return dealers.map(dealer => ({
          ...dealer,
          agreementCount: 0, // Placeholder
          claimCount: 0,     // Placeholder
          totalRevenue: 0    // Placeholder
        }));

      } catch (error) {
        console.error('❌ Exception fetching dealers:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed in Dealers:", range);
    setDateRange(range);
  };

  const handleDealerClick = (dealerUUID: string) => {
    console.log(`🏢 Navigating to dealer profile: ${dealerUUID}`);
    navigate(`/dealer/${dealerUUID}`);
  };

  const columns: Column<DealerData>[] = [
    {
      key: 'Payee',
      title: 'Dealer Name',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-3">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <Button
              variant="link"
              className="p-0 h-auto font-medium text-primary hover:underline"
              onClick={() => handleDealerClick(row.DealerUUID)}
            >
              {row.Payee || 'Unknown Dealer'}
            </Button>
          </div>
        </div>
      ),
      searchable: true,
      sortable: true,
    },
    {
      key: 'DealerUUID',
      title: 'Dealer ID',
      render: (row) => (
        <div className="font-mono text-sm">
          {row.DealerUUID ? row.DealerUUID.substring(0, 8) + '...' : 'N/A'}
        </div>
      ),
      searchable: true,
    },
    {
      key: 'location',
      title: 'Location',
      render: (row) => {
        const location = [row.City, row.Region, row.Country]
          .filter(Boolean)
          .join(', ');
        
        return (
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{location || 'Unknown Location'}</span>
          </div>
        );
      },
      searchable: true,
      sortable: true,
    },
    {
      key: 'agreementCount',
      title: 'Agreements',
      render: (row) => (
        <div className="flex items-center">
          <FileSignature className="h-4 w-4 mr-2 text-blue-500" />
          <span className="font-medium">{row.agreementCount?.toLocaleString() || '0'}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'claimCount',
      title: 'Claims',
      render: (row) => (
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
          <span className="font-medium">{row.claimCount?.toLocaleString() || '0'}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'totalRevenue',
      title: 'Total Revenue',
      render: (row) => (
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 mr-2 text-green-500" />
          <span className="font-medium">{formatCurrency(row.totalRevenue || 0)}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Active
        </Badge>
      ),
    },
  ];

  // Apply client-side search filtering
  const filteredDealers = dealersData.filter(dealer => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      dealer.Payee?.toLowerCase().includes(searchLower) ||
      dealer.DealerUUID?.toLowerCase().includes(searchLower) ||
      dealer.City?.toLowerCase().includes(searchLower) ||
      dealer.Region?.toLowerCase().includes(searchLower) ||
      dealer.Country?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      pageTitle="Dealers"
      kpiSection={null}
    >
      <div className="w-full overflow-x-hidden">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Dealers Directory</h2>
              <p className="text-muted-foreground">
                Manage and view all dealer relationships
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredDealers.length} of {dealersData.length} dealers
            </div>
          </div>

          {/* Dealers Table */}
          <div className="bg-card rounded-lg border shadow-sm">
            <DataTable
              data={filteredDealers}
              columns={columns}
              rowKey={(row) => row.DealerUUID || row.PayeeID || String(Math.random())}
              loading={isLoading}
              searchConfig={{
                enabled: true,
                placeholder: "Search dealers by name, ID, or location...",
                onChange: (term) => setSearchTerm(term),
                searchKeys: ['Payee', 'DealerUUID', 'City', 'Region', 'Country'],
              }}
              paginationProps={{
                currentPage: 1,
                totalItems: filteredDealers.length,
                pageSize: 50,
                onPageChange: () => {},
                onPageSizeChange: () => {},
              }}
              className="min-h-[400px]"
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
                <div>
                  <h3 className="font-medium text-destructive">Error Loading Dealers</h3>
                  <p className="text-sm text-destructive/80 mt-1">
                    {error instanceof Error ? error.message : 'Failed to load dealers data'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default Dealers; 