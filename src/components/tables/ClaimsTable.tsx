
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
      render: (row) => row.id || row.claimID || '',
    },
    {
      key: 'agreementId',
      title: 'Agreement ID',
      sortable: true,
      render: (row) => row.agreementId || row.agreementID || '',
    },
    {
      key: 'dealerName',
      title: 'Dealer Name',
      sortable: true,
    },
    {
      key: 'dateReported',
      title: 'Date Reported',
      sortable: true,
      render: (row) => format(row.dateReported || row.reportedDate || new Date(), 'MMM d, yyyy'),
    },
    {
      key: 'dateIncurred',
      title: 'Date Incurred',
      sortable: true,
      render: (row) => format(row.dateIncurred || row.incurredDate || new Date(), 'MMM d, yyyy'),
    },
    {
      key: 'deductible',
      title: 'Deductible',
      sortable: true,
      render: (row) => `$${(row.deductible || 0).toLocaleString()}`,
    },
    {
      key: 'amount',
      title: 'Claim Amount',
      sortable: true,
      render: (row) => `$${(row.amount || 0).toLocaleString()}`,
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => {
        const status = row.status || 'UNKNOWN';
        const variants = {
          OPEN: 'bg-warning/15 text-warning border-warning/20',
          CLOSED: 'bg-success/15 text-success border-success/20',
          PENDING: 'bg-info/15 text-info border-info/20',
          UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
        };
        
        return (
          <Badge variant="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border`}>
            {status}
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
      rowKey={(row) => row.id || row.claimID || ''}
      className={className}
    />
  );
};

export default ClaimsTable;
