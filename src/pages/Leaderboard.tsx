import React, { useState } from 'react';
import { DateRange } from '@/lib/dateUtils';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import TopDealersTable from '@/components/leaderboard/TopDealersTable';
import { useTopDealersData } from '@/hooks/useLeaderboardData';
import Sidebar from '@/components/navigation/Sidebar';
const Leaderboard: React.FC = () => {
  // State for date range filter
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });

  // Fetch data using our hooks
  const {
    data: topDealers,
    isLoading: isLoadingDealers
  } = useTopDealersData({
    dateRange
  });

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };
  return <div className="min-h-screen flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="font-bold mb-4 sm:mb-0 text-xl">Performance Leaderboard</h1>
          <DateRangeFilter dateRange={dateRange} onChange={handleDateRangeChange} />
        </div>

        <div className="space-y-4">
          <TopDealersTable data={topDealers || []} isLoading={isLoadingDealers} />
        </div>
      </div>
    </div>;
};
export default Leaderboard;