
import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
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
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-4 w-4 text-primary/70 animate-spin" />
        ) : (
          <Search className="h-4 w-4 text-primary/70" />
        )}
      </div>
      
      <Input 
        type="text" 
        placeholder={isLoading ? "Loading dealerships..." : "Search dealerships..."} 
        value={searchTerm} 
        onChange={onChange} 
        onFocus={onFocus} 
        autoComplete="off" 
        disabled={isLoading} 
        className="pl-10 pr-20 w-full h-10 text-sm border-input/40 focus:border-primary/50 search-field rounded-lg shadow-sm mx-0 my-0 bg-white/95 backdrop-blur-sm transition-all duration-200 hover:border-input/60 focus:shadow-md" 
      />
      
      <div className="absolute inset-y-0 right-0 flex items-center">
        {searchTerm && (
          <button 
            type="button" 
            onClick={onClear} 
            className="flex items-center justify-center w-10 h-full cursor-pointer" 
            aria-label="Clear search" 
            title="Clear search"
          >
            <div className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted/70 transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </div>
          </button>
        )}
        
        {!isLoading && (
          <button 
            type="button"
            onClick={onSubmit}
            className="flex items-center justify-center w-10 h-full cursor-pointer" 
            aria-label="Search" 
            title="Search"
          >
            <div className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-primary/10 transition-colors duration-200">
              <Search className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default DealershipSearchInput;
