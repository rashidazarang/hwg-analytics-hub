
import React from 'react';
import { Store, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type DealershipSuggestionsProps = {
  showSuggestions: boolean;
  isLoading: boolean;
  dealerships: Array<{ id: string; name: string }>;
  filteredDealerships: Array<{ id: string; name: string }>;
  selectedDealershipId: string;
  onDealershipClick: (dealership: { id: string; name: string }) => void;
};

const DealershipSuggestions: React.FC<DealershipSuggestionsProps> = ({
  showSuggestions,
  isLoading,
  dealerships,
  filteredDealerships,
  selectedDealershipId,
  onDealershipClick
}) => {
  if (!showSuggestions) return null;

  return (
    <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg border border-border/20 z-10 max-h-60 overflow-auto animate-fade-in">
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-muted-foreground flex items-center justify-center">
          <Loader2 className="mr-2 animate-spin h-4 w-4 text-primary/50" />
          Loading dealerships...
        </div>
      ) : filteredDealerships.length > 0 ? (
        <div className="py-1">
          {filteredDealerships.slice(0, 10).map(dealership => (
            <div 
              key={dealership.id} 
              className={cn(
                "px-4 py-2.5 text-sm hover:bg-accent/50 cursor-pointer transition-colors duration-150 flex items-center gap-2",
                selectedDealershipId === dealership.id ? "bg-primary/10 text-primary" : ""
              )} 
              onClick={() => onDealershipClick(dealership)}
            >
              <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{dealership.name}</span>
            </div>
          ))}
          {filteredDealerships.length > 10 && (
            <div className="px-4 py-2 text-xs text-muted-foreground italic bg-muted/20">
              {filteredDealerships.length - 10} more results...
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 text-sm text-muted-foreground flex items-center justify-center">
          No dealerships found
        </div>
      )}
    </div>
  );
};

export default DealershipSuggestions;
