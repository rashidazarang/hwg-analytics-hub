
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { FileSignature, AlertTriangle, Clock, BarChart, CircleDollarSign } from 'lucide-react';
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
  
  // Calculate cancellation rate
  const cancellationRate = isLoading || !kpiData
    ? 0
    : kpiData.totalAgreements > 0
      ? (kpiData.cancelledContracts / kpiData.totalAgreements) * 100
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 w-full mb-6 animate-fade-in">
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
      <KPICard
        title="Cancellation Rate"
        value={isLoading 
          ? "..." 
          : `${cancellationRate.toFixed(1)}%`}
        description={`Percentage of cancelled contracts`}
        icon={BarChart}
        color={cancellationRate > 10 ? "destructive" : (cancellationRate > 5 ? "warning" : "default")}
      />
    </div>
  );
};

export default KPISection;
