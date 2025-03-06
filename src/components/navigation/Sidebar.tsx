
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart, Home, Trophy, FileSignature, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarItemProps = {
  icon: React.ElementType;
  label: string;
  to: string;
  isActive: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  to,
  isActive
}) => {
  return <li>
      <Link to={to} className={cn("flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200", isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-gray-100 hover:text-foreground")}>
        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-500")} />
        <span>{label}</span>
      </Link>
    </li>;
};

const sidebarItems = [{
  name: "Overview",
  path: "/",
  icon: Home
}, {
  name: "Agreements",
  path: "/agreements",
  icon: FileSignature
}, {
  name: "Claims",
  path: "/claims",
  icon: AlertTriangle
}, {
  name: "Performance",
  path: "/performance",
  icon: BarChart
}, {
  name: "Leaderboard",
  path: "/leaderboard",
  icon: Trophy
}];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="flex w-64 flex-col fixed inset-y-0 z-30">
      <div className="flex-1 flex flex-col min-h-0 border-r bg-white shadow-sm">
        <div className="flex items-center h-[57px] px-4 border-b">
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/eb0ad36a-388f-454c-aaa9-4ba36c462126.png"
              alt="HWG Logo"
              className="h-[35px]"
            />
          </Link>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
          <nav className="flex-1 px-3 space-y-8">
            <div>
              <ul className="space-y-1">
                {sidebarItems.map(item => <SidebarItem key={item.path} icon={item.icon} label={item.name} to={item.path} isActive={item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path)} />)}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
