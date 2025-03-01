
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SortAsc, SortDesc, X } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

export type Column<T> = {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
};

export type FilterOption = {
  label: string;
  value: string;
};

export type Filter<T = any> = {
  key: keyof T | string;
  title: string;
  type: 'select' | 'date' | 'range';
  options?: FilterOption[];
  min?: number;
  max?: number;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  rowKey: (row: T) => string | number;
  className?: string;
  filters?: Filter<T>[];
};

const DataTable = <T extends object>({
  data,
  columns,
  searchKey,
  rowKey,
  className = '',
  filters,
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilter = (key: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const filteredAndSortedData = useMemo(() => {
    // First, filter by search term
    let filteredData = [...data];
    
    if (searchKey && searchTerm) {
      filteredData = filteredData.filter(item => {
        const value = item[searchKey];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Apply active filters
    if (Object.keys(activeFilters).length > 0) {
      filteredData = filteredData.filter(item => {
        return Object.entries(activeFilters).every(([key, value]) => {
          if (!value) return true;
          
          const filter = filters?.find(f => f.key === key);
          const itemValue = item[key as keyof T];
          
          if (filter?.type === 'select') {
            return itemValue === value;
          }
          
          if (filter?.type === 'range' && Array.isArray(value)) {
            const [min, max] = value;
            const numValue = Number(itemValue);
            return numValue >= min && numValue <= max;
          }
          
          // Default case
          return true;
        });
      });
    }
    
    // Then sort the data
    if (sortColumn) {
      filteredData.sort((a, b) => {
        const aValue = a[sortColumn as keyof T];
        const bValue = b[sortColumn as keyof T];
        
        if (aValue === bValue) return 0;
        
        const compareResult = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? compareResult : -compareResult;
      });
    }
    
    return filteredData;
  }, [data, searchKey, searchTerm, sortColumn, sortDirection, activeFilters, filters]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        
        {filters && filters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {filters.map((filter) => (
              <div key={filter.key as string} className="flex items-center gap-1">
                {filter.type === 'select' && filter.options && (
                  <Select
                    value={activeFilters[filter.key as string] || ''}
                    onValueChange={(value) => handleFilterChange(filter.key as string, value)}
                  >
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue placeholder={filter.title} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All {filter.title}</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {filter.type === 'range' && (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{filter.title}</span>
                      {activeFilters[filter.key as string] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => clearFilter(filter.key as string)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Slider
                      min={filter.min || 0}
                      max={filter.max || 100}
                      step={1}
                      value={activeFilters[filter.key as string] || [filter.min || 0, filter.max || 100]}
                      onValueChange={(value) => handleFilterChange(filter.key as string, value)}
                      className="w-[180px]"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs">
                        {activeFilters[filter.key as string]
                          ? activeFilters[filter.key as string][0]
                          : filter.min || 0}
                      </span>
                      <span className="text-xs">
                        {activeFilters[filter.key as string]
                          ? activeFilters[filter.key as string][1]
                          : filter.max || 100}
                      </span>
                    </div>
                  </div>
                )}
                
                {activeFilters[filter.key as string] && filter.type !== 'range' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => clearFilter(filter.key as string)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key as string} className="whitespace-nowrap">
                  {column.sortable ? (
                    <button
                      className="flex items-center gap-1 hover:text-foreground font-medium"
                      onClick={() => handleSort(column.key as string)}
                    >
                      {column.title}
                      {sortColumn === column.key && (
                        sortDirection === 'asc' ? (
                          <SortAsc className="h-3 w-3" />
                        ) : (
                          <SortDesc className="h-3 w-3" />
                        )
                      )}
                    </button>
                  ) : (
                    column.title
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={`${rowKey(row)}-${column.key as string}`}>
                      {column.render
                        ? column.render(row)
                        : row[column.key as keyof T] as React.ReactNode}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Showing {filteredAndSortedData.length} of {data.length} results
      </div>
    </div>
  );
};

export default DataTable;
