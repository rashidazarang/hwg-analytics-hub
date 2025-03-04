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
  // Other fields...
}

export interface Claim {
  id: string;
  ClaimID: string;
  ClaimStatus: string;
  ReportedDate: string;
  // Other fields...
}
