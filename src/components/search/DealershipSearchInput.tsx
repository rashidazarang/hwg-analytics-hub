
import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

type DealershipSearchInputProps = {
  searchTerm: string;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onClear: () => void;
  onSubmit: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
};

const DealershipSearchInput: React.FC<DealershipSearchInputProps> = ({
  searchTerm,
  isLoading,
  onChange,
  onFocus,
  onClear,
  onSubmit,
  inputRef
}) => {
  return (
    <div className="relative">
      {/* Left side: Always show search icon or loader */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-2 xs:pl-3 pointer-events-none text-muted-foreground">
        {isLoading ? (
          <Loader2 className="h-3.5 xs:h-4 w-3.5 xs:w-4 text-primary/70 animate-spin" />
        ) : (
          // Using provided SVG for search icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 xs:h-3.5 w-3 xs:w-3.5 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
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
        className="pl-7 xs:pl-10 pr-7 xs:pr-10 w-full h-7 xs:h-8 text-xs xs:text-sm border-input/40 focus:border-primary/50 search-field rounded-lg shadow-sm bg-white/95 backdrop-blur-sm transition-all duration-200 hover:border-input/60 focus:shadow-md" 
        ref={inputRef}
      />

      {/* Right side: Show "X" when a dealership is selected, show search icon otherwise */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 xs:pr-3">
        {searchTerm ? (
          <button 
            type="button" 
            onClick={onClear} 
            className="flex items-center justify-center w-4 xs:w-5 h-full cursor-pointer" 
            aria-label="Clear search" 
            title="Clear search"
          >
            <div className="flex items-center justify-center h-4 xs:h-5 w-4 xs:w-5 rounded-full hover:bg-muted/70 transition-colors duration-200">
              <X className="h-3 xs:h-3.5 w-3 xs:w-3.5 text-muted-foreground hover:text-foreground" />
            </div>
          </button>
        ) : (
          <button 
            type="button"
            onClick={onSubmit}
            className="flex items-center justify-center w-4 xs:w-5 h-full cursor-pointer" 
            aria-label="Search" 
            title="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 xs:h-3.5 w-3 xs:w-3.5 text-muted-foreground hover:text-primary"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default DealershipSearchInput;
