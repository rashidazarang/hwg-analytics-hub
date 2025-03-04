
import React, { ReactNode, useState } from 'react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

type DashboardProps = {
  onDateRangeChange: (range: DateRange) => void;
  kpiSection: ReactNode;
  children: ReactNode;
  subnavbar?: ReactNode;
};

const Dashboard: React.FC<DashboardProps> = ({
  onDateRangeChange,
  kpiSection,
  children,
  subnavbar,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
        {/* Main Navbar */}
        <div className="dashboard-container py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold tracking-tight">Analytics Dashboard</h1>
            
            {/* Desktop navigation - shown on medium screens and up */}
            <div className="hidden md:flex items-center space-x-4">
              {subnavbar && (
                <div className="mr-2">
                  {React.cloneElement(subnavbar as React.ReactElement, { isDesktopHeader: true })}
                </div>
              )}
              <AuthNav />
            </div>
            
            {/* Mobile menu button - shown only on small screens */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile menu - shown when menu is open on small screens */}
        <div className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-border/10 bg-muted/20",
          mobileMenuOpen ? "max-h-96" : "max-h-0"
        )}>
          <div className="dashboard-container py-3 space-y-4">
            {subnavbar && (
              <div className="py-2">
                {React.cloneElement(subnavbar as React.ReactElement, { isMobileMenu: true })}
              </div>
            )}
            <div className="flex justify-end">
              <AuthNav isMobileMenu={true} />
            </div>
          </div>
        </div>
        
        {/* Subnavbar for date range filter - desktop only */}
        <div className="border-t border-border/30 bg-muted/30 hidden md:block">
          <div className="dashboard-container py-2 flex justify-between items-center">
            <div className="w-full md:w-auto">
              <DateRangeFilter onChange={onDateRangeChange} />
            </div>
          </div>
        </div>
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
