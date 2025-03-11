import React from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge';

interface Claim {
  ClaimID: string;
  AgreementID: string;
  IncurredDate: string;
  ReportedDate: string;
  Closed: string | null;
  Deductible: number;
  Complaint: string;
  Cause: string;
  Correction: string;
  agreements?: {
    AgreementID: string;
    DealerUUID: string;
  };
}

interface DealerClaimsTableProps {
  data: Claim[];
  isLoading: boolean;
}

const DealerClaimsTable: React.FC<DealerClaimsTableProps> = ({ 
  data, 
  isLoading
}) => {
  const getClaimStatus = (claim: Claim) => {
    if (claim.Closed) {
      return 'CLOSED';
    } else {
      return 'OPEN';
    }
  };

  const columns: Column<Claim>[] = [
    {
      key: 'claim_id',
      title: 'Claim ID',
      render: (row) => (
        <div className="font-medium">
          {row.ClaimID}
        </div>
      ),
      searchable: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <ClaimStatusBadge status={getClaimStatus(row)} />
      ),
      filterable: true,
    },
    {
      key: 'reported_date',
      title: 'Reported Date',
      render: (row) => (
        <div>
          {row.ReportedDate 
            ? format(new Date(row.ReportedDate), 'MMM d, yyyy') 
            : 'N/A'}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'incurred_date',
      title: 'Incurred Date',
      render: (row) => (
        <div>
          {row.IncurredDate 
            ? format(new Date(row.IncurredDate), 'MMM d, yyyy') 
            : 'N/A'}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'closed_date',
      title: 'Closed Date',
      render: (row) => (
        <div>
          {row.Closed 
            ? format(new Date(row.Closed), 'MMM d, yyyy') 
            : 'N/A'}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'duration',
      title: 'Duration',
      render: (row) => {
        if (!row.ReportedDate || !row.Closed) {
          return <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Open</span>;
        }
        
        const reported = new Date(row.ReportedDate);
        const closed = new Date(row.Closed);
        const days = Math.round((closed.getTime() - reported.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="font-medium">
            {days} days
          </div>
        );
      },
      sortable: false,
    },
    {
      key: 'complaint',
      title: 'Description',
      render: (row) => (
        <div className="max-w-xs truncate">
          {row.Complaint || 'No description provided'}
        </div>
      ),
      searchable: true,
    },
    {
      key: 'deductible',
      title: 'Deductible',
      render: (row) => (
        <div className="font-medium text-right">
          {formatCurrency(row.Deductible || 0)}
        </div>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Claims</h2>
      <DataTable
        data={data || []}
        columns={columns}
        rowKey={(row) => row.ClaimID}
        loading={isLoading}
        searchConfig={{
          enabled: true,
          placeholder: "Search claims...",
          searchKeys: ['ClaimID', 'Complaint', 'Cause', 'Correction'],
        }}
        pagination={{
          enabled: true,
          pageSize: 10,
        }}
      />
    </div>
  );
};

export default DealerClaimsTable;