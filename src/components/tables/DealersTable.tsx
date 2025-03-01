
import React from 'react';
import DataTable, { Column } from './DataTable';
import { Dealer } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';

type DealersTableProps = {
  dealers: Dealer[];
  className?: string;
  isLoading?: boolean;
};

const DealersTable: React.FC<DealersTableProps> = ({ 
  dealers, 
  className = '',
  isLoading = false
}) => {
  const columns: Column<Dealer>[] = [
    {
      key: 'id',
      title: 'Dealer ID',
      sortable: true,
      render: (row) => row.id || row.DealerUUID || '',
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (row) => row.name || row.Payee || '',
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
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
      render: (row) => (
        <div className="w-full flex items-center gap-2">
          <Progress value={row.performanceScore || 0} className="h-2" />
          <span className="text-sm">{row.performanceScore || 0}%</span>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={dealers}
      columns={columns}
      searchKey="name"
      rowKey={(row) => row.id || row.DealerUUID || ''}
      className={className}
      isLoading={isLoading}
    />
  );
};

export default DealersTable;
