
// Mock data for development purposes
// This will be replaced with real Supabase data

export type AgreementStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'TERMINATED';

export interface Agreement {
  id: string;
  AgreementID: string;
  DealerUUID: string;
  dealerName: string;
  HolderFirstName: string;
  HolderLastName: string;
  HolderEmail: string;
  EffectiveDate: Date;
  ExpireDate: Date;
  DocumentURL: string;
  status: AgreementStatus;
  Total: number;
  DealerCost: number;
  ReserveAmount: number;
  IsActive: boolean;
  StatusChangeDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Claim {
  id: string;
  ClaimID: string;
  agreementId: string;
  AgreementID: string;
  dealerId: string;
  dealerName: string;
  dateReported: Date;
  dateIncurred: Date;
  amount: number;
  deductible: number;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dealer {
  id: string;
  DealerUUID: string;
  name: string;
  Payee: string;
  location: string;
  City: string;
  Region: string;
  Country: string;
  Contact: string;
  Phone: string;
  EMail: string;
  activeAgreements: number;
  totalClaims: number;
  totalRevenue: number;
  totalPayouts: number;
  performanceScore: number;
  createdAt: Date;
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
    const effectiveDate = randomDate(new Date(2020, 0, 1), new Date());
    const expireDate = randomDate(effectiveDate, new Date(2025, 11, 31));
    
    agreements.push({
      id: `AGR-${i.toString().padStart(5, '0')}`,
      AgreementID: `AGR-${i.toString().padStart(5, '0')}`,
      DealerUUID: `DLR-${Math.floor(Math.random() * 20).toString().padStart(3, '0')}`,
      dealerName: `Dealer ${Math.floor(Math.random() * 20) + 1}`,
      HolderFirstName: `First${i + 1}`,
      HolderLastName: `Last${i + 1}`,
      HolderEmail: `customer${i + 1}@example.com`,
      EffectiveDate: effectiveDate,
      ExpireDate: expireDate,
      DocumentURL: `https://example.com/documents/agreement-${i}.pdf`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      Total: Math.floor(Math.random() * 10000) + 1000,
      DealerCost: Math.floor(Math.random() * 5000) + 500,
      ReserveAmount: Math.floor(Math.random() * 2000) + 100,
      IsActive: Math.random() > 0.3,
      StatusChangeDate: randomDate(effectiveDate, new Date()),
      createdAt: effectiveDate,
      updatedAt: randomDate(effectiveDate, new Date())
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
    const dateIncurred = randomDate(agreement.EffectiveDate, new Date() < agreement.ExpireDate ? new Date() : agreement.ExpireDate);
    const dateReported = randomDate(dateIncurred, new Date(dateIncurred.getTime() + 1000 * 60 * 60 * 24 * 14)); // Report within 14 days
    const claimAmount = Math.floor(Math.random() * 5000) + 100;
    const deductible = Math.floor(Math.random() * 500) + 50;
    
    claims.push({
      id: `CLM-${i.toString().padStart(5, '0')}`,
      ClaimID: `CLM-${i.toString().padStart(5, '0')}`,
      agreementId: agreement.id,
      AgreementID: agreement.AgreementID,
      dealerId: agreement.DealerUUID,
      dealerName: agreement.dealerName,
      dateIncurred,
      dateReported,
      amount: claimAmount,
      deductible: deductible,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      description: `Claim for ${['repair', 'replacement', 'maintenance', 'damage', 'malfunction'][Math.floor(Math.random() * 5)]}`,
      createdAt: dateReported,
      updatedAt: randomDate(dateReported, new Date())
    });
  }
  
  return claims;
};

// Generate mock dealers
export const generateMockDealers = (count: number): Dealer[] => {
  const dealers: Dealer[] = [];
  const regions = ['California', 'Texas', 'New York', 'Florida', 'Illinois'];
  const cities = ['Los Angeles', 'Houston', 'New York City', 'Miami', 'Chicago'];
  
  for (let i = 0; i < count; i++) {
    const regionIndex = i % regions.length;
    const totalRevenue = Math.floor(Math.random() * 1000000) + 50000;
    const totalPayouts = Math.floor(Math.random() * 500000) + 10000;
    
    dealers.push({
      id: `DLR-${i.toString().padStart(3, '0')}`,
      DealerUUID: `DLR-${i.toString().padStart(3, '0')}`,
      name: `Dealer ${i + 1}`,
      Payee: `Payee ${i + 1}`,
      location: `${cities[regionIndex]}, ${regions[regionIndex]}`,
      City: cities[regionIndex],
      Region: regions[regionIndex],
      Country: 'USA',
      Contact: `Contact Person ${i + 1}`,
      Phone: `(555) ${i.toString().padStart(3, '0')}-${(1000 + i).toString().padStart(4, '0')}`,
      EMail: `dealer${i + 1}@example.com`,
      activeAgreements: Math.floor(Math.random() * 100) + 10,
      totalClaims: Math.floor(Math.random() * 50) + 5,
      totalRevenue: totalRevenue,
      totalPayouts: totalPayouts,
      performanceScore: Math.floor(Math.random() * 100),
      createdAt: randomDate(new Date(2018, 0, 1), new Date(2020, 0, 1))
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
    (a.EffectiveDate >= dateRange.from && a.EffectiveDate <= dateRange.to) ||
    (a.IsActive && a.EffectiveDate <= dateRange.to && a.ExpireDate >= dateRange.from)
  );
  
  const filteredClaims = claims.filter(c => 
    c.dateReported >= dateRange.from && c.dateReported <= dateRange.to
  );
  
  const activeAgreements = filteredAgreements.filter(a => a.IsActive).length;
  const totalAgreementsValue = filteredAgreements.reduce((sum, a) => sum + a.Total, 0);
  
  const openClaims = filteredClaims.filter(c => c.status === 'OPEN').length;
  const closedClaims = filteredClaims.filter(c => c.status === 'CLOSED').length;
  const totalClaimsAmount = filteredClaims.reduce((sum, c) => sum + c.amount, 0);
  
  const activeDealers = [...new Set(filteredAgreements.map(a => a.DealerUUID))].length;
  
  return {
    activeAgreements,
    totalAgreementsValue,
    openClaims,
    closedClaims,
    totalClaimsAmount,
    activeDealers,
    totalAgreements: filteredAgreements.length,
    totalClaims: filteredClaims.length,
    averageClaimAmount: filteredClaims.length ? totalClaimsAmount / filteredClaims.length : 0
  };
};

// Get agreement status distribution
export const getAgreementStatusDistribution = (agreements: Agreement[], dateRange: { from: Date; to: Date }) => {
  const filteredAgreements = agreements.filter(a => 
    (a.EffectiveDate >= dateRange.from && a.EffectiveDate <= dateRange.to) ||
    (a.IsActive && a.EffectiveDate <= dateRange.to && a.ExpireDate >= dateRange.from)
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
