
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Store, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DealershipSearchProps = {
  onDealershipSelect: (dealershipId: string, dealershipName: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

const fetchDealershipNames = async (): Promise<{
  id: string;
  name: string;
}[]> => {
  console.log('🔍 Fetching dealership names from Supabase...');
  try {
    const PAGE_SIZE = 1000;
    let allDealers: any[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const {
        data,
        error
      } = await supabase.from('dealers').select('DealerUUID, PayeeID, Payee').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) {
        console.error('❌ Error fetching dealerships:', error);
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
    const dealerships = allDealers.filter(dealer => dealer.Payee && dealer.Payee.trim() !== '').map(dealer => ({
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

  const {
    data: dealerships = [],
    isLoading: isLoadingDealerships
  } = useQuery({
    queryKey: ['dealership-names'],
    queryFn: fetchDealershipNames,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false
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

  const filteredDealerships = dealerships.filter(dealership => dealership.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      const exactMatch = dealerships.find(dealership => dealership.name?.toLowerCase() === searchTerm.toLowerCase());
      if (exactMatch) {
        console.log(`🎯 DealershipSearch: Found exact match - UUID: "${exactMatch.id}", Name: "${exactMatch.name}"`);
        handleDealershipSelect(exactMatch.id, exactMatch.name);
      } else if (filteredDealerships.length > 0) {
        console.log(`🎯 DealershipSearch: Using first match - UUID: "${filteredDealerships[0].id}", Name: "${filteredDealerships[0].name}"`);
        handleDealershipSelect(filteredDealerships[0].id, filteredDealerships[0].name);
      } else {
        handleClearSearch();
      }
    } else {
      handleClearSearch();
    }
    setShowSuggestions(false);
  };

  const handleDealershipSelect = (value: string, name: string = '') => {
    let dealerName = name;
    if (!dealerName && value) {
      const selected = dealerships.find(d => d.id === value);
      dealerName = selected?.name || '';
    }
    setSelectedDealershipId(value);
    if (value && dealerName) {
      setSearchTerm(dealerName);
      console.log(`🎯 DealershipSearch: Selected dealership - UUID: "${value}", Name: "${dealerName}"`);
      onDealershipSelect(value, dealerName);
      queryClient.invalidateQueries({
        queryKey: ['agreement-status-distribution'],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['agreements-data'],
        exact: false
      });
    } else {
      handleClearSearch();
    }
    setShowSuggestions(false);
  };

  const handleDealershipClick = (dealership: {
    id: string;
    name: string;
  }) => {
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

  return <div ref={searchContainerRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            {isLoadingDealerships ? (
              <Loader2 className="h-4 w-4 text-primary/70 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-primary/70" />
            )}
          </div>
          
          <Input 
            type="text" 
            placeholder={isLoadingDealerships ? "Loading dealerships..." : "Search dealerships..."} 
            value={searchTerm} 
            onChange={handleSearchChange} 
            onFocus={() => setShowSuggestions(Boolean(searchTerm.trim()))} 
            autoComplete="off" 
            disabled={isLoadingDealerships} 
            className="pl-10 pr-9 w-full h-10 text-sm border-input/40 focus:border-primary/50 search-field rounded-lg shadow-sm mx-0 my-0 bg-white/95 backdrop-blur-sm transition-all duration-200 hover:border-input/60 focus:shadow-md" 
          />
          
          {searchTerm && (
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button 
                type="button" 
                onClick={handleClearSearch} 
                className="flex items-center justify-center w-10 h-full cursor-pointer" 
                aria-label="Clear search" 
                title="Clear search"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted/70 transition-colors duration-200">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </div>
              </button>
            </div>
          )}
        </div>
        
        {showSuggestions && (
          <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg border border-border/20 z-10 max-h-60 overflow-auto animate-fade-in">
            {isLoadingDealerships ? (
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
                    onClick={() => handleDealershipClick(dealership)}
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
        )}
      </form>
    </div>;
};

export default DealershipSearch;
