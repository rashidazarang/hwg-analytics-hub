
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "@/lib/dateUtils";
import {
  fetchAgreements,
  fetchClaims,
  fetchDealers,
  fetchDealerMetrics,
  fetchDashboardKPIs
} from "@/integrations/supabase/queries";

// Hook for fetching agreements with real-time updates
export function useAgreements(filters: {
  dateRange?: DateRange;
  status?: string;
  dealerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["agreements", filters],
    queryFn: () => fetchAgreements(filters),
  });

  // Set up real-time listener for agreements table
  useEffect(() => {
    const channel = supabase
      .channel("public:agreements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agreements" },
        () => {
          // Invalidate and refetch agreements data
          queryClient.invalidateQueries({ queryKey: ["agreements"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook for fetching claims with real-time updates
export function useClaims(filters: {
  dateRange?: DateRange;
  status?: string;
  dealerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["claims", filters],
    queryFn: () => fetchClaims(filters),
  });

  // Set up real-time listener for claims table
  useEffect(() => {
    const channel = supabase
      .channel("public:claims")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () => {
          // Invalidate and refetch claims data
          queryClient.invalidateQueries({ queryKey: ["claims"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook for fetching dealers with real-time updates
export function useDealers(filters: {
  location?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["dealers", filters],
    queryFn: () => fetchDealers(filters),
  });

  // Set up real-time listener for dealers table
  useEffect(() => {
    const channel = supabase
      .channel("public:dealers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dealers" },
        () => {
          // Invalidate and refetch dealers data
          queryClient.invalidateQueries({ queryKey: ["dealers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

// Hook for fetching dealer metrics
export function useDealerMetrics(dealerId: string) {
  return useQuery({
    queryKey: ["dealerMetrics", dealerId],
    queryFn: () => fetchDealerMetrics(dealerId),
    enabled: !!dealerId,
  });
}

// Hook for fetching dashboard KPIs
export function useDashboardKPIs(dateRange?: DateRange) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["dashboardKPIs", dateRange],
    queryFn: () => fetchDashboardKPIs(dateRange),
  });

  // Set up real-time listeners for tables that affect KPIs
  useEffect(() => {
    const agreementsChannel = supabase
      .channel("public:agreements-kpis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agreements" },
        () => {
          // Invalidate and refetch KPI data
          queryClient.invalidateQueries({ queryKey: ["dashboardKPIs"] });
        }
      )
      .subscribe();

    const claimsChannel = supabase
      .channel("public:claims-kpis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () => {
          // Invalidate and refetch KPI data
          queryClient.invalidateQueries({ queryKey: ["dashboardKPIs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(agreementsChannel);
      supabase.removeChannel(claimsChannel);
    };
  }, [queryClient]);

  return query;
}
