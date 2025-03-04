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
  openClaimsCount: number;
}

export interface Agreement {
  id: string;
  AgreementID: string;
  AgreementStatus: string;
  EffectiveDate: string;
  StatusChangeDate: string;
  DealerUUID?: string;
}

export interface Claim {
  id: string;
  ClaimID: string;
  ClaimStatus: string;
  ReportedDate: string;
  ClaimAmount: number;
  VIN: string;
  DealerName: string;
  AgreementID: string;
  Cause?: string;
  CauseID?: string;
  Complaint?: string;
  ComplaintID?: string;
  Correction?: string;
  CorrectionID?: string;
  Deductible?: number;
  IncurredDate?: string;
  LastModified?: string;
  Closed?: string;
}
