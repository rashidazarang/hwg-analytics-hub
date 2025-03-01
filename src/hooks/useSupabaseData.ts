
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "@/lib/dateUtils";
import {
  fetchAgreements,
  fetchClaims,
  fetchDealers,
  fetchDealerMetrics,
  fetchDashboardKPIs
} from "@/integrations/supabase/queries";

// Hook for fetching agreements
export function useAgreements(filters: {
  dateRange?: DateRange;
  status?: string;
  dealerId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["agreements", filters],
    queryFn: () => fetchAgreements(filters),
    staleTime: 3600000, // Refresh once per hour (data updates infrequently)
  });
}

// Hook for fetching claims
export function useClaims(filters: {
  dateRange?: DateRange;
  status?: string;
  dealerId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["claims", filters],
    queryFn: () => fetchClaims(filters),
    staleTime: 3600000, // Refresh once per hour
  });
}

// Hook for fetching dealers
export function useDealers(filters: {
  location?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return useQuery({
    queryKey: ["dealers", filters],
    queryFn: () => fetchDealers(filters),
    staleTime: 3600000, // Refresh once per hour
  });
}

// Hook for fetching dealer metrics
export function useDealerMetrics(dealerId: string) {
  return useQuery({
    queryKey: ["dealerMetrics", dealerId],
    queryFn: () => fetchDealerMetrics(dealerId),
    enabled: !!dealerId,
    staleTime: 3600000, // Refresh once per hour
  });
}

// Hook for fetching dashboard KPIs
export function useDashboardKPIs(dateRange?: DateRange) {
  return useQuery({
    queryKey: ["dashboardKPIs", dateRange],
    queryFn: () => fetchDashboardKPIs(dateRange),
    staleTime: 3600000, // Refresh once per hour
  });
}
