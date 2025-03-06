
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarItemProps = {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, to, isActive }) => {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </Link>
    </li>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const mainNavItems = [
    {
      icon: LayoutDashboard,
      label: 'Overview',
      to: '/',
    },
    {
      icon: BarChart,
      label: 'Performance',
      to: '/performance',
    },
  ];

  const accountItems = [
    {
      icon: User,
      label: 'Account',
      to: '/account',
    },
    {
      icon: Settings,
      label: 'Settings',
      to: '/settings',
    }
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex-1 flex flex-col min-h-0 border-r bg-background">
        <div className="flex items-center h-16 px-4 border-b">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-semibold tracking-tight">
              Analytics Dashboard
            </span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 px-3 space-y-6">
            <div>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dashboard
              </h3>
              <ul className="mt-2 space-y-1">
                {mainNavItems.map((item) => (
                  <SidebarItem 
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    isActive={
                      item.to === '/' 
                        ? currentPath === '/' 
                        : currentPath.startsWith(item.to)
                    }
                  />
                ))}
              </ul>
            </div>
            <div>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                User
              </h3>
              <ul className="mt-2 space-y-1">
                {accountItems.map((item) => (
                  <SidebarItem 
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    isActive={currentPath.startsWith(item.to)}
                  />
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
