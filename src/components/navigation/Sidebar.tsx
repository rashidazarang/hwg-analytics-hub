import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart, Home, Trophy, User, Settings } from 'lucide-react';
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
          "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
          isActive 
            ? "bg-primary/10 text-primary font-semibold" 
            : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-500")} />
        <span>{label}</span>
      </Link>
    </li>
  );
};

const sidebarItems = [
  {
    name: "Dashboard",
    path: "/",
    icon: Home
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
  },
  {
    name: "Account",
    path: "/account",
    icon: User
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings
  }
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex-1 flex flex-col min-h-0 border-r bg-white shadow-sm">
        <div className="flex items-center h-16 px-4 border-b">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-semibold tracking-tight">
              Analytics Dashboard
            </span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 px-3 space-y-8">
            <div>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Dashboard
              </h3>
              <div className="h-px bg-gray-200 mb-3"></div>
              <ul className="space-y-1">
                {sidebarItems.map((item) => (
                  <SidebarItem 
                    key={item.path}
                    icon={item.icon}
                    label={item.name}
                    to={item.path}
                    isActive={
                      item.path === '/' 
                        ? currentPath === '/' 
                        : currentPath.startsWith(item.path)
                    }
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
