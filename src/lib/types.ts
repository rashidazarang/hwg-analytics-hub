
export interface KPIData {
  activeAgreements: number;
  totalAgreements: number;
  openClaims: number;
  totalClaims: number;
  activeDealers: number;
  totalDealers: number;
  averageClaimAmount: number;
  totalClaimsAmount: number;
}

export type DateFieldType = string | Date;

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startItem: number;
  endItem: number;
}

export interface PaginationProps extends PaginationState {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// Add uniform interfaces for Claims and Agreements
export interface Claim {
  id: string;
  ClaimID?: string;
  AgreementID?: string;
  ReportedDate?: DateFieldType;
  IncurredDate?: DateFieldType;
  Deductible?: number;
  Cause?: string;
  Complaint?: string;
  Correction?: string;
  Closed?: DateFieldType;
  dateReported?: DateFieldType;
  dateIncurred?: DateFieldType;
  deductible?: number;
  dealerName?: string;
  amount?: number;
  status?: string;
  agreements?: {
    DealerUUID?: string;
    dealers?: {
      Payee?: string;
    }
  };
  // Additional fields that may come from mockData
  agreementId?: string;
  customerId?: string;
  customerName?: string;
  dealerId?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  CauseID?: string;
  CorrectionID?: string;
  ComplaintID?: string;
  LastModified?: DateFieldType;
}

export interface Agreement {
  id: string;
  AgreementID?: string;
  HolderFirstName?: string;
  HolderLastName?: string;
  DealerUUID?: string;
  DealerID?: string;
  EffectiveDate?: string;
  ExpireDate?: string;
  AgreementStatus?: string;
  Total?: number;
  DealerCost?: number;
  ReserveAmount?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  dealerCost?: number;
  reserveAmount?: number;
  dealers?: {
    Payee?: string;
  };
  // Additional fields from mockData
  dealerId?: string;
  dealerName?: string;
  customerId?: string;
  customerName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  HolderEmail?: string;
  DocumentURL?: string;
  IsActive?: boolean;
}
