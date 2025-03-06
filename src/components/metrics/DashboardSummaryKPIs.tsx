
import React from 'react';
import KPICard from '@/components/metrics/KPICard';
import { KPIData } from '@/lib/types';
import { LeaderboardSummary } from '@/lib/types';
import { FileSignature, AlertTriangle, Clock, BarChart, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardSummaryKPIsProps {
  kpiData?: KPIData;
  isLoading: boolean;
  leaderboardSummary?: LeaderboardSummary;
  isLeaderboardLoading: boolean;
}

const DashboardSummaryKPIs: React.FC<DashboardSummaryKPIsProps> = ({ 
  kpiData, 
  isLoading,
  leaderboardSummary,
  isLeaderboardLoading
}) => {
  const navigate = useNavigate();
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full mb-6 animate-fade-in">
      <KPICard
        title="Pending Agreements"
        value={isLoading || !kpiData
          ? "..." 
          : kpiData.pendingContracts.toLocaleString() || "0"}
        description="Agreements in pending status"
        icon={Clock}
        color="warning"
      />
      <KPICard
        title="Active Agreements"
        value={isLoading || !kpiData
          ? "..." 
          : kpiData.activeAgreements.toLocaleString() || "0"}
        description="Current active contracts"
        icon={FileSignature}
        color="primary"
      />
      <KPICard
        title="Cancellation Rate"
        value={isLoading || !kpiData || !kpiData.totalAgreements
          ? "..." 
          : `${((kpiData.cancelledContracts / kpiData.totalAgreements) * 100).toFixed(1)}%`}
        description="Of total agreements"
        icon={AlertTriangle}
        color="destructive"
      />
      <KPICard
        title="Open Claims"
        value={isLoading || !kpiData
          ? "..." 
          : kpiData.openClaims.toLocaleString() || "0"}
        description="Claims requiring attention"
        icon={BarChart}
        color="info"
      />
      <KPICard
        title="Pending Claims"
        value={isLoading || !kpiData
          ? "..." 
          : kpiData.statusBreakdown?.PENDING.toLocaleString() || "0"}
        description="Claims awaiting process"
        icon={Clock}
        color="warning"
      />
    </div>
  );
};

export default DashboardSummaryKPIs;
