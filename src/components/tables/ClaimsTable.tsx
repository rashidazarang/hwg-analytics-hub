
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DataTable, { Column } from './DataTable';
import { Claim } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';

type ClaimsTableProps = {
  claims: Claim[];
  className?: string;
  searchQuery?: string;
  dealerFilter?: string; // Added the dealerFilter prop
};

const ClaimsTable: React.FC<ClaimsTableProps> = ({ 
  claims, 
  className = '', 
  searchQuery = '',
  dealerFilter = '' // Add the dealerFilter prop with default empty string
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>(claims);
  
  // Update searchTerm when searchQuery prop changes and filter claims
  useEffect(() => {
    setSearchTerm(searchQuery);
    filterClaims(searchQuery, dealerFilter);
  }, [searchQuery, dealerFilter, claims]);
  
  // Function to filter claims based on search term and dealer filter
  const filterClaims = (term: string, dealer: string) => {
    let filtered = claims;
    
    // First filter by dealer name if specified
    if (dealer && dealer.trim()) {
      filtered = filtered.filter(claim => 
        claim.dealerName && claim.dealerName.toLowerCase() === dealer.toLowerCase()
      );
    }
    
    // Then apply search term if it exists
    if (term && term.trim()) {
      const normalizedTerm = term.toLowerCase().trim();
      filtered = filtered.filter(claim => {
        // Check claim ID
        if (claim.id && claim.id.toLowerCase().includes(normalizedTerm)) {
          return true;
        }
        
        // Check agreement ID
        if (claim.agreementId && claim.agreementId.toLowerCase().includes(normalizedTerm)) {
          return true;
        }
        
        // Check dealer name
        if (claim.dealerName && claim.dealerName.toLowerCase().includes(normalizedTerm)) {
          return true;
        }
        
        return false;
      });
    }
    
    setFilteredClaims(filtered);
  };
  
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
    filterClaims(term, dealerFilter);
  };

  return (
    <DataTable
      data={filteredClaims}
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
