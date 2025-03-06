
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { FileSignature, AlertTriangle, Clock, BarChart } from 'lucide-react';
import { useSharedPerformanceData } from '@/hooks/useSharedPerformanceData';
import { useKPIData } from '@/hooks/useKPIData';

const KPISection: React.FC = () => {
  // Get shared performance data
  const { performanceData } = useSharedPerformanceData();
  const { averages, timeframe, dateRange, dealerFilter = '' } = performanceData;
  
  // Fetch KPI data with consistent filtering
  const { data: kpiData, isLoading } = useKPIData({ 
    dateRange,
    dealerFilter
  });
  
  // Determine description based on timeframe
  let periodDescription = "average per interval";
  switch (timeframe) {
    case 'week':
      periodDescription = "average per day";
      break;
    case 'month':
      periodDescription = "average per day";
      break;
    case '6months':
      periodDescription = "average per month";
      break;
    case 'year':
      periodDescription = "average per month";
      break;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mx-auto mb-6 animate-fade-in">
      <KPICard
        title="Pending Contracts"
        value={isLoading 
          ? "..." 
          : kpiData?.pendingContracts.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "0"}
        description={`Pending contracts in selected date range`}
        icon={Clock}
        color="warning"
      />
      <KPICard
        title="Active Contracts"
        value={isLoading 
          ? "..." 
          : kpiData?.activeAgreements.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "0"}
        description={`Active contracts in selected date range`}
        icon={FileSignature}
        color="success"
      />
      <KPICard
        title="Cancelled Contracts"
        value={isLoading 
          ? "..." 
          : kpiData?.cancelledContracts.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "0"}
        description={`Cancelled contracts in selected date range`}
        icon={AlertTriangle}
        color="destructive"
      />
    </div>
  );
};

export default KPISection;
