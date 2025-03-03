
import React, { useState, useMemo } from 'react';
import DataTable, { Column } from './DataTable';
import { Dealer } from '@/lib/mockData';
import { Progress } from '@/components/ui/progress';

type DealersTableProps = {
  dealers: Dealer[];
  className?: string;
};

const DealersTable: React.FC<DealersTableProps> = ({ dealers, className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const columns: Column<Dealer>[] = [
    {
      key: 'id',
      title: 'Dealer ID',
      sortable: true,
      searchable: true,
      render: (row) => row.id || row.DealerUUID || '',
    },
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      searchable: true,
      render: (row) => row.name || row.Payee || '',
    },
    {
      key: 'location',
      title: 'Location',
      sortable: true,
      searchable: true,
      render: (row) => {
        // Combine city, region, and country if available
        const city = row.City || row.city || '';
        const region = row.Region || row.region || '';
        const country = row.Country || row.country || '';
        
        const parts = [city, region, country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
      },
    },
    {
      key: 'activeAgreements',
      title: 'Active Agreements',
      sortable: true,
    },
    {
      key: 'totalClaims',
      title: 'Total Claims',
      sortable: true,
    },
    {
      key: 'totalRevenue',
      title: 'Total Revenue',
      sortable: true,
      render: (row) => {
        const revenue = row.totalRevenue || row.Total || 0;
        return `$${(revenue).toLocaleString()}`;
      },
    },
    {
      key: 'totalPayouts',
      title: 'Total Payouts',
      sortable: true,
      render: (row) => {
        const payouts = row.totalPayouts || row.TotalPayouts || 0;
        return `$${(payouts).toLocaleString()}`;
      },
    },
    {
      key: 'performanceScore',
      title: 'Performance Score',
      sortable: true,
      render: (row) => (
        <div className="w-full flex items-center gap-2">
          <Progress value={row.performanceScore} className="h-2" />
          <span className="text-sm">{row.performanceScore}%</span>
        </div>
      ),
    },
  ];

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <DataTable
      data={dealers}
      columns={columns}
      rowKey={(row) => row.id || row.DealerUUID || ''}
      className={className}
      searchConfig={{
        enabled: true,
        placeholder: "Search dealers by ID, name, or location...",
        onChange: handleSearch,
        searchKeys: ["id", "DealerUUID", "name", "Payee", "city", "City", "region", "Region"]
      }}
    />
  );
};

export default DealersTable;
