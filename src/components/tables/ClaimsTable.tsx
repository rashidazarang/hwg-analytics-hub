import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchClaims(dealerFilter?: string) {
let query = supabase
  .from("claims")
  .select(`
    ClaimID, 
    AgreementID, 
    ReportedDate, 
    IncurredDate, 
    Closed,
    Deductible,
    ClaimStatus, 
    agreements!inner(DealerUUID, dealers!inner(PayeeID, Payee))
  `)
  .order("ReportedDate", { ascending: false });

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

const ClaimsTable: React.FC<{ className?: string; dealerFilter?: string; searchQuery?: string }> = ({
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
      (claim.agreements?.dealers?.Payee && claim.agreements.dealers.Payee.toLowerCase().includes(term))
    );
  }

  return filtered;
}, [claims, searchQuery]);  // ✅ FIXED: Removed extra `}, [dealerFilter, searchQuery, claims]);`
  
 const columns: Column<Claim>[] = [
  {
    key: 'ClaimID',
    title: 'Claim ID',
    sortable: true,
    searchable: true,
    render: (row) => row.ClaimID || '',
  },
  {
    key: 'AgreementID',
    title: 'Agreement ID',
    sortable: true,
    searchable: true,
    render: (row) => row.AgreementID || '',
  },
 {
  key: 'dealership',
  title: 'Dealership',
  searchable: true,
  render: (row) => row.agreements?.dealers?.Payee || "Unknown Dealership",  // ✅ FIXED
},
{
  key: 'DealerID',
  title: 'Dealer ID',
  searchable: true,
  render: (row) => row.agreements?.dealers?.PayeeID || 'No Dealer Assigned',  // ✅ FIXED
},
  {
    key: 'ReportedDate',
    title: 'Date Reported',
    sortable: true,
    render: (row) => row.ReportedDate ? format(new Date(row.ReportedDate), 'MMM d, yyyy') : 'N/A',
  },
  {
    key: 'IncurredDate',
    title: 'Date Incurred',
    sortable: true,
    render: (row) => row.IncurredDate ? format(new Date(row.IncurredDate), 'MMM d, yyyy') : 'N/A',
  },
  {
    key: 'Closed',
    title: 'Closed',
    sortable: true,
    render: (row) => row.Closed ? format(new Date(row.Closed), 'MMM d, yyyy') : 'N/A',
  },
  {
    key: 'Deductible',
    title: 'Deductible',
    sortable: true,
    render: (row) => `$${(row.Deductible || 0).toLocaleString()}`,
  },
  {
    key: 'ClaimStatus',
    title: 'Status',
    sortable: true,
    render: (row) => {
      const status = row.ClaimStatus || 'UNKNOWN';
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
      data={filteredClaims}
      columns={columns}
rowKey={(row) => row.ClaimID}
      className={className}
searchConfig={{
  enabled: true,
  placeholder: "Search by Claim ID, Agreement ID, or Dealership...",
  searchKeys: ["ClaimID", "AgreementID", "dealers.Payee"]
}}
    />
  );
};

export default ClaimsTable;
