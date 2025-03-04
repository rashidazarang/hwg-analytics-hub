
import React, { ReactNode } from 'react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';

type DashboardProps = {
  onDateRangeChange: (range: DateRange) => void;
  kpiSection: ReactNode;
  children: ReactNode;
  subnavbar?: ReactNode; // Prop for the subnavbar content
};

const Dashboard: React.FC<DashboardProps> = ({
  onDateRangeChange,
  kpiSection,
  children,
  subnavbar,
}) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="dashboard-container py-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight pl-1 sm:pl-0">Analytics Dashboard</h1>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <DateRangeFilter onChange={onDateRangeChange} />
              </div>
              <div className="sm:ml-1 self-end sm:self-auto">
                <AuthNav />
              </div>
            </div>
          </div>
        </div>
        
        {/* Subnavbar - if provided */}
        {subnavbar && (
          <div className="border-t border-border/30 bg-gray-100/10">
            <div className="dashboard-container py-2">
              {subnavbar}
            </div>
          </div>
        )}
      </header>
      
      <main className="dashboard-container py-4 md:py-6 space-y-6 md:space-y-8 animate-fade-in">
        {/* KPI Metrics Section */}
        <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          {kpiSection}
        </section>
        
        {/* Dashboard Content */}
        <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          {children}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
