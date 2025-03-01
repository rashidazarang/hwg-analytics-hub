
import React from 'react';
import DataTable, { Column } from './DataTable';
import { Dealer } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';

type DealersTableProps = {
  dealers: Dealer[];
  className?: string;
};

const DealersTable: React.FC<DealersTableProps> = ({ dealers, className = '' }) => {
  const columns: Column<Dealer>[] = [
    {
      key: 'id',
      title: 'Dealer ID',
      sortable: true,
      render: (row) => row.id || row.dealerUUID || '',
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (row) => row.name || row.payee || '',
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
      render: (row) => {
        // Combine city, region, and country if available
        const city = row.city || '';
        const region = row.region || '';
        const country = row.country || '';
        
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
      render: (row) => `$${(row.totalRevenue || 0).toLocaleString()}`,
    },
    {
      key: 'totalPayouts',
      title: 'Total Payouts',
      sortable: true,
      render: (row) => `$${(row.totalPayouts || 0).toLocaleString()}`,
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

  return (
    <DataTable
      data={dealers}
      columns={columns}
      searchKey="name"
      rowKey={(row) => row.id || row.dealerUUID || ''}
      className={className}
    />
  );
};

export default DealersTable;
