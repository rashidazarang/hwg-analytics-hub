
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
      key: 'DealerUUID',
      title: 'Dealer ID',
      sortable: true,
    },
    {
      key: 'Payee',
      title: 'Dealer Name',
      sortable: true,
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
      render: (row) => `${row.City || ''}, ${row.Region || ''}${row.Country ? `, ${row.Country}` : ''}`,
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
      render: (row) => `$${row.totalRevenue?.toLocaleString() || '0'}`,
    },
    {
      key: 'totalPayouts',
      title: 'Total Payouts',
      sortable: true,
      render: (row) => `$${row.totalPayouts?.toLocaleString() || '0'}`,
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

  // Generate location options, ensuring no empty values
  const locationOptions = [...new Set(dealers.map(dealer => {
    const location = `${dealer.City || ''}, ${dealer.Region || ''}${dealer.Country ? `, ${dealer.Country}` : ''}`;
    // Return a default value if location is empty or just commas
    return location.replace(/^[,\s]+|[,\s]+$/g, '').length === 0 ? 'Unknown Location' : location.trim();
  }))].map(location => ({
    label: location,
    value: location,
  }));

  return (
    <DataTable
      data={dealers}
      columns={columns}
      searchKey="Payee"
      rowKey={(row) => row.DealerUUID}
      className={className}
      filters={[
        {
          key: 'location',
          title: 'Location',
          type: 'select',
          options: locationOptions,
        },
        {
          key: 'activeAgreements',
          title: 'Active Agreements',
          type: 'range',
          min: 0,
          max: Math.max(...dealers.map(dealer => dealer.activeAgreements)),
        },
        {
          key: 'totalClaims',
          title: 'Total Claims',
          type: 'range',
          min: 0,
          max: Math.max(...dealers.map(dealer => dealer.totalClaims)),
        },
        {
          key: 'totalRevenue',
          title: 'Total Revenue',
          type: 'range',
          min: 0,
          max: Math.max(...dealers.map(dealer => dealer.totalRevenue || 0)),
        },
      ]}
    />
  );
};

export default DealersTable;
