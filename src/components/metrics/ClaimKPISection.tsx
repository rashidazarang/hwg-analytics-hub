
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { FileCheck, Clock, AlertTriangle } from 'lucide-react';
import { DateRange } from '@/lib/dateUtils';
import { useKPIData } from '@/hooks/useKPIData';

type ClaimKPISectionProps = {
  dateRange: DateRange;
  dealerFilter?: string;
};

const ClaimKPISection: React.FC<ClaimKPISectionProps> = ({ dateRange, dealerFilter = '' }) => {
  // Fetch KPI data based on date range and dealer filter
  // This now gets ALL claims through the updated fetching logic
  const { data: kpis, isLoading, error } = useKPIData({ 
    dateRange, 
    dealerFilter 
  });
  
  if (error) {
    console.error("Error loading KPI data:", error);
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <KPICard
        title="Pending Claims"
        value={isLoading ? "..." : kpis?.statusBreakdown?.PENDING.toLocaleString() || "0"}
        description="Claims in pending status"
        icon={Clock}
        color="warning"
        trend={{
          value: 1.7,
          isPositive: true,
          label: "from last period"
        }}
      />
      <KPICard
        title="Closed Claims"
        value={isLoading ? "..." : kpis?.statusBreakdown?.CLOSED.toLocaleString() || "0"}
        description="Claims that have been closed"
        icon={AlertTriangle}
        color="destructive"
        trend={{
          value: 3.2,
          isPositive: true, 
          label: "from last period"
        }}
      />
    </div>
  );
};

export default ClaimKPISection;
