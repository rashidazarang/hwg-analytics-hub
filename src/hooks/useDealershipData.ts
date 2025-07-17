
import { useQuery } from '@tanstack/react-query';
import { supabase, shouldUseMockData } from '@/integrations/supabase/client';
import MockDataService from '@/lib/mockDataService';

type Dealership = {
  id: string;
  name: string;
};

export const useDealershipData = () => {
  const fetchDealershipNames = async (): Promise<Dealership[]> => {
    // Use mock data in development mode
    if (shouldUseMockData()) {
      console.log('🔍 Using mock dealership data in development mode');
      const dealers = MockDataService.getDealersData();
      return dealers.map(dealer => ({
        id: dealer.DealerUUID,
        name: dealer.Payee
      }));
    }

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
      return [];
    }
  };

  return useQuery({
    queryKey: ['dealership-names'],
    queryFn: fetchDealershipNames,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
    refetchOnWindowFocus: false
  });
};
