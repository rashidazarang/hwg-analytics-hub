
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
  const { data: kpis, isLoading, error } = useKPIData({ 
    dateRange, 
    dealerFilter 
  });
  
  if (error) {
    console.error("Error loading KPI data:", error);
  }
  
  return (
    <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-3 gap-2 xs:gap-3">
      <KPICard
        title="Open Claims"
        value={isLoading ? "..." : kpis?.openClaims.toLocaleString() || "0"}
        description="Claims currently open"
        icon={FileCheck}
        color="info"
      />
      <KPICard
        title="Pending Claims"
        value={isLoading ? "..." : kpis?.statusBreakdown?.PENDING.toLocaleString() || "0"}
        description="Claims in pending status"
        icon={Clock}
        color="warning"
      />
      <KPICard
        title="Closed Claims"
        value={isLoading ? "..." : kpis?.statusBreakdown?.CLOSED.toLocaleString() || "0"}
        description="Claims that have been closed"
        icon={AlertTriangle}
        color="destructive"
      />
    </div>
  );
};

export default ClaimKPISection;
