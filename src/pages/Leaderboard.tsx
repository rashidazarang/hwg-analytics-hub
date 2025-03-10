import React from 'react';
import { DateRange } from '@/lib/dateUtils';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import TopDealersTable from '@/components/leaderboard/TopDealersTable';
import LeaderboardSummaryCards from '@/components/leaderboard/LeaderboardSummaryCards';
import { useLeaderboardData } from '@/hooks/leaderboard/useLeaderboardData';
import Sidebar from '@/components/navigation/Sidebar';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';

const Leaderboard: React.FC = () => {
  // Use global date range
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);

  // Fetch data using our optimized hook
  const {
    data: leaderboardData,
    isLoading
  } = useLeaderboardData({
    dateRange
  });

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  return <div className="min-h-screen flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-6 py-[12px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="md:block text-2xl font-bold tracking-tight">Performance Leaderboard</h1>
          <DateRangeFilter dateRange={dateRange} onChange={handleDateRangeChange} isPerformancePage={false} />
        </div>

        {/* Display KPI summary from top dealers */}
        {leaderboardData?.summary && (
          <LeaderboardSummaryCards 
            data={leaderboardData.summary} 
            isLoading={isLoading} 
          />
        )}

        {/* Display top dealers table */}
        <div className="space-y-4">
          <TopDealersTable 
            data={leaderboardData?.topDealers || []} 
            isLoading={isLoading} 
            hideSearch={true} // Disable search on leaderboard page
          />
        </div>
      </div>
    </div>;
};

export default Leaderboard;