import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Column<T> = {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
};

export type PaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export type SearchConfig = {
  enabled: boolean;
  placeholder?: string;
  onChange?: (term: string) => void;
  searchKeys?: string[];
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  searchKey?: string;
  searchConfig?: SearchConfig;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  loading?: boolean;
  paginationProps?: PaginationProps;
  customFilters?: React.ReactNode;
};

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchConfig = { enabled: true },
  rowKey,
  onRowClick,
  className = '',
  loading = false,
  paginationProps,
  customFilters,
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filteredData, setFilteredData] = useState<T[]>(data);

  useEffect(() => {
    setFilteredData(data);
    
    if (searchTerm && !searchConfig.onChange) {
      applySearchFilter(searchTerm);
    }
  }, [data, searchTerm, searchConfig.onChange]);

  const applySearchFilter = (term: string) => {
    if (!term || term.trim() === '') {
      setFilteredData(data);
      return;
    }

    const normalizedTerm = term.toLowerCase().trim();
    
    if (searchConfig.onChange) {
      return;
    }

    const searchResults = data.filter(row => {
      if (searchKey && String(row[searchKey]).toLowerCase().includes(normalizedTerm)) {
        return true;
      }
      
      if (searchConfig.searchKeys) {
        return searchConfig.searchKeys.some(key => {
          const value = row[key];
          return value && String(value).toLowerCase().includes(normalizedTerm);
        });
      }
      
      const searchableColumns = columns.filter(col => col.searchable);
      if (searchableColumns.length > 0) {
        return searchableColumns.some(col => {
          const value = row[col.key];
          return value && String(value).toLowerCase().includes(normalizedTerm);
        });
      }
      
      return false;
    });
    
    setFilteredData(searchResults);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchConfig.onChange) {
      searchConfig.onChange(value);
    } else {
      applySearchFilter(value);
    }
  };

  const sortedData = sortConfig 
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      })
    : filteredData;

  const displayData = sortedData;

  const totalPages = paginationProps 
    ? Math.max(1, Math.ceil(paginationProps.totalItems / paginationProps.pageSize))
    : 1;

  useEffect(() => {
    if (paginationProps && paginationProps.currentPage > totalPages && totalPages > 0) {
      paginationProps.onPageChange(1);
    }
  }, [paginationProps, totalPages]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ChevronDown className="ml-1 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronDown className="ml-1 h-4 w-4" />
      : <ChevronDown className="ml-1 h-4 w-4 rotate-180 transform" />;
  };

  const displayedCount = displayData.length;
  const totalItemsCount = paginationProps?.totalItems || displayedCount;
  
  const pageStart = paginationProps 
    ? Math.min((paginationProps.currentPage - 1) * paginationProps.pageSize + 1, totalItemsCount)
    : 1;
  
  const pageEnd = paginationProps
    ? Math.min(pageStart + paginationProps.pageSize - 1, totalItemsCount)
    : displayedCount;
  
  return (
    <div className={className}>
      {searchConfig.enabled && (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground animate-fade-in">
              {loading ? (
                <span className="flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
                  Loading records...
                </span>
              ) : (
                <span>
                  Displaying <span className="font-medium text-foreground">{pageStart}-{pageEnd}</span> of <span className="font-medium text-foreground">{totalItemsCount}</span> records
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={searchConfig.placeholder || "Search..."}
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-7 h-8 w-44 text-sm"
                />
              </div>
              {customFilters}
            </div>
          </div>
        </div>
      )}
      
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={column.sortable ? 'cursor-pointer' : ''}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.title}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-32">
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-32 text-muted-foreground">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((row) => (
                  <TableRow 
                    key={rowKey(row)} 
                    className={onRowClick ? 'cursor-pointer hover:bg-accent/50' : ''}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((column) => (
                      <TableCell key={`${rowKey(row)}-${column.key}`}>
                        {column.render ? column.render(row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
