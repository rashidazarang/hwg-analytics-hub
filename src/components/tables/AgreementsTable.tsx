
import React from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define a proper type for Agreement based on the Supabase schema
type Agreement = {
  id: string;
  AgreementID: string;
  HolderFirstName?: string | null;
  HolderLastName?: string | null;
  dealerName?: string;
  DealerUUID?: string | null;
  EffectiveDate?: string | null;
  ExpireDate?: string | null;
  AgreementStatus?: string | null;
  Total?: number | null;
  DealerCost?: number | null;
  ReserveAmount?: number | null;
  status?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  dealerCost?: number;
  reserveAmount?: number;
};

// Fetch agreements from Supabase
async function fetchAgreements(): Promise<Agreement[]> {
  try {
    const { data, error } = await supabase.from("agreements").select("*");

    if (error) {
      console.error("Supabase Error:", error);
      return [];
    }

    console.log("Fetched Agreements:", data); // Debugging log
    return data || [];
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return [];
  }
}

type AgreementsTableProps = {
  agreements?: Agreement[];
  className?: string;
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({ className = '' }) => {
  // Fetch agreements using React Query
  const { data: agreements, isLoading, error } = useQuery({
    queryKey: ["agreements"],
    queryFn: fetchAgreements,
  });

  const columns: Column<Agreement>[] = [
    {
      key: 'id',
      title: 'Agreement ID',
      sortable: true,
      render: (row) => row.AgreementID || '',
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
      render: (row) => row.dealerName || row.DealerUUID || '',
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

  if (isLoading) {
    return <div className="py-10 text-center">Loading agreements...</div>;
  }

  if (error) {
    console.error("Failed to load agreements:", error);
    return <div className="py-10 text-center text-destructive">Error loading agreements</div>;
  }

  return (
    <DataTable
      data={agreements || []}
      columns={columns}
      searchKey="id"
      rowKey={(row) => row.id || row.AgreementID || ''}
      className={className}
    />
  );
};

export default AgreementsTable;
