
import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DealershipSearchInput from './DealershipSearchInput';
import DealershipSuggestions from './DealershipSuggestions';
import { useDealershipData } from '@/hooks/useDealershipData';
import { useIsMobile } from '@/hooks/use-mobile';

type DealershipSearchProps = {
  onDealershipSelect: (dealershipId: string, dealershipName: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

const DealershipSearch: React.FC<DealershipSearchProps> = ({
  onDealershipSelect,
  searchTerm,
  setSearchTerm
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>('');
  const [inputRect, setInputRect] = useState<DOMRect | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const {
    data: dealerships = [],
    isLoading: isLoadingDealerships
  } = useDealershipData();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    setShowSuggestions(true); // Always show suggestions when typing
    if (!searchValue.trim()) {
      setShowSuggestions(false); // Hide suggestions if the search field is empty
    }
    console.log('🔍 Search Term:', searchValue);
  };

  const filteredDealerships = dealerships.filter(dealership => 
    dealership.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (searchTerm) {
      const exactMatch = dealerships.find(dealership => 
        dealership.name?.toLowerCase() === searchTerm.toLowerCase()
      );
      
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
      invalidateQueries();
    } else {
      handleClearSearch();
    }
    
    setShowSuggestions(false);
  };

  const handleDealershipClick = (dealership: { id: string; name: string }) => {
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
    invalidateQueries();
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ['agreement-status-distribution'],
      exact: false
    });
    queryClient.invalidateQueries({
      queryKey: ['agreements-data'],
      exact: false
    });
  };

  // Update input rect when showing suggestions
  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      setInputRect(inputRef.current.getBoundingClientRect());
    }
  }, [showSuggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    // Add event listener with capture phase to ensure it fires before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  return (
    <div ref={searchContainerRef} className="relative w-full">
      <form onSubmit={(e) => handleSearchSubmit(e)} className="relative">
        <DealershipSearchInput
          searchTerm={searchTerm}
          isLoading={isLoadingDealerships}
          onChange={handleSearchChange}
          onFocus={() => setShowSuggestions(Boolean(searchTerm.trim()))}
          onClear={handleClearSearch}
          onSubmit={handleSearchSubmit}
          inputRef={inputRef}
        />
        
        <DealershipSuggestions
          showSuggestions={showSuggestions}
          isLoading={isLoadingDealerships}
          dealerships={dealerships}
          filteredDealerships={filteredDealerships}
          selectedDealershipId={selectedDealershipId}
          onDealershipClick={handleDealershipClick}
          inputRect={inputRect}
        />
      </form>
    </div>
  );
};

export default DealershipSearch;
