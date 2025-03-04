
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
  } | null;
}

export interface Claim {
  id: string;
  ClaimID: string;
  ClaimStatus: string;
  ClaimAmount: number;
  VIN: string;
  DealerName: string;
  AgreementID: string;
  Cause?: string | null;
  CauseID?: string | null;
  Closed?: string | null;
  Complaint?: string | null;
  ComplaintID?: string | null;
  Correction?: string | null;
  CorrectionID?: string | null;
  Deductible?: number | null;
  IncurredDate?: string | null;
  LastModified?: string | null;
  ReportedDate?: string | null;
}
