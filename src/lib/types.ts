
export interface KPIData {
  activeAgreements: number;
  totalAgreements: number;
  openClaims: number;
  totalClaims: number;
  activeDealers: number;
  totalDealers: number;
  averageClaimAmount: number;
  totalClaimsAmount: number;
  pendingContracts: number;
  newlyActiveContracts: number;
  cancelledContracts: number;
  statusBreakdown?: {
    OPEN: number;
    PENDING: number;
    CLOSED: number;
  };
}

export interface Agreement {
  id: string;
  AgreementID: string;
  HolderFirstName?: string | null;
  HolderLastName?: string | null;
  DealerUUID?: string | null;
  DealerID?: string | null;
  EffectiveDate?: string | null;
  ExpireDate?: string | null;
  AgreementStatus?: string | null;
  Total?: number | null;
  DealerCost?: number | null;
  ReserveAmount?: number | null;
  StatusChangeDate?: string | null;
  dealers?: {
    Payee?: string | null;
    PayeeID?: string | null;
  } | null;
}

export interface Claim {
  id: string;
  ClaimID: string;
  AgreementID: string;
  ReportedDate?: Date | string | null;
  IncurredDate?: Date | string | null;
  Closed?: Date | string | null;
  Complaint?: string | null;
  Cause?: string | null;
  Correction?: string | null;
  Deductible?: number | null;
  CauseID?: string | null;
  CorrectionID?: string | null;
  ComplaintID?: string | null;
  LastModified?: string | null;
  totalPaid?: number | null;
  lastPaymentDate?: Date | string | null;
  agreements?: {
    DealerUUID?: string | null;
    dealers?: {
      PayeeID?: string | null;
      Payee?: string | null;
    } | null;
  } | null;
}

export interface TopAgent {
  agent_name: string;
  contracts_closed: number;
  total_revenue: number;
  cancelled_contracts: number;
}

export interface TopDealer {
  dealer_name: string;
  total_contracts: number;
  total_revenue: number;
  cancelled_contracts: number;
  pending_contracts?: number;
  active_contracts?: number;
  expected_revenue?: number; // Revenue from pending agreements
  funded_revenue?: number;   // Revenue from active agreements
}

export interface TopDealerClaims {
  dealer_name: string;
  open_claims: number;
  pending_claims: number;
  closed_claims: number;
  total_claims: number;
}

export interface RevenueGrowth {
  current_revenue: number;
  previous_revenue: number;
  growth_rate: number;
}

export interface LeaderboardSummary {
  active_contracts: number;
  total_revenue: number;
  cancellation_rate: number;
  top_dealer: string;
  top_agent: string;
}
