
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import KPICardSkeleton from '@/components/metrics/KPICardSkeleton';
import { Users, FileSignature, FileCheck, TrendingUp, FileClock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { KPIData } from '@/lib/types';
import { DateRange } from '@/lib/dateUtils';
import { calculateKPIs, mockAgreements, mockClaims, mockDealers } from '@/lib/mockData';
import { useContractKPIs } from '@/hooks/useContractKPIs';

type KPISectionProps = {
  dateRange: DateRange;
};

const KPISection: React.FC<KPISectionProps> = ({ dateRange }) => {
  // Calculate mock KPIs based on the date range (used as a fallback)
  const mockKpis = calculateKPIs(mockAgreements, mockClaims, mockDealers, dateRange);
  
  // Fetch real KPIs from Supabase
  const { data: contractKPIs, isLoading, error } = useContractKPIs(dateRange);
  
  if (error) {
    console.error('Error loading KPIs:', error);
  }
  
  // If data is loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Pending Contracts"
        value={contractKPIs?.pendingContracts.toLocaleString() || '0'}
        description="Contracts awaiting approval"
        icon={FileClock}
        color="warning"
        trend={{
          value: 2.5,
          isPositive: true,
          label: "from last period"
        }}
      />
      
      <KPICard
        title="New Active Contracts"
        value={contractKPIs?.newlyActiveContracts.toLocaleString() || '0'}
        description="Recently activated"
        icon={CheckCircle}
        color="success"
        trend={{
          value: 4.3,
          isPositive: true,
          label: "from last period"
        }}
      />
      
      <KPICard
        title="Cancelled Contracts"
        value={contractKPIs?.cancelledContracts.toLocaleString() || '0'}
        description="Terminated agreements"
        icon={XCircle}
        color="destructive"
        trend={{
          value: 1.8,
          isPositive: false,
          label: "from last period"
        }}
      />
      
      <KPICard
        title="Open Claims"
        value={contractKPIs?.openClaimsCount.toLocaleString() || '0'}
        description="Claims pending resolution"
        icon={AlertTriangle}
        color="info"
        trend={{
          value: 2.2,
          isPositive: false, 
          label: "from last period"
        }}
      />
    </div>
  );
};

export default KPISection;
