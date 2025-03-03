import React, { useState, useMemo, useEffect } from 'react';
import DataTable, { Column } from './DataTable';
import { Dealer } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';

type DealersTableProps = {
  dealers: Dealer[];
  className?: string;
  searchQuery?: string;
  dealerFilter?: string;
};

const DealersTable: React.FC<DealersTableProps> = ({ 
  dealers, 
  className = '', 
  searchQuery = '',
  dealerFilter = ''
}) => {
  const [filteredDealers, setFilteredDealers] = useState<Dealer[]>(dealers);
  const [page, setPage] = useState(1);
  const pageSize = 50; // Fixed page size of 50
  const [totalCount, setTotalCount] = useState(dealers.length);
  
  // Filter dealers based on dealerFilter
  useEffect(() => {
    filterByDealerName(dealerFilter);
  }, [dealerFilter, dealers]);
  
  // Function to filter dealers by name only
  const filterByDealerName = (dealerName: string) => {
    if (!dealerName || !dealerName.trim()) {
      setFilteredDealers(dealers);
      setTotalCount(dealers.length);
      return;
    }
    
    const normalizedTerm = dealerName.toLowerCase().trim();
    const filtered = dealers.filter(dealer => 
      (dealer.name || dealer.Payee || '').toLowerCase().includes(normalizedTerm)
    );
    
    setFilteredDealers(filtered);
    setTotalCount(filtered.length);
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const columns: Column<Dealer>[] = [
    {
      key: 'id',
      title: 'Dealer ID',
      sortable: true,
      searchable: true,
      render: (row) => row.id || row.DealerUUID || '',
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
    },
    {
      key: 'totalClaims',
      title: 'Total Claims',
      sortable: true,
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
      render: (row) => (
        <div className="w-full flex items-center gap-2">
          <Progress value={row.performanceScore} className="h-2" />
          <span className="text-sm">{row.performanceScore}%</span>
        </div>
      ),
    },
  ];
  
  // Calculate display data based on pagination
  const displayData = filteredDealers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        Displaying {displayData.length} of {totalCount} dealers
      </div>
      
      <DataTable
        data={displayData}
        columns={columns}
        rowKey={(row) => row.id || row.DealerUUID || ''}
        className={className}
        searchConfig={{
          enabled: false  // Disable the search in the table
        }}
        paginationProps={{
          currentPage: page,
          totalItems: totalCount,
          pageSize: pageSize,
          onPageChange: handlePageChange,
        }}
      />
    </>
  );
};

export default DealersTable;
