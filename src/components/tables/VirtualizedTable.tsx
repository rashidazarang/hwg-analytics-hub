
import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import debounce from 'lodash/debounce';

export type VirtualColumn<T> = {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  width?: number;
};

export type SearchConfig = {
  enabled: boolean;
  placeholder?: string;
  onChange?: (term: string) => void;
  searchKeys?: string[];
};

type FetchDataParams = {
  pageParam?: number;
  pageSize: number;
  searchTerm?: string;
  filters?: Record<string, any>;
};

export type VirtualizedTableProps<T> = {
  columns: VirtualColumn<T>[];
  fetchData: (params: FetchDataParams) => Promise<{ data: T[]; nextPage: number | null }>;
  rowKey: (row: T) => string;
  searchConfig?: SearchConfig;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  className?: string;
  filters?: Record<string, any>;
  queryKey: string[];
};

const VirtualizedTable = <T extends Record<string, any>>({
  columns,
  fetchData,
  rowKey,
  searchConfig = { enabled: false },
  pageSize = 50,
  onRowClick,
  className = '',
  filters = {},
  queryKey,
}: VirtualizedTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Create debounced search handler
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchTerm(value);
      if (searchConfig.onChange) {
        searchConfig.onChange(value);
      }
    }, 300)
  ).current;

  // Use React Query's useInfiniteQuery for fetching paginated data
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isLoading,
    refetch,
    status,
    error
  } = useInfiniteQuery({
    queryKey: [...queryKey, searchTerm, JSON.stringify(filters)],
    queryFn: async ({ pageParam = 0 }) => {
      console.log(`🔄 Fetching page ${pageParam} with searchTerm: ${searchTerm}`);
      const result = await fetchData({
        pageParam,
        pageSize,
        searchTerm,
        filters
      });
      console.log(`📊 Page ${pageParam} data:`, result?.data?.length || 0, "items");
      return result;
    },
    getNextPageParam: (lastPage) => {
      console.log("🔄 getNextPageParam called, nextPage:", lastPage.nextPage);
      return lastPage.nextPage;
    },
    initialPageParam: 0,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Effect for refetching data when filters change
  useEffect(() => {
    console.log("🔄 Filters changed, refetching data:", filters);
    refetch();
  }, [filters, refetch]);

  // Set up Intersection Observer for infinite scrolling
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    console.log("👀 Setting up Intersection Observer. hasNextPage:", hasNextPage, "isFetchingNextPage:", isFetchingNextPage);
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log("👀 Last row is visible, fetching next page...");
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
      console.log("👀 Intersection Observer disconnected");
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, loadMoreRef]);

  // Flatten all pages of data into a single array
  const flatData = React.useMemo(() => {
    const allData = data?.pages?.flatMap(page => page.data) || [];
    console.log("🔍 Merged data from useInfiniteQuery:", allData.length, "total items");
    
    if (allData.length === 0) {
      console.log("⚠️ Warning: No data after merging. Check fetch function!");
      console.log("🔄 Current query status:", status);
      if (error) console.error("🔴 Query error:", error);
      console.log("📄 Raw data pages:", data?.pages);
    } else {
      console.log("✅ Data merged successfully. First few items:", allData.slice(0, 3));
    }
    
    return allData;
  }, [data, status, error]);

  // Set up virtualizer
  const virtualizer = useVirtualizer({
    count: flatData.length + (hasNextPage ? 1 : 0), // Add one extra for the loading indicator
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimated row height
    overscan: 10,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("🔍 Search input changed:", value);
    debouncedSearch(value);
  };

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

  // Sort data if sorting is active
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return flatData;
    
    return [...flatData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [flatData, sortConfig]);

  // Log key state variables
  useEffect(() => {
    console.log("📊 VirtualizedTable state:", {
      dataLoaded: flatData.length > 0,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      virtualItems: virtualizer.getVirtualItems().length,
      sortedDataLength: sortedData.length
    });
  }, [flatData.length, hasNextPage, isFetchingNextPage, isLoading, virtualizer, sortedData.length]);

  return (
    <div className={`w-full ${className}`}>
      {searchConfig.enabled && (
        <div className="flex justify-between items-center mb-4">
          <div className="relative">
            <Input
              placeholder={searchConfig.placeholder || "Search..."}
              onChange={handleSearch}
              className="pl-4 w-64"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
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
                    style={{ width: column.width ? `${column.width}px` : 'auto' }}
                  >
                    <div className="flex items-center">
                      {column.title}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        
        {/* Virtualized Table Body */}
        <div 
          ref={parentRef} 
          className="overflow-auto relative" 
          style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <Table>
              <TableBody>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const isLoaderRow = virtualRow.index >= sortedData.length;
                  
                  if (isLoaderRow) {
                    return (
                      <TableRow 
                        key="loader"
                        data-index={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <TableCell 
                          colSpan={columns.length} 
                          className="h-14"
                        >
                          <div ref={loadMoreRef} className="w-full">
                            {hasNextPage && (
                              <div className="w-full flex justify-center">
                                <div className="flex items-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  <span>Loading more...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  const row = sortedData[virtualRow.index];
                  
                  if (!row) {
                    console.warn(`⚠️ Missing row data at index ${virtualRow.index}`);
                    return null;
                  }
                  
                  const rowId = rowKey(row);
                  if (!rowId) {
                    console.warn(`⚠️ Invalid rowKey for row at index ${virtualRow.index}:`, row);
                  }
                  
                  return (
                    <TableRow 
                      key={rowId || `row-${virtualRow.index}`} 
                      className={onRowClick ? 'cursor-pointer hover:bg-accent/50' : ''}
                      onClick={() => onRowClick && onRowClick(row)}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell 
                          key={`${rowId || virtualRow.index}-${column.key}`}
                          style={{ width: column.width ? `${column.width}px` : 'auto' }}
                        >
                          {column.render ? column.render(row) : row[column.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                
                {isLoading && sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-96">
                      <div className="w-full h-full flex justify-center items-center">
                        <div className="space-y-2 w-full px-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="w-full h-12" />
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                {!isLoading && sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-96 text-center">
                      <div className="py-8 text-muted-foreground">No results found</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-sm text-muted-foreground">
        {isFetching && !isFetchingNextPage ? (
          <span>Refreshing data...</span>
        ) : (
          <span>
            Showing {sortedData.length} records {hasNextPage ? "(scroll for more)" : ""}
          </span>
        )}
      </div>
    </div>
  );
};

export default VirtualizedTable;
