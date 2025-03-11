import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { Agreement } from '@/lib/types';
import { toast } from 'sonner';

export interface AgreementsQueryResult {
  data: Agreement[];
  count: number;
}

/**
 * Search for agreements by ID (AgreementID)
 * This function bypasses all other filters and directly searches for agreements by ID
 */
export async function searchAgreementById(searchTerm: string): Promise<AgreementsQueryResult> {
  try {
    console.log(`🔍 Searching for agreement with ID: "${searchTerm}"`);
    
    if (!searchTerm || searchTerm.trim().length < 3) {
      console.warn("⚠️ Search term is too short, minimum 3 characters required");
      return { data: [], count: 0 };
    }
    
    const term = searchTerm.trim();
    
    // Query for agreements matching the ID
    const { data, error, count } = await supabase
      .from("agreements")
      .select(`
        id, 
        AgreementID, 
        HolderFirstName, 
        HolderLastName, 
        DealerUUID, 
        DealerID, 
        EffectiveDate, 
        ExpireDate, 
        AgreementStatus, 
        Total, 
        DealerCost, 
        ReserveAmount,
        StatusChangeDate,
        dealers(Payee)
      `, { count: 'exact' })
      .ilike('AgreementID', `%${term}%`)
      .order("EffectiveDate", { ascending: false })
      .limit(100);
    
    if (error) {
      console.error("❌ Error searching for agreement by ID:", error);
      toast.error("Failed to search for agreement");
      return { data: [], count: 0 };
    }
    
    console.log(`✅ Found ${data.length} agreements matching ID "${term}"`);
    console.log(`✅ Total count: ${count || 0}`);
    
    return { 
      data: data as unknown as Agreement[] || [], 
      count: count || 0 
    };
  } catch (error) {
    console.error("❌ Exception in searchAgreementById:", error);
    toast.error("An unexpected error occurred while searching for agreement");
    return { data: [], count: 0 };
  }
}

/**
 * React Query hook for searching agreements by ID
 */
export function useSearchAgreementById(searchTerm: string) {
  return useQuery({
    queryKey: ['agreements-search-by-id', searchTerm],
    queryFn: () => searchAgreementById(searchTerm),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false, // Don't retry if the query fails
    enabled: !!searchTerm && searchTerm.length >= 3, // Only enable if search term is at least 3 characters
  });
} 