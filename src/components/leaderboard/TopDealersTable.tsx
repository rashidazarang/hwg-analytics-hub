import React from 'react';
import { Building2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/tables/DataTable';
import { TopDealerWithKPIs } from '@/hooks/leaderboard/useLeaderboardData';

interface TopDealersTableProps {
  data: TopDealerWithKPIs[];
  isLoading: boolean;
  hideSearch?: boolean; // Prop to control search visibility
}

const TopDealersTable: React.FC<TopDealersTableProps> = ({ 
  data, 
  isLoading,
  hideSearch = false // Default to showing search
}) => {
  const columns: Column<TopDealerWithKPIs>[] = [
    {
      key: 'rank',
      title: 'Rank',
      render: (row, index) => (
        <div className="flex items-center justify-center">
          <span className="font-bold text-lg bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary">
            {index + 1}
          </span>
        </div>
      ),
      sortable: false,
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
        <div className="font-medium">{Number(row.total_contracts).toLocaleString()}</div>
      ),
      sortable: false,
    },
    {
      key: 'expected_revenue',
      title: 'Expected Revenue',
      render: (row) => (
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1 text-amber-500" />
          <span className="font-medium">{formatCurrency(Number(row.expected_revenue) || 0)}</span>
        </div>
      ),
      sortable: false,
    },
    {
      key: 'funded_revenue',
      title: 'Funded',
      render: (row) => (
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
          <span className="font-medium">{formatCurrency(Number(row.funded_revenue) || 0)}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'cancellation_rate',
      title: 'Cancellation Rate',
      render: (row) => (
        <div className="flex items-center">
          <AlertTriangle className={`h-4 w-4 mr-1 ${Number(row.cancellation_rate) > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          <span className="font-medium">{Number(row.cancellation_rate).toFixed(1)}%</span>
        </div>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Top 50 Dealers by Revenue</h2>
      <DataTable
        data={data || []}
        columns={columns}
        rowKey={(row) => row.dealer_uuid}
        loading={isLoading}
        searchConfig={{
          enabled: !hideSearch, // Only enable search if hideSearch is false
          placeholder: "Search dealers...",
          searchKeys: ['dealer_name'],
        }}
      />
    </div>
  );
};

export default TopDealersTable;