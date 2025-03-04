
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchClaims(dealerFilter?: string) {
  let query = supabase
    .from("claims")
    .select(`
      id,
      ClaimID, 
      AgreementID, 
      ReportedDate, 
      Closed,
      Cause,
      LastModified,
      agreements(DealerUUID, dealers(Payee))
    `)
    .order("LastModified", { ascending: false });

  if (dealerFilter) {
    query = query.eq("agreements.DealerUUID", dealerFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fetching claims:", error);
    return [];
  }

  return data;
}

const ClaimsTable: React.FC<{ className?: string; dealerFilter?: string; searchQuery?: string; }> = ({
  className = '',
  dealerFilter = '',
  searchQuery = ''
}) => {
  const { data: claims = [], isFetching } = useQuery({
    queryKey: ['claims', dealerFilter],
    queryFn: () => fetchClaims(dealerFilter),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
  
  // Filter claims based on dealerFilter and searchQuery
  const filteredClaims = useMemo(() => {
    let filtered = claims;

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(claim => 
  claim.ClaimID.toLowerCase().includes(term) || 
  claim.AgreementID.toLowerCase().includes(term) ||
  claim.agreements?.dealers?.[0]?.Payee?.toLowerCase().includes(term)
);
    }

    return filtered;
  }, [claims, searchQuery]);
  
  // Define a claim status mapper function to handle null/undefined statuses
 const getClaimStatus = (claim: any): string => {
  if (claim.Closed) return 'CLOSED';
  if (claim.Cause && claim.Closed === null) return 'DENIED';
  if (claim.ReportedDate && !claim.Closed) return 'PENDING';
  return 'OPEN';
};
  
const columns: Column<any>[] = [
  {
    key: 'ClaimID',
    title: 'Claim ID',
    sortable: false,
    searchable: true,
    render: (row) => row.ClaimID || '',
  },
  {
    key: 'AgreementID',
    title: 'Agreement ID',
    sortable: false,
    searchable: true,
    render: (row) => row.AgreementID || '',
  },
  {
    key: 'dealership',
    title: 'Dealership',
    searchable: true,
    render: (row) => row.agreements?.dealers?.Payee || "Unknown Dealership",
  },
  {
    key: 'Status',
    title: 'Status',
    sortable: false,
    render: (row) => {
      const status = getClaimStatus(row);
      const variants = {
        OPEN: 'bg-warning/15 text-warning border-warning/20',
        CLOSED: 'bg-success/15 text-success border-success/20',
        PENDING: 'bg-info/15 text-info border-info/20',
        DENIED: 'bg-destructive/15 text-destructive border-destructive/20',
        UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
      };
      return (
        <Badge variant="outline" className={`${variants[status as keyof typeof variants] || variants.UNKNOWN} border pointer-events-none`}>
          {status}
        </Badge>
      );
    },
  },
  {
    key: 'ReportedDate',
    title: 'Date Reported',
    sortable: false,
    render: (row) => row.ReportedDate ? format(new Date(row.ReportedDate), 'MMM d, yyyy')
      : <span className="text-muted-foreground">NULL</span>,
  },
  {
    key: 'Closed',
    title: 'Closed Date',
    sortable: false,
    render: (row) => row.Closed ? format(new Date(row.Closed), 'MMM d, yyyy')
      : <span className="text-muted-foreground">NULL</span>,
  },
  {
    key: 'LastModified',
    title: 'Last Modified',
    sortable: false,
    render: (row) => row.LastModified ? format(new Date(row.LastModified), 'MMM d, yyyy')
       : <span className="text-muted-foreground">NULL</span>,
  }
];

  return (
    <DataTable
      data={filteredClaims}
      columns={columns}
      rowKey={(row) => row.ClaimID || row.id}
      className={className}
searchConfig={{
  enabled: true,
  placeholder: "Search by Claim ID, Agreement ID, or Dealership...",
  searchKeys: ["ClaimID", "AgreementID", "agreements.dealers.0.Payee"]
}}
    />
  );
};

export default ClaimsTable;
