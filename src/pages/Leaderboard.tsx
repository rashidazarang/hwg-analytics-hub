
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
import Sidebar from '@/components/navigation/Sidebar';
import { toast } from "sonner";

const Leaderboard: React.FC = () => {
  // State for date range filter
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
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
    // Log date range for debugging
    console.log('Custom date range selected:', {
      from: range.from,
      to: range.to
    });
    
    setDateRange(range);
    toast.info(`Date range updated: ${range.from.toLocaleDateString()} to ${range.to.toLocaleDateString()}`);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="ml-64 flex-1 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 sm:mb-0">Performance Leaderboard</h1>
          <DateRangeFilter 
            dateRange={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>

        {/* Add date range indicator */}
        <div className="mb-4 text-sm text-muted-foreground bg-muted p-2 rounded flex items-center justify-between">
          <div>
            <span className="font-medium">Date Range: </span>
            <span>{dateRange.from.toISOString()} to {dateRange.to.toISOString()}</span>
          </div>
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
              dateRange={dateRange}
            />
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <TopAgentsTable 
              data={topAgents || []}
              isLoading={isLoadingAgents}
              dateRange={dateRange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
