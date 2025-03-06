
import React, { useState } from 'react';
import { Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { TopDealer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/tables/DataTable';

interface TopDealersTableProps {
  data: TopDealer[];
  isLoading: boolean;
}

const TopDealersTable: React.FC<TopDealersTableProps> = ({ data, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  
  const columns: Column<TopDealer>[] = [
    {
      key: 'rank',
      title: 'Rank',
      render: (row, index) => {
        // Calculate the actual rank based on original data (not paginated)
        const dataIndex = data.findIndex(item => item.dealer_name === row.dealer_name);
        return (
          <div className="flex items-center">
            <span className="font-semibold text-lg">{dataIndex + 1}</span>
          </div>
        );
      },
    },
    {
      key: 'dealer_name',
      title: 'Dealer',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-2">
            <Building2 className="h-4 w-4" />
          </div>
          <span>{row.dealer_name}</span>
        </div>
      ),
      searchable: true,
    },
    {
      key: 'total_contracts',
      title: 'Contracts',
      render: (row) => (
        <div className="font-medium">{row.total_contracts.toLocaleString()}</div>
      ),
      // Removed sortable property
    },
    {
      key: 'total_revenue',
      title: 'Revenue',
      render: (row) => (
        <div className="flex items-center">
          <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
          <span className="font-medium">{formatCurrency(row.total_revenue)}</span>
        </div>
      ),
      // Removed sortable property
    },
    {
      key: 'cancelled_contracts',
      title: 'Cancellations',
      render: (row) => (
        <div className="flex items-center">
          <AlertTriangle className={`h-4 w-4 mr-1 ${row.cancelled_contracts > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
          <span className="font-medium">{row.cancelled_contracts.toLocaleString()}</span>
        </div>
      ),
      sortable: true,
    },
  ];

  // Calculate pagination values
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    // Not used but required by the interface
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Performance Leaderboard - Dealers</h2>
      <DataTable
        data={paginatedData}
        columns={columns}
        rowKey={(row) => row.dealer_name}
        loading={isLoading}
        searchConfig={{
          enabled: true,
          placeholder: "Search dealers...",
          searchKeys: ['dealer_name'],
        }}
        paginationProps={{
          currentPage,
          pageSize,
          totalItems,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange
        }}
      />
    </div>
  );
};

export default TopDealersTable;
