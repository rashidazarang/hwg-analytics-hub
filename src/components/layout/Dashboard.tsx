
import React, { ReactNode, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

type DashboardProps = {
  onDateRangeChange: (range: DateRange) => void;
  kpiSection: ReactNode;
  children: ReactNode;
  subnavbar?: ReactNode; // Prop for the subnavbar content
  pageTitle?: string; // Added page title prop
};

const Dashboard: React.FC<DashboardProps> = ({
  onDateRangeChange,
  kpiSection,
  children,
  subnavbar,
  pageTitle = "Dashboard", // Default title
}) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));

  const toggleMobileFilters = () => {
    setMobileFiltersOpen(!mobileFiltersOpen);
  };

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    onDateRangeChange(range);
  };

  return (
    <div className="min-h-screen dashboard-content flex">
      {/* Main Content - adjusted to work with new sidebar */}
      <div className="flex-1 flex flex-col w-full max-w-full md:ml-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
          <div className="px-2 xs:px-3 sm:px-6 py-2 sm:py-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              {/* Mobile Controls - Only shown on mobile */}
              <div className="flex items-center md:hidden w-full justify-between mb-3 sm:mb-0">
                <div className="flex items-center">
                  {/* Spacer to account for hamburger menu position */}
                  <div className="w-8 h-8 mr-1 xs:mr-2"></div>
                  <h1 className="text-base xs:text-lg font-semibold tracking-tight">{pageTitle}</h1>
                </div>
                {isMobile && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 mobile-toggle" 
                    onClick={toggleMobileFilters}
                  >
                    <Calendar className="h-4 xs:h-5 w-4 xs:w-5" />
                  </Button>
                )}
              </div>
              
              {/* Desktop Title and Controls */}
              <h1 className="hidden md:block text-2xl font-bold tracking-tight">{pageTitle}</h1>
              
              <div className="flex items-center space-x-1 sm:space-x-3">
                {!isMobile && (
                  <DateRangeFilter 
                    dateRange={dateRange}
                    onChange={handleDateChange} 
                  />
                )}
                <AuthNav />
              </div>
            </div>
          </div>
          
          {/* Mobile Filter Panel */}
          {mobileFiltersOpen && (
            <div 
              className="mobile-menu mt-1 p-3 sm:p-4 bg-background border rounded-md shadow-md animate-slide-down mx-2 xs:mx-3 sm:mx-4 mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium mb-2">Select Date Range</h3>
              <DateRangeFilter 
                dateRange={dateRange}
                onChange={handleDateChange} 
              />
            </div>
          )}
          
          {/* Subnavbar for desktop - if provided */}
          {subnavbar && (
            <div className="border-t border-border/30 bg-gray-50">
              <div className="px-2 xs:px-3 sm:px-6 py-2">
                {subnavbar}
              </div>
            </div>
          )}
        </header>
        
        <main className="px-2 xs:px-3 sm:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in w-full overflow-hidden">
          {/* KPI Metrics Section */}
          <section className="animate-slide-up w-full mx-auto" style={{ animationDelay: '100ms' }}>
            {kpiSection}
          </section>
          
          {/* Dashboard Content */}
          <section className="animate-slide-up w-full mx-auto" style={{ animationDelay: '200ms' }}>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
