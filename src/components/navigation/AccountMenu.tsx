
import React from 'react';
import { User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountClick: () => void;
  onLogoutClick: () => void;
  email: string;
}

const AccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  onClose,
  onAccountClick,
  onLogoutClick,
  email
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "absolute right-0 top-full mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-[9999]",
        "animate-in fade-in slide-in-from-top-5 duration-200"
      )}
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-medium">Account</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      
      <div className="py-1">
        <button
          onClick={onAccountClick}
          className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
        >
          <User className="h-4 w-4 mr-2" />
          Account Settings
        </button>
        
        <button
          onClick={onLogoutClick}
          className="flex items-center w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default AccountMenu;
