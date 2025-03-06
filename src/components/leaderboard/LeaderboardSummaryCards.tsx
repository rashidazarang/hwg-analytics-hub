
import React from 'react';
import { Trophy, TrendingUp, Calendar, Users, AlertTriangle } from 'lucide-react';
import KPICard from '@/components/metrics/KPICard';
import { LeaderboardSummary } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface LeaderboardSummaryCardsProps {
  data: LeaderboardSummary;
  isLoading: boolean;
  growthRate?: number;
}

const LeaderboardSummaryCards: React.FC<LeaderboardSummaryCardsProps> = ({ 
  data, 
  isLoading,
  growthRate 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
      <KPICard
        title="Total Revenue"
        value={isLoading ? "..." : formatCurrency(data?.total_revenue || 0)}
        description={
          growthRate !== undefined
            ? `${growthRate >= 0 ? '↑' : '↓'} ${Math.abs(growthRate).toFixed(1)}% vs previous period`
            : "Total revenue in selected period"
        }
        icon={TrendingUp}
        color={growthRate !== undefined && growthRate >= 0 ? "success" : (growthRate !== undefined && growthRate < 0 ? "destructive" : "default")}
      />
      
      <KPICard
        title="Active Contracts"
        value={isLoading ? "..." : data?.active_contracts.toLocaleString() || "0"}
        description="Active contracts in selected period"
        icon={Calendar}
        color="success"
      />
      
      <KPICard
        title="Cancellation Rate"
        value={isLoading ? "..." : `${data?.cancellation_rate.toFixed(1)}%` || "0%"}
        description="Percentage of cancelled contracts"
        icon={AlertTriangle}
        color={data?.cancellation_rate > 10 ? "destructive" : (data?.cancellation_rate > 5 ? "warning" : "default")}
      />
      
      <KPICard
        title="Top Performing Dealer"
        value={isLoading ? "..." : data?.top_dealer || "N/A"}
        description="Based on revenue in selected period"
        icon={Trophy}
        color="default"
      />
      
      <KPICard
        title="Top Performing Agent"
        value={isLoading ? "..." : data?.top_agent || "N/A"}
        description="Based on contracts closed"
        icon={Users}
        color="default"
      />
    </div>
  );
};

export default LeaderboardSummaryCards;
