
import React from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Agreement } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';

type AgreementsTableProps = {
  agreements: Agreement[];
  className?: string;
  isLoading?: boolean;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({ 
  agreements, 
  className = '',
  isLoading = false,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange
}) => {
  const columns: Column<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: true,
      render: (row) => row.id || row.AgreementID || '',
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      sortable: true,
      render: (row) => {
        const firstName = row.HolderFirstName || '';
        const lastName = row.HolderLastName || '';
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'N/A';
      },
    },
    {
      key: 'dealerName',
      title: 'Dealer Name',
      sortable: true,
      render: (row) => row.dealerName || '',
    },
    {
      key: 'effectiveDate',
      title: 'Effective Date',
      sortable: true,
      render: (row) => {
        const date = row.EffectiveDate || row.startDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'expireDate',
      title: 'Expire Date',
      sortable: true,
      render: (row) => {
        const date = row.ExpireDate || row.endDate;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => {
        const status = row.AgreementStatus || row.status || 'UNKNOWN';
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
      render: (row) => {
        const value = row.Total || row.value || 0;
        return `$${(value).toLocaleString()}`;
      },
    },
    {
      key: 'dealerCost',
      title: 'Dealer Cost',
      sortable: true,
      render: (row) => {
        const cost = row.DealerCost || row.dealerCost || 0;
        return `$${(cost).toLocaleString()}`;
      },
    },
    {
      key: 'reserveAmount',
      title: 'Reserve Amount',
      sortable: true,
      render: (row) => {
        const reserve = row.ReserveAmount || row.reserveAmount || 0;
        return `$${(reserve).toLocaleString()}`;
      },
    },
  ];

  return (
    <DataTable
      data={agreements}
      columns={columns}
      searchKey="id"
      rowKey={(row) => row.id || row.AgreementID || ''}
      className={className}
      isLoading={isLoading}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      onPageChange={onPageChange}
      serverSidePagination={!!onPageChange}
    />
  );
};

export default AgreementsTable;
