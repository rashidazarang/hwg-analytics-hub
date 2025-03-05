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
  agreements?: {
    DealerUUID?: string | null;
    dealers?: {
      PayeeID?: string | null;
      Payee?: string | null;
    } | null;
  } | null;
}
