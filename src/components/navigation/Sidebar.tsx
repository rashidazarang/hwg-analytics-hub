
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart, Home, Trophy, FileSignature, AlertTriangle, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type SidebarItemProps = {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive: boolean;
  onClick?: () => void;
};

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  to,
  isActive,
  onClick
}) => {
  return (
    <li>
      <Link 
        to={to} 
        className={cn(
          "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200", 
          isActive 
            ? "bg-primary/10 text-primary font-semibold" 
            : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
        )}
        onClick={onClick}
      >
        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-500")} />
        <span>{label}</span>
      </Link>
    </li>
  );
};

const sidebarItems = [
  {
    name: "Overview",
    path: "/",
    icon: Home
  },
  {
    name: "Agreements",
    path: "/agreements",
    icon: FileSignature
  },
  {
    name: "Claims",
    path: "/claims",
    icon: AlertTriangle
  },
  {
    name: "Performance",
    path: "/performance",
    icon: BarChart
  },
  {
    name: "Leaderboard",
    path: "/leaderboard",
    icon: Trophy
  }
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  
  // Handle clicks outside the sidebar to close it on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, isOpen]);
  
  // Close sidebar when route changes (mobile only)
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [currentPath, isMobile]);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // For desktop: regular sidebar
  // For mobile: hidden by default with toggle button
  return (
    <>
      {/* Mobile Menu Toggle Button - Only visible on mobile */}
      {isMobile && (
        <button 
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md md:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Sidebar - Different behavior on mobile vs desktop */}
      <aside 
        ref={sidebarRef}
        className={cn(
          "bg-white shadow-sm transition-all duration-300 ease-in-out z-40",
          isMobile 
            ? "fixed inset-y-0 left-0 w-64 transform", 
            : "flex w-64 flex-col fixed inset-y-0 z-30",
          isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex-1 flex flex-col min-h-0 border-r bg-white">
          <div className="flex items-center h-[57px] px-4 border-b">
            <Link to="/" className="flex items-center">
              <img 
                ref={logoRef}
                src="/lovable-uploads/eb0ad36a-388f-454c-aaa9-4ba36c462126.png"
                alt="HWG Logo"
                className="h-[46px]"
                loading="eager"
                fetchPriority="high"
              />
            </Link>
          </div>
          
          {/* Mobile Close Button - Inside sidebar */}
          {isMobile && isOpen && (
            <div className="flex justify-end p-2 border-b md:hidden">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
          )}
          
          <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
            <nav className="flex-1 px-3 space-y-8">
              <div>
                <ul className="space-y-1">
                  {sidebarItems.map(item => (
                    <SidebarItem 
                      key={item.path} 
                      icon={item.icon} 
                      label={item.name} 
                      to={item.path} 
                      isActive={item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path)} 
                      onClick={isMobile ? () => setIsOpen(false) : undefined}
                    />
                  ))}
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </aside>
      
      {/* Overlay for mobile - only visible when sidebar is open */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(Sidebar);
