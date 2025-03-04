import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DealershipSearchProps = {
  onDealershipSelect: (dealershipId: string, dealershipName: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

const fetchDealershipNames = async (): Promise<{id: string, name: string}[]> => {
  console.log('🔍 Fetching dealership names from Supabase...');
  
  try {
    const PAGE_SIZE = 1000;
    let allDealers: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('dealers')
        .select('DealerUUID, PayeeID, Payee')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (error) {
        console.error('❌ Error fetching dealerships:', error);
        toast.error("Failed to load dealerships. Please try again.");
        return [];
      }
      
      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }
      
      allDealers = [...allDealers, ...data];
      
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    const dealerships = allDealers
      .filter(dealer => dealer.Payee && dealer.Payee.trim() !== '')
      .map(dealer => ({
        id: dealer.DealerUUID,
        name: dealer.Payee
      }));
    
    console.log(`✅ Successfully fetched ${dealerships.length} dealerships`);
    
    if (dealerships.length > 0) {
      console.log('📋 Sample dealerships:', dealerships.slice(0, 5));
    } else {
      console.warn('⚠️ No dealerships found in the database');
    }
    
    return dealerships;
  } catch (err) {
    console.error('❌ Exception when fetching dealerships:', err);
    toast.error("An error occurred while loading dealerships");
    return [];
  }
};

const DealershipSearch: React.FC<DealershipSearchProps> = ({
  onDealershipSelect,
  searchTerm,
  setSearchTerm
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: dealerships = [], isLoading: isLoadingDealerships } = useQuery({
    queryKey: ['dealership-names'],
    queryFn: fetchDealershipNames,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    setShowSuggestions(Boolean(searchValue.trim()));
    
    if (!searchValue.trim()) {
      handleClearSearch();
    }
    
    console.log('🔍 Search Term:', searchValue);
  };

  const filteredDealerships = dealerships.filter(dealership => 
    dealership.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm) {
      // First try exact match
      const exactMatch = dealerships.find(dealership => 
        dealership.name?.toLowerCase() === searchTerm.toLowerCase()
      );
      
      if (exactMatch) {
        console.log(`🎯 DealershipSearch: Found exact match - UUID: "${exactMatch.id}", Name: "${exactMatch.name}"`);
        handleDealershipSelect(exactMatch.id, exactMatch.name);
      } else if (filteredDealerships.length > 0) {
        // If no exact match, use the first filtered result
        console.log(`🎯 DealershipSearch: Using first match - UUID: "${filteredDealerships[0].id}", Name: "${filteredDealerships[0].name}"`);
        handleDealershipSelect(filteredDealerships[0].id, filteredDealerships[0].name);
      } else {
        toast.info("No matching dealerships found");
        handleClearSearch();
      }
    } else {
      handleClearSearch();
    }
    
    setShowSuggestions(false);
  };

  const handleDealershipSelect = (value: string, name: string = '') => {
    // Get the actual name if not provided
    let dealerName = name;
    if (!dealerName && value) {
      const selected = dealerships.find(d => d.id === value);
      dealerName = selected?.name || '';
    }
    
    setSelectedDealershipId(value);
    
    if (value && dealerName) {
      setSearchTerm(dealerName);
      console.log(`🎯 DealershipSearch: Selected dealership - UUID: "${value}", Name: "${dealerName}"`);
      onDealershipSelect(value, dealerName); // Pass the UUID as value, and name separately
      
      // Invalidate the queries that depend on dealer filter
      queryClient.invalidateQueries({
        queryKey: ['agreement-status-distribution'],
        exact: false
      });
      
      queryClient.invalidateQueries({
        queryKey: ['agreements-data'],
        exact: false
      });
      
      toast.success(`Filtered to dealership: ${dealerName}`);
    } else {
      handleClearSearch();
    }
    
    setShowSuggestions(false);
  };

  const handleDealershipClick = (dealership: {id: string, name: string}) => {
    console.log(`🎯 DealershipSearch: Clicked dealership - UUID: "${dealership.id}", Name: "${dealership.name}"`);
    setSearchTerm(dealership.name);
    handleDealershipSelect(dealership.id, dealership.name);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    console.log('🧹 DealershipSearch: Clearing dealership filter');
    onDealershipSelect('', '');
    setSelectedDealershipId('');
    setShowSuggestions(false);
    
    queryClient.invalidateQueries({
      queryKey: ['agreement-status-distribution'],
      exact: false
    });
    
    queryClient.invalidateQueries({
      queryKey: ['agreements-data'],
      exact: false
    });
    
    if (searchTerm) {
      toast.info("Cleared dealership filter");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={searchContainerRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <Input
          type="text"
          placeholder={isLoadingDealerships ? "Loading dealerships..." : "Search dealerships..."}
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setShowSuggestions(Boolean(searchTerm.trim()))}
          className="pl-8 pr-10 w-full h-9 text-sm bg-muted/30 border-border/30 focus-visible:border-primary/30"
          autoComplete="off"
          disabled={isLoadingDealerships}
        />
        
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-0 top-0 h-full flex items-center justify-center w-10 cursor-pointer"
            aria-label="Clear search"
            title="Clear search"
          >
            <div className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors duration-200">
              <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
          </button>
        )}
        
        <Button 
          type="submit" 
          variant="ghost" 
          size="sm" 
          className="absolute right-8 inset-y-0 px-2 opacity-0"
          disabled={isLoadingDealerships}
        >
          <Search className="h-4 w-4" />
        </Button>
        
        {showSuggestions && (
          <div className="absolute mt-1 w-full rounded-md shadow-lg bg-popover z-10 max-h-60 overflow-auto">
            {isLoadingDealerships ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Loading dealerships...
              </div>
            ) : filteredDealerships.length > 0 ? (
              <div className="py-1">
                {filteredDealerships.slice(0, 10).map(dealership => (
                  <div
                    key={dealership.id}
                    className={cn(
                      "px-4 py-2 text-sm hover:bg-accent cursor-pointer",
                      selectedDealershipId === dealership.id && "bg-accent"
                    )}
                    onClick={() => handleDealershipClick(dealership)}
                  >
                    {dealership.name}
                  </div>
                ))}
                {filteredDealerships.length > 10 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground italic">
                    {filteredDealerships.length - 10} more results...
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No dealerships found
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default DealershipSearch;
