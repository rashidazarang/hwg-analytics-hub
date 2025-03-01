
import React from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';

type ClaimsTableProps = {
  claims: Claim[];
  className?: string;
};

const ClaimsTable: React.FC<ClaimsTableProps> = ({ claims, className = '' }) => {
  const columns: Column<Claim>[] = [
    {
      key: 'id',
      title: 'Claim ID',
      sortable: true,
    },
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
    },
    {
      key: 'dealerName',
      title: 'Dealer',
      sortable: true,
    },
    {
      key: 'dateReported',
      title: 'Date Reported',
      sortable: true,
      render: (row) => format(row.dateReported, 'MMM d, yyyy'),
    },
    {
      key: 'amount',
      title: 'Amount',
      sortable: true,
      render: (row) => `$${row.amount.toLocaleString()}`,
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => {
        const variants = {
          OPEN: 'bg-warning/15 text-warning border-warning/20',
          CLOSED: 'bg-success/15 text-success border-success/20',
          PENDING: 'bg-info/15 text-info border-info/20',
        };
        
        return (
          <Badge variant="outline" className={`${variants[row.status]} border`}>
            {row.status}
          </Badge>
        );
      },
    },
  ];

  return (
    <DataTable
      data={claims}
      columns={columns}
      searchKey="id"
      rowKey={(row) => row.id}
      className={className}
    />
  );
};

export default ClaimsTable;
