import React from 'react';
import { TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import KPICard from '@/components/metrics/KPICard';
import { formatCurrency } from '@/lib/utils';
import { TopDealersSummary } from '@/hooks/leaderboard/useLeaderboardData';

interface LeaderboardSummaryCardsProps {
  data: TopDealersSummary;
  isLoading: boolean;
}

const LeaderboardSummaryCards: React.FC<LeaderboardSummaryCardsProps> = ({ 
  data, 
  isLoading
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
      <KPICard
        title="Total Expected Revenue"
        value={isLoading ? "..." : formatCurrency(data?.total_expected_revenue || 0)}
        description="From top 50 dealers - pending contracts"
        icon={TrendingUp}
        color="default"
      />
      
      <KPICard
        title="Total Funded Revenue"
        value={isLoading ? "..." : formatCurrency(data?.total_funded_revenue || 0)}
        description="From top 50 dealers - active contracts"
        icon={CheckCircle}
        color="success"
      />
      
      <KPICard
        title="Cancellation Rate"
        value={isLoading ? "..." : `${data?.avg_cancellation_rate.toFixed(1)}%` || "0%"}
        description="Weighted average from top 50 dealers"
        icon={AlertTriangle}
        color={data?.avg_cancellation_rate > 10 ? "destructive" : (data?.avg_cancellation_rate > 5 ? "warning" : "default")}
      />
    </div>
  );
};

export default LeaderboardSummaryCards;