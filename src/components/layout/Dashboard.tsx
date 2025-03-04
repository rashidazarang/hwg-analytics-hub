
import React, { ReactNode } from 'react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';
import AuthNav from '../navigation/AuthNav';
import { useMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  const isMobile = useMobile();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="dashboard-container py-3 md:py-4">
          <div className="flex justify-between items-center">
            {isMobile ? (
              <>
                <h1 className="text-xl font-semibold tracking-tight truncate">Analytics Dashboard</h1>
                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] max-w-md pt-12">
                      <div className="flex flex-col space-y-6 p-2">
                        <div className="flex-1">
                          <DateRangeFilter onChange={onDateRangeChange} />
                        </div>
                        <div className="mt-auto">
                          <AuthNav />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
                <div className="flex items-center gap-4">
                  <DateRangeFilter onChange={onDateRangeChange} />
                  <AuthNav />
                </div>
              </>
            )}
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
