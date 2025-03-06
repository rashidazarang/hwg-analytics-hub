
import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import Sidebar from '../navigation/Sidebar';
import { Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
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
      {/* Sidebar is now handled directly in App.tsx */}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64 w-full max-w-full">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
          <div className="px-2 xs:px-3 sm:px-6 py-2 sm:py-3">
            <div className="flex justify-between items-center">
              {/* Desktop Page Title */}
              <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
              
              {/* Controls - right side */}
              <div className="flex items-center space-x-1 sm:space-x-3">
                {isMobile ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 mobile-toggle" 
                    onClick={toggleMobileFilters}
                    ref={filterButtonRef}
                  >
                    <Calendar className="h-4 xs:h-5 w-4 xs:w-5" />
                  </Button>
                ) : (
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
              ref={mobileFilterRef}
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
        
        <main className="px-2 xs:px-3 sm:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in w-full max-w-full overflow-hidden">
          {/* KPI Metrics Section */}
          <section className="animate-slide-up w-full" style={{ animationDelay: '100ms' }}>
            {kpiSection}
          </section>
          
          {/* Dashboard Content */}
          <section className="animate-slide-up w-full" style={{ animationDelay: '200ms' }}>
            {children}
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
