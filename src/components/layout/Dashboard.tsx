
import React, { ReactNode } from 'react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';

type DashboardProps = {
  onDateRangeChange: (range: DateRange) => void;
  kpiSection: ReactNode;
  children: ReactNode;
  subnavbar?: ReactNode; // New prop for the subnavbar content
};

const Dashboard: React.FC<DashboardProps> = ({
  onDateRangeChange,
  kpiSection,
  children,
  subnavbar,
}) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="dashboard-container py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
            <DateRangeFilter onChange={onDateRangeChange} />
          </div>
        </div>
        
        {/* Subnavbar - if provided */}
        {subnavbar && (
          <div className="border-t border-border/40 bg-muted/50">
            <div className="dashboard-container py-2">
              {subnavbar}
            </div>
          </div>
        )}
      </header>
      
      <main className="dashboard-container py-6 space-y-8 animate-fade-in">
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
