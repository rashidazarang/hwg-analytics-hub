
import React, { useState } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';

type ClaimsTableProps = {
  claims: Claim[];
  className?: string;
};

const ClaimsTable: React.FC<ClaimsTableProps> = ({ claims, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const columns: Column<Claim>[] = [
    {
      key: 'id',
      title: 'Claim ID',
      sortable: true,
      searchable: true,
      render: (row) => row.id || row.ClaimID || '',
    },
    {
      key: 'agreementId',
      title: 'Agreement ID',
      sortable: true,
      searchable: true,
      render: (row) => row.agreementId || row.AgreementID || '',
    },
    {
      key: 'dealerName',
      title: 'Dealer Name',
      sortable: true,
      searchable: true,
    },
    {
      key: 'dateReported',
      title: 'Date Reported',
      sortable: true,
      render: (row) => {
        const date = row.ReportedDate || row.dateReported;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'dateIncurred',
      title: 'Date Incurred',
      sortable: true,
      render: (row) => {
        const date = row.IncurredDate || row.dateIncurred;
        return date ? format(new Date(date), 'MMM d, yyyy') : 'N/A';
      },
    },
    {
      key: 'deductible',
      title: 'Deductible',
      sortable: true,
      render: (row) => {
        const deductible = row.Deductible || row.deductible || 0;
        return `$${(deductible).toLocaleString()}`;
      },
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

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <DataTable
      data={claims}
      columns={columns}
      rowKey={(row) => row.id || row.ClaimID || ''}
      className={className}
      searchConfig={{
        enabled: true,
        placeholder: "Search claims by ID, agreement, or dealer...",
        onChange: handleSearch,
        searchKeys: ["id", "ClaimID", "agreementId", "AgreementID", "dealerName"]
      }}
    />
  );
};

export default ClaimsTable;
