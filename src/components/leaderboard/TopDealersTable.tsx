
import React from 'react';
import { Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { TopDealer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/tables/DataTable';

interface TopDealersTableProps {
  data: TopDealer[];
  isLoading: boolean;
}

const TopDealersTable: React.FC<TopDealersTableProps> = ({ data, isLoading }) => {
  const columns: Column<TopDealer>[] = [
    {
      key: 'rank',
      title: 'Rank',
      render: (_, index) => (
        <div className="flex items-center">
          <span className="font-semibold text-lg">{index + 1}</span>
        </div>
      ),
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
      sortable: true,
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
      sortable: true,
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

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Top Performing Dealers</h2>
      <DataTable
        data={data || []}
        columns={columns}
        rowKey={(row) => row.dealer_name}
        loading={isLoading}
        searchConfig={{
          enabled: true,
          placeholder: "Search dealers...",
          searchKeys: ['dealer_name'],
        }}
      />
    </div>
  );
};

export default TopDealersTable;
