
import React from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type DealershipSearchInputProps = {
  searchTerm: string;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

const DealershipSearchInput: React.FC<DealershipSearchInputProps> = ({
  searchTerm,
  isLoading,
  onChange,
  onFocus,
  onClear,
  onSubmit
}) => {
  return (
    <div className="relative">
      {/* Left side: Always show search icon or loader */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-primary/70 animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Input Field */}
      <Input 
        type="text" 
        placeholder={isLoading ? "Loading..." : "Search dealerships..."} 
        value={searchTerm} 
        onChange={onChange} 
        onFocus={onFocus} 
        autoComplete="off" 
        disabled={isLoading} 
        className="pl-9 pr-8 w-full h-9 text-sm rounded-md border-input/40 bg-background/95 shadow-sm hover:border-input/60 focus:border-primary/50 focus:shadow-md transition-all duration-200" 
      />

      {/* Right side: Show "X" when a dealership is selected, show search icon otherwise */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
        {searchTerm ? (
          <button 
            type="button" 
            onClick={onClear} 
            className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-muted/70 transition-colors duration-200"
            aria-label="Clear search" 
            title="Clear search"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        ) : (
          <button 
            type="button"
            onClick={onSubmit}
            className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-primary/10 transition-colors duration-200" 
            aria-label="Search" 
            title="Search"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DealershipSearchInput;
