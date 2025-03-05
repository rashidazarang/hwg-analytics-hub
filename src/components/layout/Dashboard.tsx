
import React, { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import { Menu, X, Calendar, User } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '@/integrations/supabase/client';

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    // Close filters drawer if menu is being opened
    if (!mobileMenuOpen) {
      setMobileFiltersOpen(false);
    }
  };

  const toggleMobileFilters = () => {
    setMobileFiltersOpen(!mobileFiltersOpen);
    // Close menu drawer if filters is being opened
    if (!mobileFiltersOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Close mobile menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-toggle')) {
        setMobileMenuOpen(false);
        setMobileFiltersOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="dashboard-container py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold tracking-tight pl-1 sm:pl-0">Analytics Dashboard</h1>
            
            {/* Desktop controls - only visible on larger screens */}
            <div className="hidden sm:flex sm:items-center sm:space-x-3">
              <DateRangeFilter onChange={onDateRangeChange} />
              <AuthNav />
            </div>
            
            {/* Mobile controls - only visible on small screens */}
            <div className="flex items-center space-x-1 sm:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 mobile-toggle" 
                onClick={toggleMobileFilters}
                aria-label="Date Filter"
              >
                <Calendar className="h-5 w-5" />
              </Button>
              
              <AuthNav />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 mobile-toggle" 
                onClick={toggleMobileMenu}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Mobile menus - slide down animations */}
          <div className="sm:hidden">
            {/* Mobile date filter panel */}
            {mobileFiltersOpen && (
              <div className="mobile-menu mt-3 p-4 bg-background border rounded-md shadow-md animate-slide-down max-h-[90vh] overflow-auto">
                <h3 className="text-sm font-medium mb-2">Select Date Range</h3>
                <DateRangeFilter onChange={onDateRangeChange} />
              </div>
            )}
            
            {/* Mobile menu panel */}
            {mobileMenuOpen && (
              <div className="mobile-menu mt-3 bg-background border rounded-md shadow-md animate-slide-down max-h-[90vh] overflow-auto">
                {subnavbar && (
                  <div className="p-3 border-b border-border/30 bg-muted/20">
                    {subnavbar}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Subnavbar for desktop - if provided */}
        {subnavbar && (
          <div className="border-t border-border/30 bg-gray-100/10 hidden sm:block">
            <div className="dashboard-container py-2">
              {subnavbar}
            </div>
          </div>
        )}
      </header>
      
      <main className="dashboard-container py-4 md:py-6 space-y-6 md:space-y-8 animate-fade-in flex-1 overflow-auto">
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
