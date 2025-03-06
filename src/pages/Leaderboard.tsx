
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRange } from '@/lib/dateUtils';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import TopAgentsTable from '@/components/leaderboard/TopAgentsTable';
import TopDealersTable from '@/components/leaderboard/TopDealersTable';
import { 
  useTopAgentsData, 
  useTopDealersData
} from '@/hooks/useLeaderboardData';
import { today, lastMonth } from '@/lib/dateUtils';

const Leaderboard: React.FC = () => {
  // State for date range filter
  const [dateRange, setDateRange] = useState<DateRange>({
    from: lastMonth(),
    to: today()
  });

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>('dealers');

  // Fetch data using our hooks
  const { 
    data: topAgents, 
    isLoading: isLoadingAgents 
  } = useTopAgentsData({ dateRange });

  const { 
    data: topDealers, 
    isLoading: isLoadingDealers 
  } = useTopDealersData({ dateRange });

  // Handle date range change
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Performance Leaderboard</h1>
        <DateRangeFilter 
          dateRange={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Tabbed Tables */}
      <Tabs 
        defaultValue={activeTab} 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="dealers">Dealers</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="dealers" className="space-y-4">
          <TopDealersTable 
            data={topDealers || []}
            isLoading={isLoadingDealers}
          />
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <TopAgentsTable 
            data={topAgents || []}
            isLoading={isLoadingAgents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
