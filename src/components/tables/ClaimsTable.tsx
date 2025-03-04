
import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

async function fetchClaims(dateRange: DateRange, dealerFilter?: string) {
  console.log('🔍 ClaimsTable: Fetching claims with filters:', {
    dealerFilter,
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  });

  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const fromOffset = page * PAGE_SIZE;
    const toOffset = fromOffset + PAGE_SIZE - 1;

    let query = supabase
      .from("claims")
      .select(`
        id,
        ClaimID, 
        AgreementID, 
        ReportedDate, 
        Closed,
        Cause,
        Correction,
        LastModified,
        agreements(DealerUUID, dealers(Payee))
      `)
      .gte('ReportedDate', dateRange.from.toISOString()) // Respect date range
      .lte('ReportedDate', dateRange.to.toISOString())
      .order("LastModified", { ascending: false })
      .range(fromOffset, toOffset);

    if (dealerFilter && dealerFilter.trim() !== '') {
      console.log(`🔍 ClaimsTable: Filtering by dealership UUID: "${dealerFilter}"`);
      query = query.eq("agreements.DealerUUID", dealerFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Error fetching claims:", error);
      return allData;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = [...allData, ...data];
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`✅ ClaimsTable: Fetched a total of ${allData.length} claims`);
  return allData;
}
// Function to check if a claim is denied based on Correction field
function isClaimDenied(correction: string | null | undefined): boolean {
  if (!correction) return false;
  return /denied|not covered|rejected/i.test(correction);
}

// Updated status mapper function with PENDING status
const getClaimStatus = (claim: any): string => {
  if (claim.Closed) return 'CLOSED';
  if (claim.Correction && /denied|not covered|rejected/i.test(claim.Correction)) {
    return 'DENIED';
  }
  if (!claim.ReportedDate && !claim.Closed) return 'PENDING'; // No ReportedDate & No Closed = PENDING
  return 'OPEN'; // Default to OPEN if it has a ReportedDate but is not yet Closed
};

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
    console.log('🔍 ClaimsTable: Filtering claims with searchQuery:', searchQuery);
    let filtered = claims;

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(claim => 
        claim.ClaimID?.toLowerCase().includes(term) || 
        claim.AgreementID?.toLowerCase().includes(term) ||
        claim.agreements?.dealers?.Payee?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [claims, searchQuery]);
  
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
        DENIED: 'bg-destructive/15 text-destructive border-destructive/20',
        PENDING: 'bg-muted/15 text-muted-foreground border-muted/20',
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
      : <span className="text-muted-foreground">N/A</span>,
  },
  {
    key: 'Closed',
    title: 'Closed Date',
    sortable: false,
    render: (row) => row.Closed ? format(new Date(row.Closed), 'MMM d, yyyy')
      : <span className="text-muted-foreground">N/A</span>,
  },
  {
    key: 'LastModified',
    title: 'Last Modified',
    sortable: false,
    render: (row) => row.LastModified ? format(new Date(row.LastModified), 'MMM d, yyyy')
       : <span className="text-muted-foreground">N/A</span>,
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
        searchKeys: ["ClaimID", "AgreementID", "agreements.dealers.Payee"]
      }}
    />
  );
};

export default ClaimsTable;
