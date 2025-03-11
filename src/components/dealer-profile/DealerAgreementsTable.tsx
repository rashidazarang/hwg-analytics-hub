import React from 'react';
import { format } from 'date-fns';
import { FileSignature, AlertTriangle, CheckCircle, Clock, Ban } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import DataTable, { Column } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';

interface Agreement {
  AgreementID: string;
  AgreementNumber: string;
  AgreementStatus: string;
  EffectiveDate: string;
  ExpireDate: string;
  DealerCost: number;
  Total: number;
  HolderFirstName: string;
  HolderLastName: string;
  SerialVIN: string;
  ProductType: string;
}

interface DealerAgreementsTableProps {
  data: Agreement[];
  isLoading: boolean;
}

const DealerAgreementsTable: React.FC<DealerAgreementsTableProps> = ({ 
  data, 
  isLoading
}) => {
  const statusColors: Record<string, { color: string, icon: React.ElementType }> = {
    'ACTIVE': { color: 'bg-green-100 text-green-800 hover:bg-green-200', icon: CheckCircle },
    'CLAIMABLE': { color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', icon: CheckCircle },
    'PENDING': { color: 'bg-amber-100 text-amber-800 hover:bg-amber-200', icon: Clock },
    'CANCELLED': { color: 'bg-red-100 text-red-800 hover:bg-red-200', icon: Ban },
    'VOID': { color: 'bg-red-100 text-red-800 hover:bg-red-200', icon: Ban },
    'EXPIRED': { color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', icon: AlertTriangle },
  };

  const getStatusDisplay = (status: string) => {
    const normalizedStatus = status?.toUpperCase() || 'UNKNOWN';
    const { color, icon: Icon } = statusColors[normalizedStatus] || 
      { color: 'bg-gray-100 text-gray-800 hover:bg-gray-200', icon: FileSignature };
    
    return (
      <Badge variant="outline" className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {normalizedStatus}
      </Badge>
    );
  };

  const columns: Column<Agreement>[] = [
    {
      key: 'agreement_number',
      title: 'Agreement',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.AgreementNumber || '-'}</span>
          <span className="text-xs text-muted-foreground">{row.AgreementID}</span>
        </div>
      ),
      searchable: true,
    },
    {
      key: 'holder',
      title: 'Holder',
      render: (row) => (
        <div className="font-medium">
          {row.HolderFirstName && row.HolderLastName 
            ? `${row.HolderFirstName} ${row.HolderLastName}`
            : 'Unknown Holder'}
        </div>
      ),
      searchable: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => getStatusDisplay(row.AgreementStatus),
      filterable: true,
      searchable: true,
    },
    {
      key: 'effective_date',
      title: 'Effective Date',
      render: (row) => (
        <div>
          {row.EffectiveDate 
            ? format(new Date(row.EffectiveDate), 'MMM d, yyyy') 
            : 'N/A'}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'expire_date',
      title: 'Expiry Date',
      render: (row) => (
        <div>
          {row.ExpireDate 
            ? format(new Date(row.ExpireDate), 'MMM d, yyyy') 
            : 'N/A'}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'product_type',
      title: 'Product Type',
      render: (row) => (
        <div>{row.ProductType || 'Unknown'}</div>
      ),
      filterable: true,
    },
    {
      key: 'value',
      title: 'Value',
      render: (row) => (
        <div className="font-medium text-right">
          {formatCurrency(row.DealerCost || 0)}
        </div>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">Agreements</h2>
      <DataTable
        data={data || []}
        columns={columns}
        rowKey={(row) => row.AgreementID}
        loading={isLoading}
        searchConfig={{
          enabled: true,
          placeholder: "Search agreements...",
          searchKeys: ['AgreementNumber', 'AgreementStatus', 'HolderFirstName', 'HolderLastName', 'SerialVIN'],
        }}
        pagination={{
          enabled: true,
          pageSize: 10,
        }}
      />
    </div>
  );
};

export default DealerAgreementsTable;