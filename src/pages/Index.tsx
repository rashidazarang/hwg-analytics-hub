
import React, { useState } from 'react';
import Dashboard from '@/components/layout/Dashboard';
import AuthNav from '@/components/navigation/AuthNav';
import { DateRange } from '@/lib/dateUtils';
import KPISection from '@/components/metrics/KPISection';
import DashboardCharts from '@/components/charts/DashboardCharts';

const Index = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), 0, 1), // Jan 1st of current year
    to: new Date()
  });

  const handleDateRangeChange = (range: DateRange) => {
    console.log("Date range changed in Index:", range);
    setDateRange(range);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b py-2 px-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold">Dealer Management System</h1>
        <AuthNav />
      </header>
      <main>
        <Dashboard 
          onDateRangeChange={handleDateRangeChange}
          kpiSection={<KPISection dateRange={dateRange} />}
        >
          <DashboardCharts dateRange={dateRange} />
        </Dashboard>
      </main>
    </div>
  );
};

export default Index;
