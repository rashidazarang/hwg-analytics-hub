
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
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-toggle') && !target.closest('[data-radix-popper-content-wrapper]')) {
        setMobileMenuOpen(false);
        setMobileFiltersOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Force body scroll lock when mobile menus are open
  useEffect(() => {
    const body = document.body;
    if (mobileFiltersOpen || mobileMenuOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY;
      // Add fixed positioning to body with the current scroll position
      body.style.position = 'fixed';
      body.style.width = '100%';
      body.style.top = `-${scrollY}px`;
    } else {
      // Get the scroll position from the body's top property
      const scrollY = parseInt(body.style.top || '0') * -1;
      // Restore normal positioning
      body.style.position = '';
      body.style.width = '';
      body.style.top = '';
      // Restore scroll position
      window.scrollTo(0, scrollY);
    }
    
    return () => {
      // Clean up on unmount
      body.style.position = '';
      body.style.width = '';
      body.style.top = '';
    };
  }, [mobileFiltersOpen, mobileMenuOpen]);

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
              <div className="mobile-menu mt-3 p-4 bg-background border rounded-md shadow-md animate-slide-down max-h-[60vh] overflow-auto">
                <h3 className="text-sm font-medium mb-2">Select Date Range</h3>
                <DateRangeFilter onChange={(range) => {
                  onDateRangeChange(range);
                  // Auto-close the filters panel on mobile after selection
                  setTimeout(() => setMobileFiltersOpen(false), 300);
                }} />
              </div>
            )}
            
            {/* Mobile menu panel */}
            {mobileMenuOpen && (
              <div className="mobile-menu mt-3 bg-background border rounded-md shadow-md animate-slide-down max-h-[60vh] overflow-auto">
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
