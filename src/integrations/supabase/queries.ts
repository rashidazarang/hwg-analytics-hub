
import { supabase } from "./client";
import { DateRange } from "@/lib/dateUtils";

// Fetch Agreements with filtering
export async function fetchAgreements({
  dateRange,
  status,
  dealerId,
  page = 1,
  pageSize = 10
}: {
  dateRange?: DateRange;
  status?: string;
  dealerId?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = supabase.from("agreements").select("*", { count: "exact" });

  // Apply date range filter if provided
  if (dateRange?.from && dateRange?.to) {
    query = query
      .gte("EffectiveDate", dateRange.from.toISOString())
      .lte("EffectiveDate", dateRange.to.toISOString());
  }

  // Apply status filter if provided
  if (status) {
    query = query.eq("AgreementStatus", status);
  }

  // Apply dealer filter if provided
  if (dealerId) {
    query = query.eq("DealerUUID", dealerId);
  }

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching agreements:", error);
    throw error;
  }

  return { data, count };
}

// Fetch Claims with filtering
export async function fetchClaims({
  dateRange,
  status,
  dealerId,
  page = 1,
  pageSize = 10
}: {
  dateRange?: DateRange;
  status?: string;
  dealerId?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = supabase.from("claims").select("*", { count: "exact" });

  // Apply date range filter if provided
  if (dateRange?.from && dateRange?.to) {
    query = query
      .gte("ReportedDate", dateRange.from.toISOString())
      .lte("ReportedDate", dateRange.to.toISOString());
  }

  // Apply status filter if provided
  if (status) {
    query = query.eq("Status", status);
  }

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching claims:", error);
    throw error;
  }

  return { data, count };
}

// Fetch Dealers
export async function fetchDealers({
  location,
  page = 1,
  pageSize = 100
}: {
  location?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  let query = supabase.from("dealers").select("*", { count: "exact" });

  // Apply location filter if provided
  if (location) {
    query = query.or(`City.ilike.%${location}%,Region.ilike.%${location}%,Country.ilike.%${location}%`);
  }

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching dealers:", error);
    throw error;
  }

  return { data, count };
}

// Fetch aggregated dealer metrics
export async function fetchDealerMetrics(dealerId: string) {
  // Get active agreements count
  const { data: activeAgreements, error: agreementError } = await supabase
    .from("agreements")
    .select("id")
    .eq("DealerUUID", dealerId)
    .eq("AgreementStatus", "ACTIVE");

  // Get total claims count
  const { data: totalClaims, error: claimsError } = await supabase
    .from("claims")
    .select("id, Deductible")
    .eq("DealerUUID", dealerId);

  // Get total revenue
  const { data: totalRevenue, error: revenueError } = await supabase
    .from("agreements")
    .select("Total")
    .eq("DealerUUID", dealerId);

  if (agreementError || claimsError || revenueError) {
    console.error("Error fetching dealer metrics:", agreementError || claimsError || revenueError);
    throw agreementError || claimsError || revenueError;
  }

  // Calculate metrics
  const activeAgreementsCount = activeAgreements?.length || 0;
  const totalClaimsCount = totalClaims?.length || 0;
  
  // Sum up total revenue
  const revenue = totalRevenue?.reduce((sum: number, agreement: any) => sum + (agreement.Total || 0), 0) || 0;
  
  // Sum up total payouts (assume a payout amount in claims)
  const payouts = totalClaims?.reduce((sum: number, claim: any) => sum + (claim.Deductible || 0), 0) || 0;

  return {
    activeAgreements: activeAgreementsCount,
    totalClaims: totalClaimsCount,
    totalRevenue: revenue,
    totalPayouts: payouts
  };
}

// Calculate KPIs based on data
export async function fetchDashboardKPIs(dateRange?: DateRange) {
  try {
    // Get active agreements count
    const { data: activeAgreements, error: activeAgreementsError } = await supabase
      .from("agreements")
      .select("id")
      .eq("AgreementStatus", "ACTIVE");

    // Get total agreements count
    const { data: totalAgreements, error: totalAgreementsError } = await supabase
      .from("agreements")
      .select("id");

    // Get open claims count
    const { data: openClaims, error: openClaimsError } = await supabase
      .from("claims")
      .select("id");

    // Get total claims amount
    const { data: claims, error: claimsError } = await supabase
      .from("claims")
      .select("Deductible");

    // Get active dealers count
    const { data: dealers, error: dealersError } = await supabase
      .from("dealers")
      .select("DealerUUID");

    if (activeAgreementsError || totalAgreementsError || openClaimsError || claimsError || dealersError) {
      console.error("Error fetching KPIs:", 
        activeAgreementsError || totalAgreementsError || openClaimsError || claimsError || dealersError);
      throw activeAgreementsError || totalAgreementsError || openClaimsError || claimsError || dealersError;
    }

    // Calculate metrics
    const activeAgreementsCount = activeAgreements?.length || 0;
    const totalAgreementsCount = totalAgreements?.length || 0;
    const openClaimsCount = openClaims?.length || 0;
    const activeDealersCount = dealers?.length || 0;
    
    // Sum up total claims amount
    const totalClaimsAmount = claims?.reduce((sum: number, claim: any) => sum + (claim.Deductible || 0), 0) || 0;
    
    // Calculate average claim amount
    const averageClaimAmount = claims && claims.length > 0 ? totalClaimsAmount / claims.length : 0;

    return {
      activeAgreements: activeAgreementsCount,
      totalAgreements: totalAgreementsCount,
      openClaims: openClaimsCount,
      totalClaims: claims?.length || 0,
      activeDealers: activeDealersCount,
      totalClaimsAmount,
      averageClaimAmount
    };
  } catch (error) {
    console.error("Error calculating KPIs:", error);
    throw error;
  }
}
