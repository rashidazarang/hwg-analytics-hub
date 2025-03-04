import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
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
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { Agreement } from '@/lib/types';

type AgreementsTableProps = {
  dateRange: DateRange;
  dealerFilter: string; // This should be the UUID of the dealer
  dealerName?: string;  // This is the display name of the dealer
  searchQuery?: string;
};

const AgreementsTable: React.FC<AgreementsTableProps> = ({
  dateRange,
  dealerFilter, // This is the dealer UUID
  dealerName = '',
  searchQuery = ''
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [totalAgreements, setTotalAgreements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const columns: ColumnDef<Agreement>[] = [
    {
      accessorKey: 'AgreementID',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Agreement ID
            {column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />}
          </Button>
        );
      },
    },
    {
      accessorKey: 'AgreementStatus',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
            {column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />}
          </Button>
        );
      },
    },
    {
      accessorKey: 'EffectiveDate',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Effective Date
            {column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />}
          </Button>
        );
      },
    },
    {
      accessorKey: 'StatusChangeDate',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status Change Date
            {column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />}
          </Button>
        );
      },
    },
    {
      accessorKey: 'DealerUUID',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Dealer UUID
            {column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />}
          </Button>
        );
      },
    },
  ];

  const { data, isLoading: queryLoading, error } = useQuery({
    queryKey: ['agreements', dealerFilter, searchQuery, dateRange, pageIndex, pageSize],
    queryFn: async () => {
      console.log('Fetching agreements:', { pageIndex, pageSize });
      setIsLoading(true);

      try {
        const fromDate = dateRange.from?.toISOString() || "2020-01-01T00:00:00.000Z";
        const toDate = dateRange.to?.toISOString() || "2025-12-31T23:59:59.999Z";

        let query = supabase
          .from('agreements')
          .select('*', { count: 'exact' })
          .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
          .gte('EffectiveDate', fromDate)
          .lte('EffectiveDate', toDate);

        if (dealerFilter) {
          console.log(`Filtering agreements by dealer UUID: ${dealerFilter}`);
          query = query.eq('DealerUUID', dealerFilter);
        }

        if (searchQuery) {
          console.log(`Filtering agreements by search query: ${searchQuery}`);
          query = query.ilike('AgreementID', `%${searchQuery}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching agreements:', error);
          throw error;
        }

        const typedData = data as Agreement[];

        setAgreements(typedData || []);
        setTotalAgreements(count || 0);
        return {
          data: typedData || [],
          total: count || 0,
        };
      } catch (error) {
        console.error('Error processing agreement data:', error);
        return { data: [], total: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const table = useReactTable({
    data: agreements,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: state => {
      setPageIndex(state.pageIndex);
      setPageSize(state.pageSize);
    },
    state: {
      pagination: {
        pageIndex,
        pageSize,
      }
    },
    manualPagination: true,
    pageCount: Math.ceil(totalAgreements / pageSize),
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  Loading agreements...
                </TableCell>
              </TableRow>
            ) : agreements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No agreements found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {totalAgreements} total agreements
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgreementsTable;
