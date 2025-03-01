
import React from 'react';
import { format } from 'date-fns';
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
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
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
      rowKey={(row) => row.id}
      className={className}
    />
  );
};

export default DealersTable;
