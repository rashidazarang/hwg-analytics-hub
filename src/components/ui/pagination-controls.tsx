
import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { PaginationProps } from '@/lib/types';

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startItem,
  endItem,
  onPageChange,
  onPageSizeChange
}: PaginationProps) {
  // Generate array of page numbers to display
  const pageNumbers = React.useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex logic for larger page counts
      const leftBound = Math.max(1, currentPage - 2);
      const rightBound = Math.min(totalPages, currentPage + 2);
      
      // Always show first page
      if (leftBound > 1) {
        pages.push(1);
        // Add ellipsis if needed
        if (leftBound > 2) {
          pages.push(-1); // -1 represents ellipsis
        }
      }
      
      // Add pages around current page
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }
      
      // Always show last page
      if (rightBound < totalPages) {
        // Add ellipsis if needed
        if (rightBound < totalPages - 1) {
          pages.push(-2); // -2 represents ellipsis (different key from first one)
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="hidden sm:flex"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            // Render ellipsis
            if (page < 0) {
              return (
                <span key={page} className="px-2 py-1 text-muted-foreground">
                  ...
                </span>
              );
            }
            
            // Render page number
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className="hidden sm:flex min-w-[32px] h-8"
              >
                {page}
              </Button>
            );
          })}
        </div>

        <div className="flex sm:hidden items-center gap-1 px-2">
          Page {currentPage} of {totalPages}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          className="hidden sm:flex"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
        
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(parseInt(value))}
        >
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Page size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
