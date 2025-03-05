
import React, { ReactNode, useState } from 'react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="dashboard-container py-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold tracking-tight pl-1 sm:pl-0">Analytics Dashboard</h1>
              
              {/* Mobile menu toggle button - only visible below sm breakpoint */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="sm:hidden"
                onClick={toggleMobileMenu}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              {/* Always visible on desktop, conditionally visible on mobile */}
              <div className={`sm:flex sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto ${
                mobileMenuOpen ? 'flex flex-col pt-3' : 'hidden'
              }`}>
                <div className="w-full sm:w-auto">
                  <DateRangeFilter onChange={onDateRangeChange} />
                </div>
                <div className="sm:ml-1 self-end sm:self-auto">
                  <AuthNav />
                </div>
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
