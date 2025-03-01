
import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export type Column<T> = {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  searchKey?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  isLoading?: boolean;
  serverSidePagination?: boolean;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
};

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  rowKey,
  onRowClick,
  className = '',
  isLoading = false,
  serverSidePagination = false,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Use either server-side or client-side pagination
  const activePage = serverSidePagination ? currentPage : localCurrentPage;
  const activePageSize = serverSidePagination ? pageSize : localPageSize;

  // Filter data based on search term (client-side only)
  const filteredData = !serverSidePagination && searchTerm && searchKey
    ? data.filter(row => 
        String(row[searchKey])
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : data;

  // Sort data (client-side only)
  const sortedData = !serverSidePagination && sortConfig 
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

  // Paginate data (client-side only)
  const totalItems = serverSidePagination ? totalCount : sortedData.length;
  const totalPages = Math.ceil(totalItems / activePageSize);
  
  const paginatedData = serverSidePagination 
    ? sortedData // For server-side, the data is already paginated
    : sortedData.slice(
        (activePage - 1) * activePageSize,
        activePage * activePageSize
      );

  const handleSort = (key: string) => {
    if (serverSidePagination) return; // No client-side sorting for server-paginated tables
    
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

  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value);
    setLocalPageSize(newSize);
    setLocalCurrentPage(1); // Reset to first page when changing page size
    
    if (serverSidePagination && onPageChange) {
      onPageChange(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (serverSidePagination && onPageChange) {
      onPageChange(newPage);
    } else {
      setLocalCurrentPage(newPage);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {searchKey && (
        <div className="flex justify-between items-center mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
              disabled={serverSidePagination || isLoading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9"
              disabled={isLoading}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            
            <Select 
              value={activePageSize.toString()} 
              onValueChange={handlePageSizeChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue placeholder="10 per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
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
                    className={column.sortable && !serverSidePagination ? 'cursor-pointer' : ''}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.title}
                      {column.sortable && !serverSidePagination && getSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading state
                Array.from({ length: activePageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={`skeleton-${index}-${colIndex}`}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center h-32 text-muted-foreground">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
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
      
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(activePageSize * (activePage - 1) + 1, totalItems)} to {Math.min(activePageSize * activePage, totalItems)} of {totalItems} entries
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={activePage === 1 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(Math.max(activePage - 1, 1))}
              disabled={activePage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-sm">
              Page {activePage} of {totalPages}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(Math.min(activePage + 1, totalPages))}
              disabled={activePage === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={activePage === totalPages || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
