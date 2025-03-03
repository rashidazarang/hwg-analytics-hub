
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { Users, FileSignature, FileCheck, TrendingUp } from 'lucide-react';
import { KPIData } from '@/lib/types';
import { DateRange } from '@/lib/dateUtils';
import { calculateKPIs, mockAgreements, mockClaims, mockDealers } from '@/lib/mockData';

type KPISectionProps = {
  dateRange: DateRange;
};

const KPISection: React.FC<KPISectionProps> = ({ dateRange }) => {
  // Calculate KPIs based on the date range
  const kpis = calculateKPIs(mockAgreements, mockClaims, mockDealers, dateRange);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Active Agreements"
        value={kpis.activeAgreements.toLocaleString()}
        description={`${kpis.totalAgreements.toLocaleString()} total agreements`}
        icon={FileSignature}
        color="primary"
        trend={{
          value: 5.2,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Open Claims"
        value={kpis.openClaims.toLocaleString()}
        description={`${kpis.totalClaims.toLocaleString()} total claims`}
        icon={FileCheck}
        color="warning"
        trend={{
          value: 2.8,
          isPositive: false,
          label: "from last period"
        }}
      />
      <KPICard
        title="Active Dealers"
        value={kpis.activeDealers.toLocaleString()}
        description={`Across ${kpis.totalDealers} total dealers`}
        icon={Users}
        color="success"
        trend={{
          value: 1.5,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Avg. Claim Amount"
        value={`$${Math.round(kpis.averageClaimAmount).toLocaleString()}`}
        description={`$${Math.round(kpis.totalClaimsAmount).toLocaleString()} total claims amount`}
        icon={TrendingUp}
        color="info"
        trend={{
          value: 3.7,
          isPositive: false,
          label: "from last period"
        }}
      />
    </div>
  );
};

export default KPISection;
