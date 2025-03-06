
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useKPIData } from '@/hooks/useKPIData';
import { useLeaderboardSummary } from '@/hooks/useLeaderboardData';
import { useTopDealersData, useTopAgentsData } from '@/hooks/useLeaderboardData';
import DashboardSummaryKPIs from '@/components/metrics/DashboardSummaryKPIs';
import DashboardLeaderboard from '@/components/dashboard/DashboardLeaderboard';
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';

const Index = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });
  const [dealerFilter, setDealerFilter] = useState<string>('');

  // Check authentication
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/auth');
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleDateRangeChange = (range: DateRange) => {
    console.log("📅 Date range changed in Index:", range);
    setDateRange(range);
  };

  // Fetch KPI data
  const { data: kpiData, isLoading: isKPILoading } = useKPIData({ 
    dateRange, 
    dealerFilter 
  });

  // Fetch leaderboard summary
  const { data: leaderboardSummary, isLoading: isLeaderboardLoading } = useLeaderboardSummary({ 
    dateRange 
  });

  // Fetch top dealers data (for leaderboard highlights)
  const { data: topDealers, isLoading: isTopDealersLoading } = useTopDealersData({ 
    dateRange 
  });

  // Fetch top agents data (for leaderboard highlights)
  const { data: topAgents, isLoading: isTopAgentsLoading } = useTopAgentsData({ 
    dateRange 
  });

  return (
    <Dashboard 
      onDateRangeChange={handleDateRangeChange}
      kpiSection={
        <DashboardSummaryKPIs 
          kpiData={kpiData} 
          isLoading={isKPILoading}
          leaderboardSummary={leaderboardSummary}
          isLeaderboardLoading={isLeaderboardLoading}
        />
      }
      pageTitle="Analytics Dashboard"
    >
      <div className="w-full overflow-x-hidden space-y-6">
        {/* Leaderboard Highlights Section */}
        <DashboardLeaderboard 
          topDealers={topDealers?.slice(0, 3)} 
          topAgents={topAgents?.slice(0, 3)}
          isTopDealersLoading={isTopDealersLoading}
          isTopAgentsLoading={isTopAgentsLoading}
        />

        {/* Alerts & Actionable Insights Section */}
        <DashboardAlerts 
          kpiData={kpiData} 
          dateRange={dateRange}
        />
      </div>
    </Dashboard>
  );
};

export default Index;
