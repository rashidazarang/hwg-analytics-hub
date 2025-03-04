
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
