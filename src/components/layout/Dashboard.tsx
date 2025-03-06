
import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange, getPresetDateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import Sidebar from '../navigation/Sidebar';
import { Menu, X, Calendar, BarChart } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getPresetDateRange('ytd'));

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

  const handleDateChange = (range: DateRange) => {
    setDateRange(range);
    onDateRangeChange(range);
  };

  return (
    <div className="min-h-screen dashboard-content flex">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Mobile Sidebar (using Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 sm:max-w-xs w-[80vw]">
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <span className="text-lg font-semibold">Analytics Dashboard</span>
            </div>
            <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
              <div>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dashboard
                </h3>
                <ul className="mt-3 space-y-1">
                  <li>
                    <Link 
                      to="/" 
                      className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BarChart className="h-5 w-5" />
                      <span>Overview</span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/performance" 
                      className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BarChart className="h-5 w-5" />
                      <span>Performance</span>
                    </Link>
                  </li>
                </ul>
              </div>
              {subnavbar && (
                <div className="border-t pt-4">
                  {subnavbar}
                </div>
              )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64 w-full max-w-full">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm shadow-sm">
          <div className="px-2 xs:px-3 sm:px-6 py-2 sm:py-3">
            <div className="flex justify-between items-center">
              {/* Mobile Controls */}
              <div className="flex items-center md:hidden">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mobile-toggle mr-1 xs:mr-2" 
                  onClick={toggleMobileMenu}
                  ref={menuButtonRef}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-base xs:text-lg font-semibold tracking-tight">Analytics Dashboard</h1>
              </div>
              
              {/* Desktop Page Title - hidden on mobile */}
              <h1 className="hidden md:block text-xl font-semibold tracking-tight">Dashboard</h1>
              
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
