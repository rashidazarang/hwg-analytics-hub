
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/layout/Dashboard';
import { DateRange } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useKPIData } from '@/hooks/useKPIData';
import { useLeaderboardSummary } from '@/hooks/useLeaderboardData';
import { useTopDealersContractData } from '@/hooks/useTopDealersContractData';
import { useTopDealerClaimsData } from '@/hooks/useDealerClaimsData';
import DashboardSummaryKPIs from '@/components/metrics/DashboardSummaryKPIs';
import DashboardLeaderboard from '@/components/dashboard/DashboardLeaderboard';
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';

const Index = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);
  const [dealerFilter, setDealerFilter] = useState<string>('');

  // Remove authentication check useEffect

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

  // Fetch top dealers data (contracts breakdown)
  const { data: topDealers, isLoading: isTopDealersLoading } = useTopDealersContractData({ 
    dateRange 
  });

  // Fetch dealer claims data
  const { data: topDealerClaims, isLoading: isTopDealerClaimsLoading } = useTopDealerClaimsData({ 
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
              pageTitle="Dashboard"
    >
      <div className="w-full overflow-x-hidden space-y-6">
        {/* Leaderboard Highlights Section */}
        <DashboardLeaderboard 
          topDealers={topDealers?.slice(0, 3)} 
          topDealerClaims={topDealerClaims?.slice(0, 3)}
          isTopDealersLoading={isTopDealersLoading}
          isTopDealerClaimsLoading={isTopDealerClaimsLoading}
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
