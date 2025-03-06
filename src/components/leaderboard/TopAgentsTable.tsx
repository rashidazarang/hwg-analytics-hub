
import React from 'react';
import { User, TrendingUp, AlertTriangle } from 'lucide-react';
import { TopAgent } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/tables/DataTable';

interface TopAgentsTableProps {
  data: TopAgent[];
  isLoading: boolean;
}

const TopAgentsTable: React.FC<TopAgentsTableProps> = ({ data, isLoading }) => {
  const columns: Column<TopAgent>[] = [
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
      key: 'agent_name',
      title: 'Agent',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-2">
            <User className="h-4 w-4" />
          </div>
          <span>{row.agent_name}</span>
        </div>
      ),
      searchable: true,
    },
    {
      key: 'contracts_closed',
      title: 'Contracts',
      render: (row) => (
        <div className="font-medium">{row.contracts_closed.toLocaleString()}</div>
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
      <h2 className="text-lg font-semibold mb-4">Top Performing Agents</h2>
      <DataTable
        data={data || []}
        columns={columns}
        rowKey={(row) => row.agent_name}
        loading={isLoading}
        searchConfig={{
          enabled: true,
          placeholder: "Search agents...",
          searchKeys: ['agent_name'],
        }}
      />
    </div>
  );
};

export default TopAgentsTable;
