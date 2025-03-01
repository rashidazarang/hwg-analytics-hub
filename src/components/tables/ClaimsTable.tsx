
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
      key: 'agreementId',
      title: 'Agreement ID',
      sortable: true,
    },
    {
      key: 'dealerName',
      title: 'Dealer',
      sortable: true,
    },
    {
      key: 'dateReported',
      title: 'Reported Date',
      sortable: true,
      render: (row) => format(row.dateReported, 'MMM d, yyyy'),
    },
    {
      key: 'dateIncurred',
      title: 'Incurred Date',
      sortable: true,
      render: (row) => format(row.dateIncurred, 'MMM d, yyyy'),
    },
    {
      key: 'deductible',
      title: 'Deductible',
      sortable: true,
      render: (row) => `$${row.deductible.toLocaleString()}`,
    },
    {
      key: 'amount',
      title: 'Payout Amount',
      sortable: true,
      render: (row) => `$${(row.amount - row.deductible).toLocaleString()}`,
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
      filters={[
        {
          key: 'dateReported',
          title: 'Reported Date',
          type: 'date',
        },
        {
          key: 'dealerName',
          title: 'Dealer',
          type: 'select',
          options: [...new Set(claims.map(claim => claim.dealerName))].map(name => ({
            label: name,
            value: name,
          })),
        },
        {
          key: 'status',
          title: 'Status',
          type: 'select',
          options: [
            { label: 'Open', value: 'OPEN' },
            { label: 'Closed', value: 'CLOSED' },
            { label: 'Pending', value: 'PENDING' },
          ],
        },
        {
          key: 'amount',
          title: 'Claim Amount',
          type: 'range',
          min: 0,
          max: Math.max(...claims.map(claim => claim.amount)),
        },
      ]}
    />
  );
};

export default ClaimsTable;
