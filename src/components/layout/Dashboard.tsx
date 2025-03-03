
import React, { ReactNode, useState } from 'react';
import DateRangeFilter from '../filters/DateRangeFilter';
import { DateRange } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const handleAccountClick = () => {
    setMenuOpen(false);
    navigate('/account');
  };
  
  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
  };
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="dashboard-container py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
            <div className="flex items-center gap-4">
              <DateRangeFilter onChange={onDateRangeChange} />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMenu}
                aria-label="Menu"
                className="relative"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
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
      
      {/* Overlay Menu */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={toggleMenu}>
          <div 
            className="absolute right-0 top-0 h-full w-64 sm:w-80 bg-background shadow-lg animate-slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="font-medium text-sm truncate">{user?.email}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start p-2 h-auto mb-1"
                onClick={handleAccountClick}
              >
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start p-2 h-auto text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
