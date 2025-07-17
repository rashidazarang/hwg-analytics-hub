// Mock Data Service for Local Development
// Provides realistic mock data when Supabase is unavailable

import { 
  generateMockAgreements, 
  generateMockClaims, 
  generateMockDealers,
  mockAgreements,
  mockClaims,
  mockDealers
} from './mockData';

// Generate extended mock data sets
const EXTENDED_MOCK_AGREEMENTS = generateMockAgreements(500);
const EXTENDED_MOCK_CLAIMS = generateMockClaims(200, EXTENDED_MOCK_AGREEMENTS);
const EXTENDED_MOCK_DEALERS = generateMockDealers(50);

export interface MockKPIData {
  totalContracts: number;
  activeContracts: number;
  pendingContracts: number;
  cancelledContracts: number;
  totalRevenue: number;
  expectedRevenue: number;
  fundedRevenue: number;
  cancellationRate: number;
}

export interface MockTopDealer {
  dealer_name: string;
  dealer_uuid: string;
  total_contracts: number;
  active_contracts: number;
  pending_contracts: number;
  cancelled_contracts: number;
  total_revenue: number;
  expected_revenue: number;
  funded_revenue: number;
  cancellation_rate: number;
}

export interface MockLeaderboardSummary {
  active_contracts: number;
  total_revenue: number;
  cancellation_rate: number;
  dealer_name: string;
  agent_name: string;
}

export class MockDataService {
  // KPI Data
  static getKPIData(): MockKPIData {
    const totalContracts = EXTENDED_MOCK_AGREEMENTS.length;
    const activeContracts = EXTENDED_MOCK_AGREEMENTS.filter(a => a.status === 'ACTIVE').length;
    const pendingContracts = EXTENDED_MOCK_AGREEMENTS.filter(a => a.status === 'PENDING').length;
    const cancelledContracts = EXTENDED_MOCK_AGREEMENTS.filter(a => a.status === 'CANCELLED').length;
    
    const totalRevenue = EXTENDED_MOCK_AGREEMENTS.reduce((sum, a) => sum + a.value, 0);
    const expectedRevenue = EXTENDED_MOCK_AGREEMENTS
      .filter(a => a.status === 'PENDING')
      .reduce((sum, a) => sum + a.value, 0);
    const fundedRevenue = EXTENDED_MOCK_AGREEMENTS
      .filter(a => a.status === 'ACTIVE')
      .reduce((sum, a) => sum + a.value, 0);
    
    const cancellationRate = totalContracts > 0 ? (cancelledContracts / totalContracts) * 100 : 0;

    return {
      totalContracts,
      activeContracts,
      pendingContracts,
      cancelledContracts,
      totalRevenue,
      expectedRevenue,
      fundedRevenue,
      cancellationRate
    };
  }

  // Top Dealers Data
  static getTopDealers(limit: number = 50): MockTopDealer[] {
    const dealerMap = new Map<string, MockTopDealer>();

    EXTENDED_MOCK_AGREEMENTS.forEach(agreement => {
      const dealerId = agreement.dealerId;
      const dealerName = agreement.dealerName;

      if (!dealerMap.has(dealerId)) {
        dealerMap.set(dealerId, {
          dealer_name: dealerName,
          dealer_uuid: dealerId,
          total_contracts: 0,
          active_contracts: 0,
          pending_contracts: 0,
          cancelled_contracts: 0,
          total_revenue: 0,
          expected_revenue: 0,
          funded_revenue: 0,
          cancellation_rate: 0
        });
      }

      const dealer = dealerMap.get(dealerId)!;
      dealer.total_contracts++;
      dealer.total_revenue += agreement.value;

      switch (agreement.status) {
        case 'ACTIVE':
          dealer.active_contracts++;
          dealer.funded_revenue += agreement.value;
          break;
        case 'PENDING':
          dealer.pending_contracts++;
          dealer.expected_revenue += agreement.value;
          break;
        case 'CANCELLED':
          dealer.cancelled_contracts++;
          break;
      }
    });

    // Calculate cancellation rates
    dealerMap.forEach(dealer => {
      dealer.cancellation_rate = dealer.total_contracts > 0 
        ? (dealer.cancelled_contracts / dealer.total_contracts) * 100 
        : 0;
    });

    return Array.from(dealerMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);
  }

  // Leaderboard Summary
  static getLeaderboardSummary(): MockLeaderboardSummary {
    const kpiData = this.getKPIData();
    const topDealers = this.getTopDealers(1);
    
    return {
      active_contracts: kpiData.activeContracts,
      total_revenue: kpiData.totalRevenue,
      cancellation_rate: kpiData.cancellationRate,
      dealer_name: topDealers[0]?.dealer_name || 'Best Motors Inc.',
      agent_name: 'John Smith'
    };
  }

  // Performance Metrics Data
  static getPerformanceData(timeframe: 'day' | 'week' | 'month' | 'year', startDate: Date, endDate: Date) {
    const agreementsInRange = EXTENDED_MOCK_AGREEMENTS.filter(agreement => {
      const agreementDate = new Date(agreement.startDate);
      return agreementDate >= startDate && agreementDate <= endDate;
    });

    // Generate time series data based on timeframe
    const dataPoints = [];
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let intervals: Date[] = [];
    
    if (timeframe === 'week' || daysDiff <= 30) {
      // Daily intervals
      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        intervals.push(date);
      }
    } else if (timeframe === 'month' || daysDiff <= 365) {
      // Weekly intervals
      for (let i = 0; i < Math.ceil(daysDiff / 7); i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (i * 7));
        intervals.push(date);
      }
    } else {
      // Monthly intervals
      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        intervals.push(date);
      }
    }

    return intervals.map((date, index) => {
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: timeframe === 'week' ? 'numeric' : undefined 
      });
      
      // Simulate realistic data distribution
      const baseValue = Math.floor(Math.random() * 20) + 5;
      const pending = Math.floor(baseValue * 0.3);
      const active = Math.floor(baseValue * 0.5);
      const cancelled = Math.floor(baseValue * 0.1);
      const claimable = Math.floor(baseValue * 0.1);
      
      return {
        label: dateStr.toLowerCase(),
        value: baseValue,
        pending,
        active,
        cancelled,
        claimable,
        void: 0,
        rawDate: date
      };
    });
  }

  // Claims Data
  static getClaimsData(page: number = 0, pageSize: number = 20, dealerFilter?: string) {
    let filteredClaims = EXTENDED_MOCK_CLAIMS;
    
    if (dealerFilter) {
      filteredClaims = EXTENDED_MOCK_CLAIMS.filter(claim => 
        claim.dealerId === dealerFilter || claim.dealerName.toLowerCase().includes(dealerFilter.toLowerCase())
      );
    }

    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedClaims = filteredClaims.slice(startIndex, endIndex);

    return {
      data: paginatedClaims.map(claim => ({
        ...claim,
        ClaimID: claim.id,
        AgreementID: claim.agreementId,
        ReportedDate: claim.dateReported?.toISOString(),
        Closed: claim.status === 'CLOSED' ? claim.updatedAt?.toISOString() : null,
        LastModified: claim.updatedAt?.toISOString(),
        totalPaid: claim.amount,
        TotalPaid: claim.amount,
        lastPaymentDate: claim.status === 'CLOSED' ? claim.updatedAt?.toISOString() : null,
        LastPaymentDate: claim.status === 'CLOSED' ? claim.updatedAt?.toISOString() : null
      })),
      count: filteredClaims.length,
      statusBreakdown: {
        OPEN: filteredClaims.filter(c => c.status === 'OPEN').length,
        PENDING: filteredClaims.filter(c => c.status === 'PENDING').length,
        CLOSED: filteredClaims.filter(c => c.status === 'CLOSED').length
      }
    };
  }

  // Agreements Data
  static getAgreementsData(page: number = 0, pageSize: number = 20, dealerFilter?: string, statusFilters?: string[]) {
    let filteredAgreements = EXTENDED_MOCK_AGREEMENTS;
    
    if (dealerFilter) {
      filteredAgreements = filteredAgreements.filter(agreement => 
        agreement.dealerId === dealerFilter || agreement.dealerName.toLowerCase().includes(dealerFilter.toLowerCase())
      );
    }

    if (statusFilters && statusFilters.length > 0) {
      filteredAgreements = filteredAgreements.filter(agreement => 
        statusFilters.includes(agreement.status)
      );
    }

    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAgreements = filteredAgreements.slice(startIndex, endIndex);

    return {
      data: paginatedAgreements.map(agreement => ({
        ...agreement,
        AgreementID: agreement.id,
        AgreementStatus: agreement.status,
        DealerUUID: agreement.dealerId,
        EffectiveDate: agreement.startDate?.toISOString(),
        DealerCost: agreement.dealerCost,
        dealers: {
          Payee: agreement.dealerName,
          DealerUUID: agreement.dealerId
        }
      })),
      count: filteredAgreements.length
    };
  }

  // Dealers Data
  static getDealersData() {
    return EXTENDED_MOCK_DEALERS.map(dealer => ({
      ...dealer,
      DealerUUID: dealer.id,
      Payee: dealer.name,
      PayeeID: dealer.id
    }));
  }

  // Dealer Profile Data
  static getDealerProfile(dealerUuid: string) {
    const dealer = EXTENDED_MOCK_DEALERS.find(d => d.id === dealerUuid) || EXTENDED_MOCK_DEALERS[0];
    const dealerAgreements = EXTENDED_MOCK_AGREEMENTS.filter(a => a.dealerId === dealerUuid);
    const dealerClaims = EXTENDED_MOCK_CLAIMS.filter(c => c.dealerId === dealerUuid);

    return {
      profile: {
        dealer_uuid: dealer.id,
        dealer_name: dealer.name,
        dealer_address: dealer.Address,
        dealer_city: dealer.city,
        dealer_region: dealer.region,
        dealer_country: dealer.country,
        dealer_postal_code: dealer.PostalCode,
        dealer_contact: dealer.Contact,
        dealer_phone: dealer.Phone,
        dealer_email: dealer.EMail,
        
        total_contracts: dealerAgreements.length,
        active_contracts: dealerAgreements.filter(a => a.status === 'ACTIVE').length,
        pending_contracts: dealerAgreements.filter(a => a.status === 'PENDING').length,
        cancelled_contracts: dealerAgreements.filter(a => a.status === 'CANCELLED').length,
        expired_contracts: dealerAgreements.filter(a => a.status === 'EXPIRED').length,
        
        total_revenue: dealerAgreements.reduce((sum, a) => sum + a.value, 0),
        expected_revenue: dealerAgreements.filter(a => a.status === 'PENDING').reduce((sum, a) => sum + a.value, 0),
        funded_revenue: dealerAgreements.filter(a => a.status === 'ACTIVE').reduce((sum, a) => sum + a.value, 0),
        
        total_claims: dealerClaims.length,
        open_claims: dealerClaims.filter(c => c.status === 'OPEN').length,
        closed_claims: dealerClaims.filter(c => c.status === 'CLOSED').length,
        claims_per_contract: dealerAgreements.length > 0 ? dealerClaims.length / dealerAgreements.length : 0,
        avg_claim_resolution_days: 15
      },
      agreementDistribution: (() => {
        const active = dealerAgreements.filter(a => a.status === 'ACTIVE').length;
        const pending = dealerAgreements.filter(a => a.status === 'PENDING').length;
        const cancelled = dealerAgreements.filter(a => a.status === 'CANCELLED').length;
        const total = active + pending + cancelled || 1; // Avoid division by zero
        
        return [
          { status: 'ACTIVE', count: active, percentage: (active / total) * 100 },
          { status: 'PENDING', count: pending, percentage: (pending / total) * 100 },
          { status: 'CANCELLED', count: cancelled, percentage: (cancelled / total) * 100 }
        ];
      })(),
      claimsDistribution: (() => {
        const open = dealerClaims.filter(c => c.status === 'OPEN').length;
        const closed = dealerClaims.filter(c => c.status === 'CLOSED').length;
        const pending = dealerClaims.filter(c => c.status === 'PENDING').length;
        const total = open + closed + pending || 1; // Avoid division by zero
        
        return [
          { status: 'OPEN', count: open, percentage: (open / total) * 100 },
          { status: 'CLOSED', count: closed, percentage: (closed / total) * 100 },
          { status: 'PENDING', count: pending, percentage: (pending / total) * 100 }
        ];
      })(),
      monthlyRevenue: Array.from({ length: 12 }, (_, i) => {
        const totalRevenue = Math.floor(Math.random() * 50000) + 10000;
        const fundedRevenue = Math.floor(totalRevenue * 0.7);
        const expectedRevenue = totalRevenue - fundedRevenue;
        
        return {
          month: new Date(2025, i, 1).toLocaleDateString('en-US', { month: 'short' }),
          total_revenue: totalRevenue,
          funded_revenue: fundedRevenue,
          expected_revenue: expectedRevenue
        };
      })
    };
  }
}

export default MockDataService; 