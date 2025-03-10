
import React from 'react';
import { DateRange } from '@/lib/dateUtils';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import TopDealersTable from '@/components/leaderboard/TopDealersTable';
import LeaderboardSummaryCards from '@/components/leaderboard/LeaderboardSummaryCards';
import { useTopDealersData } from '@/hooks/leaderboard/useTopDealersData';
import { useLeaderboardSummary } from '@/hooks/leaderboard/useLeaderboardSummary';
import Sidebar from '@/components/navigation/Sidebar';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';

const Leaderboard: React.FC = () => {
  // Use global date range
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);

  // Fetch data using our hooks
  const {
    data: topDealers,
    isLoading: isLoadingDealers
  } = useTopDealersData({
    dateRange
  });

  // Fetch summary data for KPIs
  const {
    data: summaryData,
    isLoading: isLoadingSummary
  } = useLeaderboardSummary({
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

        {/* Add LeaderboardSummaryCards */}
        {summaryData && (
          <LeaderboardSummaryCards 
            data={summaryData} 
            isLoading={isLoadingSummary} 
          />
        )}

        <div className="space-y-4">
          <TopDealersTable 
            data={topDealers || []} 
            isLoading={isLoadingDealers} 
            hideSearch={true} // Disable search on leaderboard page
          />
        </div>
      </div>
    </div>;
};

export default Leaderboard;
