
import React from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Agreement } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';

type AgreementsTableProps = {
  agreements: Agreement[];
  className?: string;
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({ agreements, className = '' }) => {
  const columns: Column<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: true,
      render: (row) => row.id,
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      sortable: true,
      render: (row) => `${row.customerName || (row.holderFirstName && row.holderLastName ? `${row.holderFirstName} ${row.holderLastName}` : 'N/A')}`,
    },
    {
      key: 'dealerName',
      title: 'Dealer Name',
      sortable: true,
      render: (row) => row.dealerName,
    },
    {
      key: 'startDate',
      title: 'Effective Date',
      sortable: true,
      render: (row) => format(row.startDate || row.effectiveDate || new Date(), 'MMM d, yyyy'),
    },
    {
      key: 'endDate',
      title: 'Expire Date',
      sortable: true,
      render: (row) => format(row.endDate || row.expireDate || new Date(), 'MMM d, yyyy'),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => {
        const status = row.status || row.agreementStatus || 'UNKNOWN';
        const variants = {
          ACTIVE: 'bg-success/15 text-success border-success/20',
          EXPIRED: 'bg-muted/30 text-muted-foreground border-muted/40',
          CANCELLED: 'bg-destructive/15 text-destructive border-destructive/20',
          PENDING: 'bg-warning/15 text-warning border-warning/20',
          TERMINATED: 'bg-destructive/15 text-destructive border-destructive/20',
          UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40',
        };
        
        return (
          <Badge variant="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border`}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: 'value',
      title: 'Total Value',
      sortable: true,
      render: (row) => `$${(row.value || row.total || 0).toLocaleString()}`,
    },
    {
      key: 'dealerCost',
      title: 'Dealer Cost',
      sortable: true,
      render: (row) => `$${(row.dealerCost || 0).toLocaleString()}`,
    },
    {
      key: 'reserveAmount',
      title: 'Reserve Amount',
      sortable: true,
      render: (row) => `$${(row.reserveAmount || 0).toLocaleString()}`,
    },
  ];

  return (
    <DataTable
      data={agreements}
      columns={columns}
      searchKey="id"
      rowKey={(row) => row.id}
      className={className}
    />
  );
};

export default AgreementsTable;
