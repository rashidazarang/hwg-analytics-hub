// Mock data for development purposes
// This will be replaced with real Supabase data

export type AgreementStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'TERMINATED';

export interface Agreement {
  // Original mock data fields
  id?: string;
  dealerId?: string;
  dealerName?: string;
  customerId?: string;
  customerName?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AgreementStatus;
  value?: number;
  createdAt?: Date;
  updatedAt?: Date;
  dealerCost?: number;
  reserveAmount?: number;
  
  // Supabase schema fields
  AgreementID?: string;
  DealerUUID?: string;
  HolderFirstName?: string;
  HolderLastName?: string;
  HolderEmail?: string;
  EffectiveDate?: Date;
  ExpireDate?: Date;
  AgreementStatus?: string;
  Total?: number;
  DealerCost?: number;
  ReserveAmount?: number;
  DocumentURL?: string;
  IsActive?: boolean;
}

export interface Claim {
  // Original mock data fields
  id?: string;
  agreementId?: string;
  customerId?: string;
  customerName?: string;
  dealerId?: string;
  dealerName?: string;
  dateReported?: Date;
  dateIncurred?: Date;
  amount?: number;
  status?: 'OPEN' | 'CLOSED' | 'PENDING';
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deductible?: number;
  
  // Supabase schema fields
  ClaimID?: string;
  AgreementID?: string;
  ReportedDate?: Date;
  IncurredDate?: Date;
  LastModified?: Date;
  Complaint?: string;
  Cause?: string;
  Correction?: string;
  Deductible?: number;
  CauseID?: string;
  CorrectionID?: string;
  ComplaintID?: string;
}

export interface Dealer {
  // Original mock data fields
  id?: string;
  name?: string;
  location?: string;
  activeAgreements?: number;
  totalClaims?: number;
  performanceScore?: number;
  createdAt?: Date;
  totalRevenue?: number;
  totalPayouts?: number;
  city?: string;
  region?: string;
  country?: string;
  
  // Supabase schema fields
  DealerUUID?: string;
  Payee?: string;
  PayeeID?: string;
  City?: string;
  Region?: string;
  Country?: string;
  Address?: string;
  PostalCode?: string;
  Contact?: string;
  Phone?: string;
  Fax?: string;
  EMail?: string;
  PayeeType?: string;
  Total?: number;
  TotalPayouts?: number;
}

// Generate random date within a range
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate mock agreements
export const generateMockAgreements = (count: number): Agreement[] => {
  const statuses: AgreementStatus[] = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING', 'TERMINATED'];
  const agreements: Agreement[] = [];
  
  for (let i = 0; i < count; i++) {
    const startDate = randomDate(new Date(2020, 0, 1), new Date());
    const endDate = randomDate(startDate, new Date(2025, 11, 31));
    
    agreements.push({
      id: `AGR-${i.toString().padStart(5, '0')}`,
      dealerId: `DLR-${Math.floor(Math.random() * 20).toString().padStart(3, '0')}`,
      dealerName: `Dealer ${Math.floor(Math.random() * 20) + 1}`,
      customerId: `CUST-${i.toString().padStart(5, '0')}`,
      customerName: `Customer ${i + 1}`,
      startDate,
      endDate,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      value: Math.floor(Math.random() * 10000) + 1000,
      createdAt: startDate,
      updatedAt: randomDate(startDate, new Date()),
      dealerCost: Math.floor(Math.random() * 1000) + 100,
      reserveAmount: Math.floor(Math.random() * 500) + 50
    });
  }
  
  return agreements;
};

// Generate mock claims
export const generateMockClaims = (count: number, agreements: Agreement[]): Claim[] => {
  const claims: Claim[] = [];
  const statuses = ['OPEN', 'CLOSED', 'PENDING'] as const;
  
  for (let i = 0; i < count; i++) {
    const agreement = agreements[Math.floor(Math.random() * agreements.length)];
    
    // Generate more recent claims - 80% within last year, 20% older
    const shouldBeRecent = Math.random() < 0.8;
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    const dateIncurred = shouldBeRecent 
      ? randomDate(oneYearAgo, now)
      : randomDate(agreement.startDate, now < agreement.endDate ? now : agreement.endDate);
    const dateReported = randomDate(dateIncurred, new Date(dateIncurred.getTime() + 1000 * 60 * 60 * 24 * 14)); // Report within 14 days
    
    claims.push({
      id: `CLM-${i.toString().padStart(5, '0')}`,
      agreementId: agreement.id,
      customerId: agreement.customerId,
      customerName: agreement.customerName,
      dealerId: agreement.dealerId,
      dealerName: agreement.dealerName,
      dateIncurred,
      dateReported,
      amount: Math.floor(Math.random() * 5000) + 100,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      description: `Claim for ${['repair', 'replacement', 'maintenance', 'damage', 'malfunction'][Math.floor(Math.random() * 5)]}`,
      createdAt: dateReported,
      updatedAt: randomDate(dateReported, new Date()),
      deductible: Math.floor(Math.random() * 100) + 10
    });
  }
  
  return claims;
};

// Generate mock dealers
export const generateMockDealers = (count: number): Dealer[] => {
  const dealers: Dealer[] = [];
  
  for (let i = 0; i < count; i++) {
    dealers.push({
      id: `DLR-${i.toString().padStart(3, '0')}`,
      name: `Dealer ${i + 1}`,
      location: `Location ${i + 1}`,
      activeAgreements: Math.floor(Math.random() * 100) + 10,
      totalClaims: Math.floor(Math.random() * 50) + 5,
      performanceScore: Math.floor(Math.random() * 100),
      createdAt: randomDate(new Date(2018, 0, 1), new Date(2020, 0, 1)),
      totalRevenue: Math.floor(Math.random() * 100000) + 10000,
      totalPayouts: Math.floor(Math.random() * 50000) + 5000,
      city: `City ${i + 1}`,
      region: `Region ${i + 1}`,
      country: `Country ${i + 1}`,
      Address: `Address ${i + 1}`,
      PostalCode: `Postal Code ${i + 1}`,
      Contact: `Contact ${i + 1}`,
      Phone: `Phone ${i + 1}`,
      Fax: `Fax ${i + 1}`,
      EMail: `Email ${i + 1}`,
      PayeeType: `Payee Type ${i + 1}`,
      Total: Math.floor(Math.random() * 100000) + 10000,
      TotalPayouts: Math.floor(Math.random() * 50000) + 5000
    });
  }
  
  return dealers;
};

// Generate all mock data
export const mockAgreements = generateMockAgreements(200);
export const mockClaims = generateMockClaims(150, mockAgreements);
export const mockDealers = generateMockDealers(20);

// Calculate KPI metrics
export const calculateKPIs = (
  agreements: Agreement[], 
  claims: Claim[], 
  dealers: Dealer[],
  dateRange: { from: Date; to: Date }
) => {
  // Filter agreements and claims by date range
  const filteredAgreements = agreements.filter(a => 
    (a.createdAt >= dateRange.from && a.createdAt <= dateRange.to) ||
    (a.status === 'ACTIVE' && a.startDate <= dateRange.to && a.endDate >= dateRange.from)
  );
  
  const filteredClaims = claims.filter(c => 
    c.dateReported >= dateRange.from && c.dateReported <= dateRange.to
  );
  
  const activeAgreements = filteredAgreements.filter(a => a.status === 'ACTIVE').length;
  const totalAgreementsValue = filteredAgreements.reduce((sum, a) => sum + a.value, 0);
  
  const openClaims = filteredClaims.filter(c => c.status === 'OPEN').length;
  const closedClaims = filteredClaims.filter(c => c.status === 'CLOSED').length;
  const totalClaimsAmount = filteredClaims.reduce((sum, c) => sum + c.amount, 0);
  
  const activeDealers = [...new Set(filteredAgreements.map(a => a.dealerId))].length;
  const totalDealers = dealers.length;
  
  return {
    activeAgreements,
    totalAgreements: filteredAgreements.length,
    openClaims,
    totalClaims: filteredClaims.length,
    activeDealers,
    totalDealers,
    averageClaimAmount: filteredClaims.length ? totalClaimsAmount / filteredClaims.length : 0,
    totalClaimsAmount
  };
};

// Get agreement status distribution
export const getAgreementStatusDistribution = (agreements: Agreement[], dateRange: { from: Date; to: Date }) => {
  const filteredAgreements = agreements.filter(a => 
    (a.createdAt >= dateRange.from && a.createdAt <= dateRange.to) ||
    (a.status === 'ACTIVE' && a.startDate <= dateRange.to && a.endDate >= dateRange.from)
  );
  
  const statusCount: Record<AgreementStatus, number> = {
    ACTIVE: 0,
    EXPIRED: 0,
    CANCELLED: 0,
    PENDING: 0,
    TERMINATED: 0
  };
  
  filteredAgreements.forEach(a => {
    statusCount[a.status]++;
  });
  
  return Object.entries(statusCount).map(([status, count]) => ({
    name: status,
    value: count
  }));
};

// Get claims timeline data
export const getClaimsTimeline = (claims: Claim[], dateRange: { from: Date; to: Date }) => {
  const filteredClaims = claims.filter(c => 
    c.dateReported >= dateRange.from && c.dateReported <= dateRange.to
  );
  
  // Group by month
  const monthlyData: Record<string, { reported: number; amount: number }> = {};
  
  filteredClaims.forEach(claim => {
    const monthKey = format(claim.dateReported, 'MMM yyyy');
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { reported: 0, amount: 0 };
    }
    
    monthlyData[monthKey].reported++;
    monthlyData[monthKey].amount += claim.amount;
  });
  
  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    reported: data.reported,
    amount: data.amount
  }));
};

// Helper function to format dates
const format = (date: Date, formatStr: string): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  
  if (formatStr === 'MMM yyyy') {
    return `${month} ${year}`;
  }
  
  return date.toLocaleDateString();
};
