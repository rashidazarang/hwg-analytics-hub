
import { supabase } from "./client";
import { DateRange } from "@/lib/dateUtils";

// Type definitions to ensure proper typing
export type AgreementResponse = {
  AgreementID: string;
  AgreementNumber: string | null;
  AgreementStatus: string | null;
  DealerCost: number | null;
  DealerID: string | null;
  DealerUUID: string | null;
  DocumentURL: string | null;
  EffectiveDate: string | null;
  ExpireDate: string | null;
  HolderEmail: string | null;
  HolderFirstName: string | null;
  HolderLastName: string | null;
  id: string;
  IsActive: boolean | null;
  Md5: string;
  ReserveAmount: number | null;
  StatusChangeDate: string | null;
  Total: number | null;
};

export type ClaimResponse = {
  AgreementID: string;
  Cause: string | null;
  CauseID: string | null;
  ClaimID: string;
  Closed: string | null;
  Complaint: string | null;
  ComplaintID: string | null;
  Correction: string | null;
  CorrectionID: string | null;
  Deductible: number | null;
  id: string;
  IncurredDate: string | null;
  LastModified: string | null;
  ReportedDate: string | null;
};

export type DealerResponse = {
  Address: string | null;
  City: string | null;
  Contact: string | null;
  Country: string | null;
  DealerUUID: string;
  EMail: string | null;
  Fax: string | null;
  Payee: string | null;
  PayeeID: string;
  PayeeType: string | null;
  Phone: string | null;
  PostalCode: string | null;
  Region: string | null;
};

// Transformed types with proper Date objects
export type Agreement = Omit<AgreementResponse, 'EffectiveDate' | 'ExpireDate' | 'StatusChangeDate'> & {
  EffectiveDate: Date | null;
  ExpireDate: Date | null;
  StatusChangeDate: Date | null;
};

export type Claim = Omit<ClaimResponse, 'ReportedDate' | 'IncurredDate' | 'LastModified' | 'Closed'> & {
  ReportedDate: Date | null;
  IncurredDate: Date | null;
  LastModified: Date | null;
  Closed: Date | null;
};

export type Dealer = DealerResponse;

export type QueryResult<T> = {
  data: T[];
  count: number | null;
};

// Utility function to convert date strings to Date objects
const convertDateStringsToDate = <T extends object, K extends keyof T>(
  obj: T,
  dateFields: K[]
): T => {
  const result = { ...obj };
  dateFields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = new Date(result[field] as string) as any;
    } else {
      result[field] = null as any;
    }
  });
  return result;
};

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
}): Promise<QueryResult<Agreement>> {
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

  const dateFields: (keyof AgreementResponse)[] = ['EffectiveDate', 'ExpireDate', 'StatusChangeDate'];
  
  return { 
    data: data.map(agreement => 
      convertDateStringsToDate(agreement, dateFields) as unknown as Agreement
    ), 
    count 
  };
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
}): Promise<QueryResult<Claim>> {
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

  const dateFields: (keyof ClaimResponse)[] = ['ReportedDate', 'IncurredDate', 'LastModified', 'Closed'];
  
  return { 
    data: data.map(claim => 
      convertDateStringsToDate(claim, dateFields) as unknown as Claim
    ), 
    count 
  };
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
} = {}): Promise<QueryResult<Dealer>> {
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
