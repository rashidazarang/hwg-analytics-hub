
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { FileSignature, AlertTriangle, Clock } from 'lucide-react';
import { useSharedPerformanceData } from '@/hooks/useSharedPerformanceData';

const KPISection: React.FC = () => {
  // Get shared performance data
  const { performanceData } = useSharedPerformanceData();
  const { averages, timeframe } = performanceData;
  
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mb-6">
      <KPICard
        title="Avg Pending Contracts"
        value={averages.pending.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Pending contracts ${periodDescription}`}
        icon={Clock}
        color="warning"
      />
      <KPICard
        title="Avg Active Contracts"
        value={averages.active.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Active contracts ${periodDescription}`}
        icon={FileSignature}
        color="success"
      />
      <KPICard
        title="Avg Cancelled Contracts"
        value={averages.cancelled.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        description={`Cancelled contracts ${periodDescription}`}
        icon={AlertTriangle}
        color="destructive"
      />
    </div>
  );
};

export default KPISection;
