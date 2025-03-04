
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { FileSignature, FileCheck, AlertTriangle, Clock } from 'lucide-react';
import { DateRange } from '@/lib/dateUtils';
import { useKPIData } from '@/hooks/useKPIData';

type KPISectionProps = {
  dateRange: DateRange;
  dealerFilter?: string;
};

const KPISection: React.FC<KPISectionProps> = ({ dateRange, dealerFilter = '' }) => {
  // Fetch KPI data based on date range and dealer filter
  const { data: kpis, isLoading, error } = useKPIData({ 
    dateRange, 
    dealerFilter 
  });
  
  if (error) {
    console.error("Error loading KPI data:", error);
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Pending Contracts"
        value={isLoading ? "..." : kpis?.pendingContracts.toLocaleString() || "0"}
        description="Contracts in pending status"
        icon={Clock}
        color="warning"
        trend={{
          value: 2.3,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Newly Active Contracts"
        value={isLoading ? "..." : kpis?.newlyActiveContracts.toLocaleString() || "0"}
        description="Contracts activated in this period"
        icon={FileSignature}
        color="success"
        trend={{
          value: 4.1,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Cancelled Contracts"
        value={isLoading ? "..." : kpis?.cancelledContracts.toLocaleString() || "0"}
        description="Contracts cancelled in this period"
        icon={AlertTriangle}
        color="destructive"
        trend={{
          value: 1.8,
          isPositive: false, 
          label: "from last period"
        }}
      />
      <KPICard
        title="Open Claims"
        value={isLoading ? "..." : kpis?.openClaims.toLocaleString() || "0"}
        description="Claims currently open"
        icon={FileCheck}
        color="info"
        trend={{
          value: 2.5,
          isPositive: false,
          label: "from last period"
        }}
      />
    </div>
  );
};

export default KPISection;
